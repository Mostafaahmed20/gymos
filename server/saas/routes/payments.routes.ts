import { PaymentMethod, SubscriptionStatus, UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireRoles } from "../middleware/roles";
import { resolveTenant } from "../middleware/tenant";
import { prisma } from "../prisma";

const paymentSchema = z.object({
  memberId: z.string().optional(),
  amount: z.coerce.number().positive(),
  method: z.nativeEnum(PaymentMethod),
  notes: z.string().optional(),
  membership: z
    .object({
      planName: z.string().min(1),
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
    })
    .optional(),
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  memberId: z.string().optional(),
});

export const paymentsRouter = Router();
paymentsRouter.use(requireAuth, resolveTenant);

paymentsRouter.get("/", async (req, res, next) => {
  try {
    const parsed = listSchema.parse(req.query);
    const skip = (parsed.page - 1) * parsed.pageSize;

    const where = {
      gymId: req.gymId!,
      deletedAt: null,
      ...(parsed.memberId ? { memberId: parsed.memberId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: { member: { select: { id: true, fullName: true, code: true } } },
        orderBy: { paidAt: "desc" },
        skip,
        take: parsed.pageSize,
      }),
      prisma.payment.count({ where }),
    ]);

    return res.json({
      data: items,
      pagination: {
        page: parsed.page,
        pageSize: parsed.pageSize,
        total,
        totalPages: Math.ceil(total / parsed.pageSize),
      },
    });
  } catch (error) {
    return next(error);
  }
});

paymentsRouter.post(
  "/",
  requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.RECEPTIONIST),
  async (req, res, next) => {
    try {
      const parsed = paymentSchema.parse(req.body);
      if (parsed.memberId) {
        const member = await prisma.member.findFirst({
          where: { id: parsed.memberId, gymId: req.gymId!, deletedAt: null },
        });
        if (!member) return res.status(404).json({ message: "Member not found" });
      }

      if (parsed.membership && !parsed.memberId) {
        return res.status(400).json({ message: "Member is required to create a membership." });
      }

      if (parsed.membership && parsed.membership.endDate <= parsed.membership.startDate) {
        return res.status(400).json({ message: "Membership end date must be after start date." });
      }

      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            gymId: req.gymId!,
            memberId: parsed.memberId,
            amount: parsed.amount,
            method: parsed.method,
            notes: parsed.notes,
          },
        });

        const membership = parsed.membership
          ? await tx.membership.create({
              data: {
                gymId: req.gymId!,
                memberId: parsed.memberId!,
                planName: parsed.membership.planName,
                startDate: parsed.membership.startDate,
                endDate: parsed.membership.endDate,
                price: parsed.amount,
                status: SubscriptionStatus.ACTIVE,
              },
            })
          : null;

        return { payment, membership };
      });

      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  }
);
