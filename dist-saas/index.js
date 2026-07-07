// server/saas/index.ts
import "dotenv/config";
import { createServer } from "http";

// server/saas/config.ts
import "dotenv/config";
function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
var SAAS_CONFIG = {
  port: toNumber(process.env.SAAS_PORT, 4e3),
  appBaseDomain: process.env.APP_BASE_DOMAIN ?? "platform.com",
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? "change-me-access-secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "change-me-refresh-secret",
  accessTokenMinutes: toNumber(process.env.JWT_ACCESS_MINUTES, 30),
  refreshTokenDays: toNumber(process.env.JWT_REFRESH_DAYS, 30),
  bcryptRounds: toNumber(process.env.BCRYPT_ROUNDS, 10),
  trialDays: toNumber(process.env.TRIAL_DAYS, 30),
  basicMemberLimit: toNumber(process.env.BASIC_MEMBER_LIMIT, 100),
  corsOrigin: process.env.SAAS_CORS_ORIGIN ?? "*"
};
var isSaasConfigValid = Boolean(
  SAAS_CONFIG.databaseUrl && SAAS_CONFIG.jwtAccessSecret && SAAS_CONFIG.jwtRefreshSecret
);

// server/saas/app.ts
import cors from "cors";
import express from "express";
import helmet from "helmet";
import multer from "multer";
import { ZodError } from "zod";

// server/saas/middleware/rate-limit.ts
import { rateLimit } from "express-rate-limit";
var authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1e3,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts, try again later." }
});
var apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1e3,
  max: 1e3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, slow down." }
});

// server/saas/routes/attendance.routes.ts
import { AttendanceMethod, UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

// server/saas/utils/tokens.ts
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
function createAccessToken(payload) {
  return jwt.sign(
    {
      ...payload,
      type: "access"
    },
    SAAS_CONFIG.jwtAccessSecret,
    { expiresIn: `${SAAS_CONFIG.accessTokenMinutes}m` }
  );
}
function createRefreshToken(payload) {
  return jwt.sign(
    {
      ...payload,
      type: "refresh"
    },
    SAAS_CONFIG.jwtRefreshSecret,
    { expiresIn: `${SAAS_CONFIG.refreshTokenDays}d` }
  );
}
function verifyAccessToken(token) {
  return jwt.verify(token, SAAS_CONFIG.jwtAccessSecret);
}
function verifyRefreshToken(token) {
  return jwt.verify(token, SAAS_CONFIG.jwtRefreshSecret);
}
function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// server/saas/middleware/auth.ts
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.authUser = {
      userId: payload.sub,
      gymId: payload.gymId,
      role: payload.role,
      email: payload.email
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// server/saas/middleware/roles.ts
function requireRoles(...roles) {
  return (req, res, next) => {
    const role = req.authUser?.role;
    if (!role) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(role)) {
      return res.status(403).json({ message: "Insufficient role permissions" });
    }
    return next();
  };
}

// server/saas/prisma.ts
import { PrismaClient } from "@prisma/client";
var prismaGlobal = globalThis;
var prisma = prismaGlobal.saasPrisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
});
if (process.env.NODE_ENV !== "production") {
  prismaGlobal.saasPrisma = prisma;
}

// server/saas/middleware/tenant.ts
function extractSlugFromHost(host) {
  if (!host) return null;
  const hostname = host.split(":")[0];
  if (!hostname.endsWith(SAAS_CONFIG.appBaseDomain)) return null;
  const suffix = `.${SAAS_CONFIG.appBaseDomain}`;
  if (!hostname.endsWith(suffix)) return null;
  const slug = hostname.slice(0, -suffix.length);
  if (!slug || slug === "www") return null;
  return slug;
}
async function resolveTenant(req, res, next) {
  const headerGymId = req.header("x-gym-id");
  const headerGymSlug = req.header("x-gym-slug");
  const hostSlug = extractSlugFromHost(req.header("host"));
  if (req.authUser?.role === "SUPER_ADMIN") {
    if (headerGymId) {
      req.gymId = headerGymId;
    } else if (headerGymSlug || hostSlug) {
      const slug = headerGymSlug ?? hostSlug;
      const gym = await prisma.gym.findFirst({
        where: { slug, deletedAt: null },
        select: { id: true }
      });
      req.gymId = gym?.id;
    }
  } else if (req.authUser?.gymId) {
    req.gymId = req.authUser.gymId;
  } else if (headerGymId) {
    req.gymId = headerGymId;
  } else if (headerGymSlug || hostSlug) {
    const slug = headerGymSlug ?? hostSlug;
    const gym = await prisma.gym.findFirst({
      where: { slug, deletedAt: null },
      select: { id: true }
    });
    req.gymId = gym?.id;
  }
  if (!req.gymId) {
    return res.status(400).json({ message: "Gym context is required" });
  }
  if (req.authUser?.gymId && req.authUser.gymId !== req.gymId) {
    return res.status(403).json({ message: "Cross-tenant access denied" });
  }
  return next();
}

// server/saas/routes/attendance.routes.ts
var checkInSchema = z.object({
  memberId: z.string().min(1),
  method: z.nativeEnum(AttendanceMethod).default(AttendanceMethod.MANUAL)
});
var checkOutSchema = z.object({
  attendanceId: z.string().min(1)
});
var listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  memberId: z.string().optional()
});
var attendanceRouter = Router();
attendanceRouter.use(requireAuth, resolveTenant);
attendanceRouter.get("/", async (req, res, next) => {
  try {
    const parsed = listSchema.parse(req.query);
    const skip = (parsed.page - 1) * parsed.pageSize;
    const where = {
      gymId: req.gymId,
      deletedAt: null,
      ...parsed.memberId ? { memberId: parsed.memberId } : {}
    };
    const [items, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: { member: { select: { id: true, fullName: true, code: true } } },
        orderBy: { checkInAt: "desc" },
        skip,
        take: parsed.pageSize
      }),
      prisma.attendance.count({ where })
    ]);
    return res.json({
      data: items,
      pagination: {
        page: parsed.page,
        pageSize: parsed.pageSize,
        total,
        totalPages: Math.ceil(total / parsed.pageSize)
      }
    });
  } catch (error) {
    return next(error);
  }
});
attendanceRouter.post(
  "/check-in",
  requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.RECEPTIONIST),
  async (req, res, next) => {
    try {
      const parsed = checkInSchema.parse(req.body);
      const member = await prisma.member.findFirst({
        where: { id: parsed.memberId, gymId: req.gymId, deletedAt: null }
      });
      if (!member) return res.status(404).json({ message: "Member not found" });
      const attendance = await prisma.attendance.create({
        data: {
          gymId: req.gymId,
          memberId: parsed.memberId,
          checkInAt: /* @__PURE__ */ new Date(),
          method: parsed.method
        }
      });
      return res.status(201).json({ attendance });
    } catch (error) {
      return next(error);
    }
  }
);
attendanceRouter.post(
  "/check-out",
  requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.RECEPTIONIST),
  async (req, res, next) => {
    try {
      const parsed = checkOutSchema.parse(req.body);
      const attendance = await prisma.attendance.findFirst({
        where: {
          id: parsed.attendanceId,
          gymId: req.gymId,
          deletedAt: null,
          checkOutAt: null
        }
      });
      if (!attendance) return res.status(404).json({ message: "Active attendance record not found" });
      const updated = await prisma.attendance.update({
        where: { id: attendance.id },
        data: { checkOutAt: /* @__PURE__ */ new Date() }
      });
      return res.json({ attendance: updated });
    } catch (error) {
      return next(error);
    }
  }
);

// server/saas/routes/auth.routes.ts
import { GymPlan, UserRole as UserRole2 } from "@prisma/client";
import { Router as Router2 } from "express";
import { z as z2 } from "zod";

// server/saas/utils/password.ts
import bcrypt from "bcryptjs";
async function hashPassword(rawPassword) {
  return bcrypt.hash(rawPassword, SAAS_CONFIG.bcryptRounds);
}
async function verifyPassword(rawPassword, hash) {
  return bcrypt.compare(rawPassword, hash);
}

// server/saas/routes/auth.routes.ts
var registerOwnerSchema = z2.object({
  gymName: z2.string().min(2),
  gymSlug: z2.string().min(2).regex(/^[a-z0-9-]+$/),
  fullName: z2.string().min(2),
  email: z2.string().email(),
  password: z2.string().min(8),
  plan: z2.nativeEnum(GymPlan).optional()
});
var loginSchema = z2.object({
  email: z2.string().email(),
  password: z2.string().min(1),
  gymSlug: z2.string().min(2).regex(/^[a-z0-9-]+$/).optional()
});
var refreshSchema = z2.object({
  refreshToken: z2.string().min(10)
});
function addDays(days) {
  const date = /* @__PURE__ */ new Date();
  date.setDate(date.getDate() + days);
  return date;
}
var authRouter = Router2();
authRouter.post("/register-owner", async (req, res, next) => {
  try {
    const parsed = registerOwnerSchema.parse(req.body);
    const existingGym = await prisma.gym.findUnique({ where: { slug: parsed.gymSlug } });
    if (existingGym) return res.status(409).json({ message: "Gym slug already exists" });
    const existingUser = await prisma.user.findFirst({
      where: { email: parsed.email, gymId: null, deletedAt: null }
    });
    if (existingUser) return res.status(409).json({ message: "Email already exists" });
    const trialStartDate = /* @__PURE__ */ new Date();
    const trialEndDate = addDays(SAAS_CONFIG.trialDays);
    const passwordHash = await hashPassword(parsed.password);
    const gym = await prisma.gym.create({
      data: {
        slug: parsed.gymSlug,
        name: parsed.gymName,
        plan: parsed.plan ?? GymPlan.BASIC,
        trialStartDate,
        trialEndDate
      }
    });
    const owner = await prisma.user.create({
      data: {
        gymId: gym.id,
        fullName: parsed.fullName,
        email: parsed.email,
        passwordHash,
        role: UserRole2.OWNER
      }
    });
    const accessToken = createAccessToken({
      sub: owner.id,
      gymId: gym.id,
      role: owner.role,
      email: owner.email
    });
    const refreshToken = createRefreshToken({ sub: owner.id, gymId: gym.id });
    await prisma.refreshToken.create({
      data: {
        gymId: gym.id,
        userId: owner.id,
        tokenHash: sha256(refreshToken),
        expiresAt: addDays(SAAS_CONFIG.refreshTokenDays)
      }
    });
    return res.status(201).json({
      message: "Gym owner registered successfully",
      gym: { id: gym.id, slug: gym.slug, name: gym.name, plan: gym.plan },
      user: { id: owner.id, fullName: owner.fullName, email: owner.email, role: owner.role },
      tokens: { accessToken, refreshToken }
    });
  } catch (error) {
    return next(error);
  }
});
authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.parse(req.body);
    let gymId = null;
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
        ...gymId ? { gymId } : {},
        deletedAt: null
      }
    });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const validPassword = await verifyPassword(parsed.password, user.passwordHash);
    if (!validPassword) return res.status(401).json({ message: "Invalid credentials" });
    const accessToken = createAccessToken({
      sub: user.id,
      gymId: user.gymId ?? null,
      role: user.role,
      email: user.email
    });
    const refreshToken = createRefreshToken({ sub: user.id, gymId: user.gymId ?? null });
    await prisma.refreshToken.create({
      data: {
        gymId: user.gymId ?? null,
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: addDays(SAAS_CONFIG.refreshTokenDays)
      }
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: /* @__PURE__ */ new Date() }
    });
    return res.json({
      message: "Login successful",
      user: {
        id: user.id,
        gymId: user.gymId,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      },
      tokens: { accessToken, refreshToken }
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
        expiresAt: { gt: /* @__PURE__ */ new Date() }
      }
    });
    if (!savedToken) return res.status(401).json({ message: "Invalid refresh token" });
    const user = await prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null, isActive: true }
    });
    if (!user) return res.status(401).json({ message: "User not found" });
    const accessToken = createAccessToken({
      sub: user.id,
      gymId: user.gymId ?? null,
      role: user.role,
      email: user.email
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
        userId: req.authUser.userId,
        tokenHash: sha256(parsed.refreshToken),
        revokedAt: null
      },
      data: { revokedAt: /* @__PURE__ */ new Date() }
    });
    return res.json({ message: "Logged out successfully" });
  } catch (error) {
    return next(error);
  }
});
authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.authUser.userId },
    select: {
      id: true,
      gymId: true,
      fullName: true,
      email: true,
      role: true,
      lastLoginAt: true
    }
  });
  return res.json({ user });
});

// server/saas/routes/coaches.routes.ts
import { UserRole as UserRole3 } from "@prisma/client";
import { Router as Router3 } from "express";
import { z as z3 } from "zod";
var coachSchema = z3.object({
  fullName: z3.string().min(2),
  email: z3.string().email().optional(),
  phone: z3.string().optional(),
  salary: z3.coerce.number().optional(),
  notes: z3.string().optional()
});
var coachesRouter = Router3();
coachesRouter.use(requireAuth, resolveTenant);
coachesRouter.get("/", async (req, res) => {
  const coaches = await prisma.coach.findMany({
    where: { gymId: req.gymId, deletedAt: null },
    orderBy: { createdAt: "desc" }
  });
  return res.json({ data: coaches });
});
coachesRouter.post(
  "/",
  requireRoles(UserRole3.OWNER, UserRole3.MANAGER),
  async (req, res, next) => {
    try {
      const parsed = coachSchema.parse(req.body);
      const coach = await prisma.coach.create({
        data: {
          gymId: req.gymId,
          fullName: parsed.fullName,
          email: parsed.email,
          phone: parsed.phone,
          salary: parsed.salary,
          notes: parsed.notes
        }
      });
      return res.status(201).json({ coach });
    } catch (error) {
      return next(error);
    }
  }
);

// server/saas/routes/dashboard.routes.ts
import { Router as Router4 } from "express";
function startOfMonth() {
  const now = /* @__PURE__ */ new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
function startOfToday() {
  const now = /* @__PURE__ */ new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
var dashboardRouter = Router4();
dashboardRouter.use(requireAuth, resolveTenant);
dashboardRouter.get("/stats", async (req, res) => {
  const gymId = req.gymId;
  const monthStart = startOfMonth();
  const todayStart = startOfToday();
  const [totalMembers, activeMemberships, expiredMemberships, monthlyRevenueAgg, todayAttendance, newMembers] = await Promise.all([
    prisma.member.count({ where: { gymId, deletedAt: null } }),
    prisma.membership.count({ where: { gymId, status: "ACTIVE", deletedAt: null } }),
    prisma.membership.count({ where: { gymId, status: "EXPIRED", deletedAt: null } }),
    prisma.payment.aggregate({
      where: { gymId, deletedAt: null, paidAt: { gte: monthStart } },
      _sum: { amount: true }
    }),
    prisma.attendance.count({ where: { gymId, deletedAt: null, checkInAt: { gte: todayStart } } }),
    prisma.member.count({ where: { gymId, deletedAt: null, createdAt: { gte: monthStart } } })
  ]);
  return res.json({
    totalMembers,
    activeMemberships,
    expiredMemberships,
    monthlyRevenue: Number(monthlyRevenueAgg._sum.amount ?? 0),
    todayAttendance,
    newMembers
  });
});

// server/saas/routes/gym.routes.ts
import { GymPlan as GymPlan3, GymStatus, UserRole as UserRole4 } from "@prisma/client";
import { Router as Router5 } from "express";
import { z as z4 } from "zod";

// server/saas/services/tenant-policy.ts
import { GymPlan as GymPlan2, SubscriptionStatus } from "@prisma/client";
async function enforceMemberLimit(gymId) {
  const gym = await prisma.gym.findFirst({
    where: { id: gymId, deletedAt: null },
    select: { plan: true }
  });
  if (!gym) return { allowed: false, reason: "Gym not found" };
  if (gym.plan !== GymPlan2.BASIC) return { allowed: true };
  const membersCount = await prisma.member.count({
    where: { gymId, deletedAt: null }
  });
  if (membersCount >= SAAS_CONFIG.basicMemberLimit) {
    return {
      allowed: false,
      reason: `Basic plan member limit reached (${SAAS_CONFIG.basicMemberLimit})`
    };
  }
  return { allowed: true };
}
async function upsertGymSubscription(gymId, plan, endDate) {
  const existing = await prisma.subscription.findFirst({
    where: { gymId, deletedAt: null },
    orderBy: { createdAt: "desc" }
  });
  if (existing) {
    return prisma.subscription.update({
      where: { id: existing.id },
      data: {
        plan,
        status: SubscriptionStatus.ACTIVE,
        endDate
      }
    });
  }
  return prisma.subscription.create({
    data: {
      gymId,
      plan,
      status: SubscriptionStatus.ACTIVE,
      startDate: /* @__PURE__ */ new Date(),
      endDate
    }
  });
}

// server/saas/routes/gym.routes.ts
var updateGymSchema = z4.object({
  name: z4.string().min(2).optional(),
  logoUrl: z4.string().url().optional().nullable(),
  brandPrimary: z4.string().optional().nullable(),
  brandSecondary: z4.string().optional().nullable(),
  settings: z4.record(z4.string(), z4.unknown()).optional()
});
var updateSubscriptionSchema = z4.object({
  plan: z4.nativeEnum(GymPlan3),
  status: z4.nativeEnum(GymStatus).optional(),
  endDate: z4.coerce.date()
});
var gymRouter = Router5();
gymRouter.use(requireAuth, resolveTenant);
gymRouter.get("/me", async (req, res) => {
  const gym = await prisma.gym.findFirst({
    where: { id: req.gymId, deletedAt: null }
  });
  if (!gym) return res.status(404).json({ message: "Gym not found" });
  return res.json({ gym });
});
gymRouter.patch(
  "/me",
  requireRoles(UserRole4.OWNER, UserRole4.MANAGER),
  async (req, res, next) => {
    try {
      const parsed = updateGymSchema.parse(req.body);
      const settingsValue = parsed.settings === void 0 ? void 0 : parsed.settings;
      const gym = await prisma.gym.update({
        where: { id: req.gymId },
        data: {
          name: parsed.name,
          logoUrl: parsed.logoUrl,
          brandPrimary: parsed.brandPrimary,
          brandSecondary: parsed.brandSecondary,
          settings: settingsValue
        }
      });
      return res.json({ gym });
    } catch (error) {
      return next(error);
    }
  }
);
gymRouter.patch(
  "/subscription",
  requireRoles(UserRole4.OWNER, UserRole4.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const parsed = updateSubscriptionSchema.parse(req.body);
      const gym = await prisma.gym.update({
        where: { id: req.gymId },
        data: {
          plan: parsed.plan,
          status: parsed.status ?? GymStatus.ACTIVE,
          subscriptionEnd: parsed.endDate
        }
      });
      await upsertGymSubscription(req.gymId, parsed.plan, parsed.endDate);
      return res.json({ gym });
    } catch (error) {
      return next(error);
    }
  }
);

// server/saas/routes/members.routes.ts
import { UserRole as UserRole5 } from "@prisma/client";
import { Router as Router6 } from "express";
import { z as z5 } from "zod";
var createMemberSchema = z5.object({
  fullName: z5.string().min(2),
  email: z5.string().email().optional(),
  phone: z5.string().optional(),
  emergencyContact: z5.string().optional(),
  emergencyPhone: z5.string().optional(),
  dateOfBirth: z5.coerce.date().optional(),
  gender: z5.string().optional(),
  notes: z5.string().optional()
});
var updateMemberSchema = createMemberSchema.partial();
var listMembersSchema = z5.object({
  page: z5.coerce.number().int().min(1).default(1),
  pageSize: z5.coerce.number().int().min(1).max(100).default(20),
  search: z5.string().optional()
});
function memberCode() {
  const rand = Math.floor(1e5 + Math.random() * 9e5);
  return `MBR-${rand}`;
}
var membersRouter = Router6();
membersRouter.use(requireAuth, resolveTenant);
membersRouter.get("/", async (req, res, next) => {
  try {
    const parsed = listMembersSchema.parse(req.query);
    const skip = (parsed.page - 1) * parsed.pageSize;
    const where = {
      gymId: req.gymId,
      deletedAt: null,
      ...parsed.search ? {
        OR: [
          { fullName: { contains: parsed.search, mode: "insensitive" } },
          { email: { contains: parsed.search, mode: "insensitive" } },
          { phone: { contains: parsed.search, mode: "insensitive" } }
        ]
      } : {}
    };
    const [items, total] = await Promise.all([
      prisma.member.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: parsed.pageSize
      }),
      prisma.member.count({ where })
    ]);
    return res.json({
      data: items,
      pagination: {
        page: parsed.page,
        pageSize: parsed.pageSize,
        total,
        totalPages: Math.ceil(total / parsed.pageSize)
      }
    });
  } catch (error) {
    return next(error);
  }
});
membersRouter.post(
  "/",
  requireRoles(UserRole5.OWNER, UserRole5.MANAGER, UserRole5.RECEPTIONIST),
  async (req, res, next) => {
    try {
      const allowed = await enforceMemberLimit(req.gymId);
      if (!allowed.allowed) {
        return res.status(403).json({ message: allowed.reason });
      }
      const parsed = createMemberSchema.parse(req.body);
      const created = await prisma.member.create({
        data: {
          gymId: req.gymId,
          code: memberCode(),
          ...parsed
        }
      });
      return res.status(201).json({ member: created });
    } catch (error) {
      return next(error);
    }
  }
);
membersRouter.get("/:id", async (req, res) => {
  const member = await prisma.member.findFirst({
    where: { id: req.params.id, gymId: req.gymId, deletedAt: null },
    include: {
      memberships: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" }
      }
    }
  });
  if (!member) return res.status(404).json({ message: "Member not found" });
  return res.json({ member });
});
membersRouter.patch(
  "/:id",
  requireRoles(UserRole5.OWNER, UserRole5.MANAGER, UserRole5.RECEPTIONIST),
  async (req, res, next) => {
    try {
      const parsed = updateMemberSchema.parse(req.body);
      const existing = await prisma.member.findFirst({
        where: { id: req.params.id, gymId: req.gymId, deletedAt: null },
        select: { id: true }
      });
      if (!existing) return res.status(404).json({ message: "Member not found" });
      const member = await prisma.member.update({
        where: { id: req.params.id },
        data: parsed
      });
      return res.json({ member });
    } catch (error) {
      return next(error);
    }
  }
);
membersRouter.delete(
  "/:id",
  requireRoles(UserRole5.OWNER, UserRole5.MANAGER),
  async (req, res) => {
    const existing = await prisma.member.findFirst({
      where: { id: req.params.id, gymId: req.gymId, deletedAt: null },
      select: { id: true }
    });
    if (!existing) return res.status(404).json({ message: "Member not found" });
    await prisma.member.update({
      where: { id: req.params.id },
      data: { deletedAt: /* @__PURE__ */ new Date() }
    });
    return res.json({ message: "Member deleted" });
  }
);

// server/saas/routes/memberships.routes.ts
import { SubscriptionStatus as SubscriptionStatus2, UserRole as UserRole6 } from "@prisma/client";
import { Router as Router7 } from "express";
import { z as z6 } from "zod";
var createMembershipSchema = z6.object({
  memberId: z6.string(),
  planName: z6.string().min(1),
  startDate: z6.coerce.date(),
  endDate: z6.coerce.date(),
  price: z6.coerce.number().nonnegative()
});
var updateStatusSchema = z6.object({
  status: z6.nativeEnum(SubscriptionStatus2),
  freezeDays: z6.coerce.number().int().min(0).optional()
});
var membershipsRouter = Router7();
membershipsRouter.use(requireAuth, resolveTenant);
membershipsRouter.get("/", async (req, res) => {
  const status = req.query.status;
  const data = await prisma.membership.findMany({
    where: {
      gymId: req.gymId,
      deletedAt: null,
      ...status ? { status } : {}
    },
    include: { member: { select: { id: true, fullName: true, code: true } } },
    orderBy: { createdAt: "desc" }
  });
  return res.json({ data });
});
membershipsRouter.post(
  "/",
  requireRoles(UserRole6.OWNER, UserRole6.MANAGER, UserRole6.RECEPTIONIST),
  async (req, res, next) => {
    try {
      const parsed = createMembershipSchema.parse(req.body);
      const member = await prisma.member.findFirst({
        where: { id: parsed.memberId, gymId: req.gymId, deletedAt: null }
      });
      if (!member) return res.status(404).json({ message: "Member not found" });
      const membership = await prisma.membership.create({
        data: {
          gymId: req.gymId,
          memberId: parsed.memberId,
          planName: parsed.planName,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          price: parsed.price,
          status: SubscriptionStatus2.ACTIVE
        }
      });
      return res.status(201).json({ membership });
    } catch (error) {
      return next(error);
    }
  }
);
membershipsRouter.patch(
  "/:id/status",
  requireRoles(UserRole6.OWNER, UserRole6.MANAGER, UserRole6.RECEPTIONIST),
  async (req, res, next) => {
    try {
      const parsed = updateStatusSchema.parse(req.body);
      const existing = await prisma.membership.findFirst({
        where: { id: req.params.id, gymId: req.gymId, deletedAt: null }
      });
      if (!existing) return res.status(404).json({ message: "Membership not found" });
      const membership = await prisma.membership.update({
        where: { id: existing.id },
        data: {
          status: parsed.status,
          freezeDays: parsed.freezeDays ?? existing.freezeDays
        }
      });
      return res.json({ membership });
    } catch (error) {
      return next(error);
    }
  }
);

// server/saas/routes/payments.routes.ts
import { PaymentMethod, UserRole as UserRole7 } from "@prisma/client";
import { Router as Router8 } from "express";
import { z as z7 } from "zod";
var paymentSchema = z7.object({
  memberId: z7.string().optional(),
  amount: z7.coerce.number().positive(),
  method: z7.nativeEnum(PaymentMethod),
  notes: z7.string().optional()
});
var listSchema2 = z7.object({
  page: z7.coerce.number().int().min(1).default(1),
  pageSize: z7.coerce.number().int().min(1).max(100).default(20),
  memberId: z7.string().optional()
});
var paymentsRouter = Router8();
paymentsRouter.use(requireAuth, resolveTenant);
paymentsRouter.get("/", async (req, res, next) => {
  try {
    const parsed = listSchema2.parse(req.query);
    const skip = (parsed.page - 1) * parsed.pageSize;
    const where = {
      gymId: req.gymId,
      deletedAt: null,
      ...parsed.memberId ? { memberId: parsed.memberId } : {}
    };
    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: { member: { select: { id: true, fullName: true, code: true } } },
        orderBy: { paidAt: "desc" },
        skip,
        take: parsed.pageSize
      }),
      prisma.payment.count({ where })
    ]);
    return res.json({
      data: items,
      pagination: {
        page: parsed.page,
        pageSize: parsed.pageSize,
        total,
        totalPages: Math.ceil(total / parsed.pageSize)
      }
    });
  } catch (error) {
    return next(error);
  }
});
paymentsRouter.post(
  "/",
  requireRoles(UserRole7.OWNER, UserRole7.MANAGER, UserRole7.RECEPTIONIST),
  async (req, res, next) => {
    try {
      const parsed = paymentSchema.parse(req.body);
      if (parsed.memberId) {
        const member = await prisma.member.findFirst({
          where: { id: parsed.memberId, gymId: req.gymId, deletedAt: null }
        });
        if (!member) return res.status(404).json({ message: "Member not found" });
      }
      const payment = await prisma.payment.create({
        data: {
          gymId: req.gymId,
          memberId: parsed.memberId,
          amount: parsed.amount,
          method: parsed.method,
          notes: parsed.notes
        }
      });
      return res.status(201).json({ payment });
    } catch (error) {
      return next(error);
    }
  }
);

// server/saas/routes/reports.routes.ts
import { Router as Router9 } from "express";
import { z as z8 } from "zod";
var reportsQuerySchema = z8.object({
  from: z8.coerce.date().optional(),
  to: z8.coerce.date().optional()
});
var reportsRouter = Router9();
reportsRouter.use(requireAuth, resolveTenant);
reportsRouter.get("/revenue", async (req, res, next) => {
  try {
    const parsed = reportsQuerySchema.parse(req.query);
    const where = {
      gymId: req.gymId,
      deletedAt: null,
      ...parsed.from || parsed.to ? {
        paidAt: {
          ...parsed.from ? { gte: parsed.from } : {},
          ...parsed.to ? { lte: parsed.to } : {}
        }
      } : {}
    };
    const [items, totalAgg] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: { member: { select: { id: true, fullName: true, code: true } } },
        orderBy: { paidAt: "desc" }
      }),
      prisma.payment.aggregate({ where, _sum: { amount: true } })
    ]);
    return res.json({
      data: items,
      totalRevenue: Number(totalAgg._sum.amount ?? 0)
    });
  } catch (error) {
    return next(error);
  }
});

// server/saas/routes/super-admin.routes.ts
import { GymPlan as GymPlan4, GymStatus as GymStatus2, UserRole as UserRole8 } from "@prisma/client";
import { Router as Router10 } from "express";
import { z as z9 } from "zod";
var updateGymSchema2 = z9.object({
  status: z9.nativeEnum(GymStatus2).optional(),
  plan: z9.nativeEnum(GymPlan4).optional(),
  subscriptionEnd: z9.coerce.date().optional()
});
var superAdminRouter = Router10();
superAdminRouter.use(requireAuth, requireRoles(UserRole8.SUPER_ADMIN));
superAdminRouter.get("/gyms", async (_req, res) => {
  const gyms = await prisma.gym.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { members: true, users: true }
      }
    }
  });
  return res.json({ data: gyms });
});
superAdminRouter.patch("/gyms/:gymId", async (req, res, next) => {
  try {
    const parsed = updateGymSchema2.parse(req.body);
    const gym = await prisma.gym.update({
      where: { id: req.params.gymId },
      data: parsed
    });
    return res.json({ gym });
  } catch (error) {
    return next(error);
  }
});
superAdminRouter.get("/analytics", async (_req, res) => {
  const [totalGyms, activeGyms, totalMembers, revenueAgg] = await Promise.all([
    prisma.gym.count({ where: { deletedAt: null } }),
    prisma.gym.count({ where: { deletedAt: null, status: GymStatus2.ACTIVE } }),
    prisma.member.count({ where: { deletedAt: null } }),
    prisma.payment.aggregate({ where: { deletedAt: null }, _sum: { amount: true } })
  ]);
  return res.json({
    totalGyms,
    activeGyms,
    totalMembers,
    totalRevenue: Number(revenueAgg._sum.amount ?? 0)
  });
});

// server/saas/app.ts
function createSaasApp() {
  const app = express();
  const upload = multer({ storage: multer.memoryStorage() });
  app.use(helmet());
  app.use(
    cors({
      origin: SAAS_CONFIG.corsOrigin === "*" ? true : SAAS_CONFIG.corsOrigin,
      credentials: true
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(apiRateLimit);
  app.get("/api/v1/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "gymos-saas-api",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.use("/api/v1/auth", authRateLimit, authRouter);
  app.use("/api/v1/gyms", gymRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1/members", membersRouter);
  app.use("/api/v1/memberships", membershipsRouter);
  app.use("/api/v1/coaches", coachesRouter);
  app.use("/api/v1/attendance", attendanceRouter);
  app.use("/api/v1/payments", paymentsRouter);
  app.use("/api/v1/reports", reportsRouter);
  app.use("/api/v1/super-admin", superAdminRouter);
  app.post("/api/v1/uploads/member-photo", upload.single("photo"), (_req, res) => {
    res.status(501).json({ message: "Upload storage integration not configured yet." });
  });
  app.use((req, res) => {
    res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
  });
  app.use((error, _req, res, _next) => {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });
    }
    console.error("[SaaS API Error]", error);
    return res.status(500).json({ message: "Internal server error" });
  });
  return app;
}

// server/saas/index.ts
async function start() {
  if (!isSaasConfigValid) {
    console.warn(
      "[SaaS API] Missing required env values. Set DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET."
    );
  }
  const app = createSaasApp();
  const server = createServer(app);
  server.listen(SAAS_CONFIG.port, () => {
    console.log(`[SaaS API] running on http://localhost:${SAAS_CONFIG.port}`);
  });
}
start().catch((error) => {
  console.error("[SaaS API] failed to start", error);
  process.exit(1);
});
