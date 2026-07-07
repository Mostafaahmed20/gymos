import { GymPlan, GymStatus, Prisma, UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireRoles } from "../middleware/roles";
import { resolveTenant } from "../middleware/tenant";
import { prisma } from "../prisma";
import { upsertGymSubscription } from "../services/tenant-policy";

const updateGymSchema = z.object({
  name: z.string().min(2).optional(),
  logoUrl: z.string().url().optional().nullable(),
  brandPrimary: z.string().optional().nullable(),
  brandSecondary: z.string().optional().nullable(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

const updateSubscriptionSchema = z.object({
  plan: z.nativeEnum(GymPlan),
  status: z.nativeEnum(GymStatus).optional(),
  endDate: z.coerce.date(),
});

export const gymRouter = Router();

gymRouter.use(requireAuth, resolveTenant);

gymRouter.get("/me", async (req, res) => {
  const gym = await prisma.gym.findFirst({
    where: { id: req.gymId, deletedAt: null },
  });
  if (!gym) return res.status(404).json({ message: "Gym not found" });
  return res.json({ gym });
});

gymRouter.patch(
  "/me",
  requireRoles(UserRole.OWNER, UserRole.MANAGER),
  async (req, res, next) => {
    try {
      const parsed = updateGymSchema.parse(req.body);
      const settingsValue =
        parsed.settings === undefined
          ? undefined
          : (parsed.settings as Prisma.InputJsonValue);
      const gym = await prisma.gym.update({
        where: { id: req.gymId! },
        data: {
          name: parsed.name,
          logoUrl: parsed.logoUrl,
          brandPrimary: parsed.brandPrimary,
          brandSecondary: parsed.brandSecondary,
          settings: settingsValue,
        },
      });
      return res.json({ gym });
    } catch (error) {
      return next(error);
    }
  }
);

gymRouter.patch(
  "/subscription",
  requireRoles(UserRole.OWNER, UserRole.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const parsed = updateSubscriptionSchema.parse(req.body);
      const gym = await prisma.gym.update({
        where: { id: req.gymId! },
        data: {
          plan: parsed.plan,
          status: parsed.status ?? GymStatus.ACTIVE,
          subscriptionEnd: parsed.endDate,
        },
      });

      await upsertGymSubscription(req.gymId!, parsed.plan, parsed.endDate);
      return res.json({ gym });
    } catch (error) {
      return next(error);
    }
  }
);
