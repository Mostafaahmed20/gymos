import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { resolveTenant } from "../middleware/tenant";
import { prisma } from "../prisma";

const reportsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const reportsRouter = Router();
reportsRouter.use(requireAuth, resolveTenant);

reportsRouter.get("/revenue", async (req, res, next) => {
  try {
    const parsed = reportsQuerySchema.parse(req.query);
    const where = {
      gymId: req.gymId!,
      deletedAt: null,
      ...(parsed.from || parsed.to
        ? {
            paidAt: {
              ...(parsed.from ? { gte: parsed.from } : {}),
              ...(parsed.to ? { lte: parsed.to } : {}),
            },
          }
        : {}),
    };

    const [items, totalAgg] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: { member: { select: { id: true, fullName: true, code: true } } },
        orderBy: { paidAt: "desc" },
      }),
      prisma.payment.aggregate({ where, _sum: { amount: true } }),
    ]);

    return res.json({
      data: items,
      totalRevenue: Number(totalAgg._sum.amount ?? 0),
    });
  } catch (error) {
    return next(error);
  }
});
