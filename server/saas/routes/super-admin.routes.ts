import { GymPlan, GymStatus, UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { SAAS_CONFIG } from "../config";
import { requireAuth } from "../middleware/auth";
import { requireRoles } from "../middleware/roles";
import { prisma } from "../prisma";
import { bootstrapTenantDatabase } from "../services/tenant-database";
import { hashPassword } from "../utils/password";

const updateGymSchema = z.object({
  status: z.nativeEnum(GymStatus).optional(),
  plan: z.nativeEnum(GymPlan).optional(),
  subscriptionEnd: z.coerce.date().optional(),
});

const createGymSchema = z.object({
  gymName: z.string().min(2),
  gymSlug: z
    .string()
    .min(2)
    .transform((value) =>
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
    )
    .pipe(z.string().min(2).regex(/^[a-z0-9-]+$/)),
  ownerName: z.string().min(2),
  ownerEmail: z.string().email(),
  ownerPhone: z.string().optional(),
  adminPassword: z.string().min(8),
  country: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  domain: z.string().optional(),
  plan: z.nativeEnum(GymPlan).catch(GymPlan.TRIAL).default(GymPlan.TRIAL),
  trialDays: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().int().min(1).max(365).default(SAAS_CONFIG.trialDays)
  ),
  maxMembers: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().int().min(1).optional()
  ),
  maxTrainers: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().int().min(1).optional()
  ),
  storageLimitGb: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().int().min(1).optional()
  ),
});

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export const superAdminRouter = Router();
superAdminRouter.use(requireAuth, requireRoles(UserRole.SUPER_ADMIN));

superAdminRouter.post("/gyms", async (req, res, next) => {
  let createdGymId: string | null = null;

  try {
    const parsed = createGymSchema.parse(req.body);
    const existingGym = await prisma.gym.findUnique({ where: { slug: parsed.gymSlug } });
    if (existingGym) return res.status(409).json({ message: "Gym slug already exists" });

    const existingOwner = await prisma.user.findFirst({
      where: {
        email: parsed.ownerEmail,
        deletedAt: null,
      },
    });
    if (existingOwner) return res.status(409).json({ message: "Owner email already exists" });

    const trialStartDate = new Date();
    const trialEndDate = addDays(parsed.trialDays);
    const passwordHash = await hashPassword(parsed.adminPassword);

    const gym = await prisma.gym.create({
      data: {
        slug: parsed.gymSlug,
        name: parsed.gymName,
        ownerName: parsed.ownerName,
        ownerEmail: parsed.ownerEmail,
        ownerPhone: parsed.ownerPhone,
        country: parsed.country,
        city: parsed.city,
        address: parsed.address,
        domain: parsed.domain,
        subdomain: `${parsed.gymSlug}.${SAAS_CONFIG.appBaseDomain}`,
        plan: parsed.plan,
        status: GymStatus.TRIAL,
        trialStartDate,
        trialEndDate,
        maxMembers: parsed.maxMembers,
        maxTrainers: parsed.maxTrainers,
        storageLimitGb: parsed.storageLimitGb,
      },
    });
    createdGymId = gym.id;

    const tenantDatabase = await bootstrapTenantDatabase({
      id: gym.id,
      slug: gym.slug,
    });

    const [updatedGym, owner] = await prisma.$transaction([
      prisma.gym.update({
        where: { id: gym.id },
        data: { databaseName: tenantDatabase.databaseName },
      }),
      prisma.user.create({
        data: {
          gymId: gym.id,
          fullName: parsed.ownerName,
          email: parsed.ownerEmail,
          passwordHash,
          role: UserRole.OWNER,
        },
      }),
      prisma.subscription.create({
        data: {
          gymId: gym.id,
          plan: parsed.plan,
          status: "ACTIVE",
          startDate: trialStartDate,
          endDate: trialEndDate,
        },
      }),
    ]);

    return res.status(201).json({
      message: "Gym created with isolated database and trial admin account",
      gym: updatedGym,
      owner: {
        id: owner.id,
        fullName: owner.fullName,
        email: owner.email,
        role: owner.role,
      },
      trial: {
        startDate: trialStartDate,
        endDate: trialEndDate,
      },
    });
  } catch (error) {
    if (createdGymId) {
      await prisma.gym.delete({ where: { id: createdGymId } }).catch(() => undefined);
    }
    return next(error);
  }
});

superAdminRouter.get("/gyms", async (_req, res) => {
  const gyms = await prisma.gym.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { members: true, users: true },
      },
    },
  });
  return res.json({ data: gyms });
});

superAdminRouter.patch("/gyms/:gymId", async (req, res, next) => {
  try {
    const parsed = updateGymSchema.parse(req.body);
    const gym = await prisma.gym.update({
      where: { id: req.params.gymId },
      data: parsed,
    });
    return res.json({ gym });
  } catch (error) {
    return next(error);
  }
});

superAdminRouter.get("/analytics", async (_req, res) => {
  const [totalGyms, activeGyms, totalMembers, revenueAgg] = await Promise.all([
    prisma.gym.count({ where: { deletedAt: null } }),
    prisma.gym.count({ where: { deletedAt: null, status: GymStatus.ACTIVE } }),
    prisma.member.count({ where: { deletedAt: null } }),
    prisma.payment.aggregate({ where: { deletedAt: null }, _sum: { amount: true } }),
  ]);

  return res.json({
    totalGyms,
    activeGyms,
    totalMembers,
    totalRevenue: Number(revenueAgg._sum.amount ?? 0),
  });
});
