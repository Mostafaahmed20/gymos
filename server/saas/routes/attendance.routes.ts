import { AttendanceMethod, UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireRoles } from "../middleware/roles";
import { resolveTenant } from "../middleware/tenant";
import { prisma } from "../prisma";

const checkInSchema = z.object({
  memberId: z.string().min(1),
  method: z.nativeEnum(AttendanceMethod).default(AttendanceMethod.MANUAL),
});

const checkOutSchema = z.object({
  attendanceId: z.string().min(1),
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  memberId: z.string().optional(),
});

export const attendanceRouter = Router();
attendanceRouter.use(requireAuth, resolveTenant);

attendanceRouter.get("/", async (req, res, next) => {
  try {
    const parsed = listSchema.parse(req.query);
    const skip = (parsed.page - 1) * parsed.pageSize;
    const where = {
      gymId: req.gymId!,
      deletedAt: null,
      ...(parsed.memberId ? { memberId: parsed.memberId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: { member: { select: { id: true, fullName: true, code: true } } },
        orderBy: { checkInAt: "desc" },
        skip,
        take: parsed.pageSize,
      }),
      prisma.attendance.count({ where }),
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

attendanceRouter.post(
  "/check-in",
  requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.RECEPTIONIST),
  async (req, res, next) => {
    try {
      const parsed = checkInSchema.parse(req.body);
      const member = await prisma.member.findFirst({
        where: { id: parsed.memberId, gymId: req.gymId!, deletedAt: null },
      });
      if (!member) return res.status(404).json({ message: "Member not found" });

      const attendance = await prisma.attendance.create({
        data: {
          gymId: req.gymId!,
          memberId: parsed.memberId,
          checkInAt: new Date(),
          method: parsed.method,
        },
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
          gymId: req.gymId!,
          deletedAt: null,
          checkOutAt: null,
        },
      });
      if (!attendance) return res.status(404).json({ message: "Active attendance record not found" });

      const updated = await prisma.attendance.update({
        where: { id: attendance.id },
        data: { checkOutAt: new Date() },
      });
      return res.json({ attendance: updated });
    } catch (error) {
      return next(error);
    }
  }
);
