import { AttendanceMethod, UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireRoles } from "../middleware/roles";
import { resolveTenant } from "../middleware/tenant";
import { prisma } from "../prisma";
import { verifyAttendanceQrToken } from "../utils/attendance-qr";

const checkInSchema = z.object({
  memberId: z.string().min(1),
  method: z.nativeEnum(AttendanceMethod).default(AttendanceMethod.MANUAL),
});

const checkOutSchema = z.object({
  attendanceId: z.string().min(1),
});

const qrCheckInSchema = z.object({
  qrToken: z.string().min(20),
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
  "/qr-check-in",
  requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.RECEPTIONIST),
  async (req, res, next) => {
    try {
      const parsed = qrCheckInSchema.parse(req.body);
      const qrPayload = verifyAttendanceQrToken(parsed.qrToken);

      if (qrPayload.gymId !== req.gymId!) {
        return res.status(403).json({ message: "This QR pass belongs to another gym." });
      }

      const member = await prisma.member.findFirst({
        where: {
          id: qrPayload.memberId,
          gymId: req.gymId!,
          code: qrPayload.memberCode,
          deletedAt: null,
        },
        select: { id: true, fullName: true, code: true },
      });
      if (!member) return res.status(404).json({ message: "Member for this QR pass was not found." });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const openAttendance = await prisma.attendance.findFirst({
        where: {
          gymId: req.gymId!,
          memberId: member.id,
          checkInAt: { gte: today },
          checkOutAt: null,
          deletedAt: null,
        },
        orderBy: { checkInAt: "desc" },
      });

      if (openAttendance) {
        return res.json({
          attendance: openAttendance,
          member,
          alreadyCheckedIn: true,
          message: `${member.fullName} is already checked in today.`,
        });
      }

      const attendance = await prisma.attendance.create({
        data: {
          gymId: req.gymId!,
          memberId: member.id,
          checkInAt: new Date(),
          method: AttendanceMethod.QR,
        },
      });

      return res.status(201).json({
        attendance,
        member,
        alreadyCheckedIn: false,
        message: `Welcome, ${member.fullName}. QR check-in recorded.`,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes("QR")) {
        return res.status(400).json({ message: error.message });
      }
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
