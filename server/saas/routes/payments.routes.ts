import { PaymentMethod, UserRole } from "@prisma/client";
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

      const payment = await prisma.payment.create({
        data: {
          gymId: req.gymId!,
          memberId: parsed.memberId,
          amount: parsed.amount,
          method: parsed.method,
          notes: parsed.notes,
        },
      });

      return res.status(201).json({ payment });
    } catch (error) {
      return next(error);
    }
  }
);
