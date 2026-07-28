import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { resolveTenant } from "../middleware/tenant";
import { prisma } from "../prisma";

const createProgressSchema = z.object({
  memberId: z.string().min(1),
  measuredAt: z.coerce.date().optional(),
  weightKg: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().positive().optional()
  ),
  bodyFatPercent: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().min(0).max(100).optional()
  ),
  beforePhotoUrl: z.string().optional(),
  afterPhotoUrl: z.string().optional(),
  notes: z.string().optional(),
});

const listProgressSchema = z.object({
  memberId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export const progressRouter = Router();
progressRouter.use(requireAuth, resolveTenant);

progressRouter.get("/", async (req, res, next) => {
  try {
    const parsed = listProgressSchema.parse(req.query);
    const skip = (parsed.page - 1) * parsed.pageSize;
    const where = {
      gymId: req.gymId!,
      deletedAt: null,
      ...(parsed.memberId ? { memberId: parsed.memberId } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.memberProgressRecord.findMany({
        where,
        include: { member: { select: { id: true, fullName: true, code: true } } },
        orderBy: { measuredAt: "desc" },
        skip,
        take: parsed.pageSize,
      }),
      prisma.memberProgressRecord.count({ where }),
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

progressRouter.post("/", async (req, res, next) => {
  try {
    const parsed = createProgressSchema.parse(req.body);
    const member = await prisma.member.findFirst({
      where: { id: parsed.memberId, gymId: req.gymId!, deletedAt: null },
      select: { id: true },
    });
    if (!member) return res.status(404).json({ message: "Member not found" });

    const progress = await prisma.memberProgressRecord.create({
      data: {
        gymId: req.gymId!,
        memberId: parsed.memberId,
        measuredAt: parsed.measuredAt,
        weightKg: parsed.weightKg,
        bodyFatPercent: parsed.bodyFatPercent,
        beforePhotoUrl: parsed.beforePhotoUrl,
        afterPhotoUrl: parsed.afterPhotoUrl,
        notes: parsed.notes,
      },
    });

    return res.status(201).json({ progress });
  } catch (error) {
    return next(error);
  }
});
