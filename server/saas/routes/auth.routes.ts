import { GymPlan, GymStatus, UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { SAAS_CONFIG } from "../config";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../prisma";
import { bootstrapTenantDatabase } from "../services/tenant-database";
import { isGymLicenseActive } from "../services/tenant-policy";
import { hashPassword, verifyPassword } from "../utils/password";
import {
  createAccessToken,
  createRefreshToken,
  sha256,
  verifyRefreshToken,
} from "../utils/tokens";

const registerOwnerSchema = z.object({
  gymName: z.string().min(2),
  gymSlug: z.string().min(2).regex(/^[a-z0-9-]+$/),
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  plan: z.nativeEnum(GymPlan).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  gymSlug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export const authRouter = Router();

authRouter.post("/register-owner", async (req, res, next) => {
  try {
    const parsed = registerOwnerSchema.parse(req.body);
    const existingGym = await prisma.gym.findUnique({ where: { slug: parsed.gymSlug } });
    if (existingGym) return res.status(409).json({ message: "Gym slug already exists" });

    const existingUser = await prisma.user.findFirst({
      where: { email: parsed.email, gymId: null, deletedAt: null },
    });
    if (existingUser) return res.status(409).json({ message: "Email already exists" });

    const trialStartDate = new Date();
    const trialEndDate = addDays(SAAS_CONFIG.trialDays);
    const passwordHash = await hashPassword(parsed.password);

    const gym = await prisma.gym.create({
      data: {
        slug: parsed.gymSlug,
        name: parsed.gymName,
        ownerName: parsed.fullName,
        ownerEmail: parsed.email,
        plan: parsed.plan ?? GymPlan.TRIAL,
        status: GymStatus.TRIAL,
        trialStartDate,
        trialEndDate,
      },
    });

    const tenantDatabase = await bootstrapTenantDatabase({
      id: gym.id,
      slug: gym.slug,
    });

    await prisma.gym.update({
      where: { id: gym.id },
      data: { databaseName: tenantDatabase.databaseName },
    });

    const owner = await prisma.user.create({
      data: {
        gymId: gym.id,
        fullName: parsed.fullName,
        email: parsed.email,
        passwordHash,
        role: UserRole.OWNER,
      },
    });

    const accessToken = createAccessToken({
      sub: owner.id,
      gymId: gym.id,
      role: owner.role,
      email: owner.email,
    });
    const refreshToken = createRefreshToken({ sub: owner.id, gymId: gym.id });

    await prisma.refreshToken.create({
      data: {
        gymId: gym.id,
        userId: owner.id,
        tokenHash: sha256(refreshToken),
        expiresAt: addDays(SAAS_CONFIG.refreshTokenDays),
      },
    });

    return res.status(201).json({
      message: "Gym owner registered successfully",
      gym: {
        id: gym.id,
        slug: gym.slug,
        name: gym.name,
        plan: gym.plan,
        databaseName: tenantDatabase.databaseName,
      },
      user: { id: owner.id, fullName: owner.fullName, email: owner.email, role: owner.role },
      tokens: { accessToken, refreshToken },
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.parse(req.body);
    let gymId: string | null = null;

    if (parsed.gymSlug) {
      const gym = await prisma.gym.findUnique({ where: { slug: parsed.gymSlug } });
      if (!gym || gym.deletedAt) {
        return res.status(404).json({ message: "Gym not found" });
      }
      gymId = gym.id;
    }

    const user = await prisma.user.findFirst({
      where: {
        email: parsed.email,
        ...(gymId ? { gymId } : {}),
        deletedAt: null,
      },
    });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const validPassword = await verifyPassword(parsed.password, user.passwordHash);
    if (!validPassword) return res.status(401).json({ message: "Invalid credentials" });

    if (user.role !== UserRole.SUPER_ADMIN && user.gymId) {
      const gym = await prisma.gym.findFirst({
        where: { id: user.gymId, deletedAt: null },
        select: {
          status: true,
          trialEndDate: true,
          subscriptionEnd: true,
        },
      });

      if (!gym || !isGymLicenseActive(gym)) {
        return res.status(402).json({
          message: "Your subscription has expired. Please renew your subscription.",
        });
      }
    }

    const accessToken = createAccessToken({
      sub: user.id,
      gymId: user.gymId ?? null,
      role: user.role,
      email: user.email,
    });
    const refreshToken = createRefreshToken({ sub: user.id, gymId: user.gymId ?? null });

    await prisma.refreshToken.create({
      data: {
        gymId: user.gymId ?? null,
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: addDays(SAAS_CONFIG.refreshTokenDays),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return res.json({
      message: "Login successful",
      user: {
        id: user.id,
        gymId: user.gymId,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
      tokens: { accessToken, refreshToken },
    });
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/refresh", async (req, res, next) => {
  try {
    const parsed = refreshSchema.parse(req.body);
    const payload = verifyRefreshToken(parsed.refreshToken);
    const tokenHash = sha256(parsed.refreshToken);

    const savedToken = await prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!savedToken) return res.status(401).json({ message: "Invalid refresh token" });

    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null, isActive: true },
    });
    if (!user) return res.status(401).json({ message: "User not found" });

    const accessToken = createAccessToken({
      sub: user.id,
      gymId: user.gymId ?? null,
      role: user.role,
      email: user.email,
    });

    return res.json({ accessToken });
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const parsed = refreshSchema.parse(req.body);
    await prisma.refreshToken.updateMany({
      where: {
        userId: req.authUser!.userId,
        tokenHash: sha256(parsed.refreshToken),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    return res.json({ message: "Logged out successfully" });
  } catch (error) {
    return next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.authUser!.userId },
    select: {
      id: true,
      gymId: true,
      fullName: true,
      email: true,
      role: true,
      lastLoginAt: true,
    },
  });
  return res.json({ user });
});
