import { SubscriptionStatus, UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireRoles } from "../middleware/roles";
import { resolveTenant } from "../middleware/tenant";
import { prisma } from "../prisma";

const createMembershipSchema = z.object({
  memberId: z.string(),
  planName: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  price: z.coerce.number().nonnegative(),
});

const updateStatusSchema = z.object({
  status: z.nativeEnum(SubscriptionStatus),
  freezeDays: z.coerce.number().int().min(0).optional(),
});

export const membershipsRouter = Router();
membershipsRouter.use(requireAuth, resolveTenant);

membershipsRouter.get("/", async (req, res) => {
  const status = req.query.status as SubscriptionStatus | undefined;
  const data = await prisma.membership.findMany({
    where: {
      gymId: req.gymId!,
      deletedAt: null,
      ...(status ? { status } : {}),
    },
    include: { member: { select: { id: true, fullName: true, code: true } } },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ data });
});

membershipsRouter.post(
  "/",
  requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.RECEPTIONIST),
  async (req, res, next) => {
    try {
      const parsed = createMembershipSchema.parse(req.body);
      const member = await prisma.member.findFirst({
        where: { id: parsed.memberId, gymId: req.gymId!, deletedAt: null },
      });
      if (!member) return res.status(404).json({ message: "Member not found" });

      const membership = await prisma.membership.create({
        data: {
          gymId: req.gymId!,
          memberId: parsed.memberId,
          planName: parsed.planName,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          price: parsed.price,
          status: SubscriptionStatus.ACTIVE,
        },
      });
      return res.status(201).json({ membership });
    } catch (error) {
      return next(error);
    }
  }
);

membershipsRouter.patch(
  "/:id/status",
  requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.RECEPTIONIST),
  async (req, res, next) => {
    try {
      const parsed = updateStatusSchema.parse(req.body);
      const existing = await prisma.membership.findFirst({
        where: { id: req.params.id, gymId: req.gymId!, deletedAt: null },
      });
      if (!existing) return res.status(404).json({ message: "Membership not found" });

      const membership = await prisma.membership.update({
        where: { id: existing.id },
        data: {
          status: parsed.status,
          freezeDays: parsed.freezeDays ?? existing.freezeDays,
        },
      });
      return res.json({ membership });
    } catch (error) {
      return next(error);
    }
  }
);
