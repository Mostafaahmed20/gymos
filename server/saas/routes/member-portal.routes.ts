import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";

const memberLoginSchema = z.object({
  gymSlug: z.string().min(2),
  identifier: z.string().min(1), // member code (MBR-XXXXXX) or email
});

const progressSchema = z.object({
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

export const memberPortalRouter = Router();

// POST /api/v1/member-portal/login
// Public: member logs in with gym slug + member code or email (no password needed for portal)
memberPortalRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = memberLoginSchema.parse(req.body);

    const gym = await prisma.gym.findUnique({ where: { slug: parsed.gymSlug } });
    if (!gym || gym.deletedAt) {
      return res.status(404).json({ message: "Gym not found" });
    }

    const isCode = parsed.identifier.toUpperCase().startsWith("MBR-");

    const member = await prisma.member.findFirst({
      where: {
        gymId: gym.id,
        deletedAt: null,
        ...(isCode
          ? { code: parsed.identifier.toUpperCase() }
          : { email: parsed.identifier.toLowerCase() }),
      },
    });

    if (!member) {
      return res.status(404).json({ message: "Member not found. Check your member code or email." });
    }

    // Return member data directly (no password required for read-only portal)
    return res.json({
      message: "Login successful",
      member: {
        id: member.id,
        code: member.code,
        fullName: member.fullName,
        email: member.email,
        phone: member.phone,
        photoUrl: member.photoUrl,
        nationalId: member.nationalId,
        heightCm: member.heightCm,
        weightKg: member.weightKg,
        bloodType: member.bloodType,
        occupation: member.occupation,
        address: member.address,
        gender: member.gender,
        dateOfBirth: member.dateOfBirth,
        medicalNotes: member.medicalNotes,
        notes: member.notes,
        createdAt: member.createdAt,
      },
      gym: {
        id: gym.id,
        slug: gym.slug,
        name: gym.name,
      },
    });
  } catch (error) {
    return next(error);
  }
});

// GET /api/v1/member-portal/:gymSlug/:memberId/profile
memberPortalRouter.get("/:gymSlug/:memberId/profile", async (req, res) => {
  const gym = await prisma.gym.findUnique({ where: { slug: req.params.gymSlug } });
  if (!gym) return res.status(404).json({ message: "Gym not found" });

  const member = await prisma.member.findFirst({
    where: { id: req.params.memberId, gymId: gym.id, deletedAt: null },
  });
  if (!member) return res.status(404).json({ message: "Member not found" });

  return res.json({ member, gym: { name: gym.name, slug: gym.slug } });
});

// GET /api/v1/member-portal/:gymSlug/:memberId/memberships
memberPortalRouter.get("/:gymSlug/:memberId/memberships", async (req, res) => {
  const gym = await prisma.gym.findUnique({ where: { slug: req.params.gymSlug } });
  if (!gym) return res.status(404).json({ message: "Gym not found" });

  const member = await prisma.member.findFirst({
    where: { id: req.params.memberId, gymId: gym.id, deletedAt: null },
    select: { id: true },
  });
  if (!member) return res.status(404).json({ message: "Member not found" });

  const memberships = await prisma.membership.findMany({
    where: { memberId: req.params.memberId, gymId: gym.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return res.json({ data: memberships });
});

// GET /api/v1/member-portal/:gymSlug/:memberId/attendance
memberPortalRouter.get("/:gymSlug/:memberId/attendance", async (req, res) => {
  const gym = await prisma.gym.findUnique({ where: { slug: req.params.gymSlug } });
  if (!gym) return res.status(404).json({ message: "Gym not found" });

  const member = await prisma.member.findFirst({
    where: { id: req.params.memberId, gymId: gym.id, deletedAt: null },
    select: { id: true },
  });
  if (!member) return res.status(404).json({ message: "Member not found" });

  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(50, Number(req.query.pageSize) || 20);
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.attendance.findMany({
      where: { memberId: req.params.memberId, gymId: gym.id, deletedAt: null },
      orderBy: { checkInAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.attendance.count({
      where: { memberId: req.params.memberId, gymId: gym.id, deletedAt: null },
    }),
  ]);

  return res.json({ data: items, pagination: { page, pageSize, total } });
});

// POST /api/v1/member-portal/:gymSlug/:memberId/qr-check-in
memberPortalRouter.post("/:gymSlug/:memberId/qr-check-in", async (req, res, next) => {
  try {
    const gym = await prisma.gym.findUnique({ where: { slug: req.params.gymSlug } });
    if (!gym) return res.status(404).json({ message: "Gym not found" });

    const member = await prisma.member.findFirst({
      where: {
        id: req.params.memberId,
        gymId: gym.id,
        code: String(req.query.code ?? "").toUpperCase(),
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!member) return res.status(404).json({ message: "Member not found" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findFirst({
      where: {
        gymId: gym.id,
        memberId: member.id,
        deletedAt: null,
        checkOutAt: null,
        checkInAt: { gte: today },
      },
      orderBy: { checkInAt: "desc" },
    });

    if (existing) return res.json({ attendance: existing, message: "Already checked in." });

    const attendance = await prisma.attendance.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
        checkInAt: new Date(),
        method: "QR",
      },
    });

    return res.status(201).json({ attendance, message: "QR check-in recorded." });
  } catch (error) {
    return next(error);
  }
});

// GET /api/v1/member-portal/:gymSlug/:memberId/payments
memberPortalRouter.get("/:gymSlug/:memberId/payments", async (req, res) => {
  const gym = await prisma.gym.findUnique({ where: { slug: req.params.gymSlug } });
  if (!gym) return res.status(404).json({ message: "Gym not found" });

  const member = await prisma.member.findFirst({
    where: { id: req.params.memberId, gymId: gym.id, deletedAt: null },
    select: { id: true },
  });
  if (!member) return res.status(404).json({ message: "Member not found" });

  const payments = await prisma.payment.findMany({
    where: { memberId: req.params.memberId, gymId: gym.id, deletedAt: null },
    orderBy: { paidAt: "desc" },
    take: 50,
  });

  return res.json({ data: payments });
});

// GET /api/v1/member-portal/:gymSlug/:memberId/progress
memberPortalRouter.get("/:gymSlug/:memberId/progress", async (req, res) => {
  const gym = await prisma.gym.findUnique({ where: { slug: req.params.gymSlug } });
  if (!gym) return res.status(404).json({ message: "Gym not found" });

  const member = await prisma.member.findFirst({
    where: { id: req.params.memberId, gymId: gym.id, deletedAt: null },
    select: { id: true },
  });
  if (!member) return res.status(404).json({ message: "Member not found" });

  const progress = await prisma.memberProgressRecord.findMany({
    where: { memberId: req.params.memberId, gymId: gym.id, deletedAt: null },
    orderBy: { measuredAt: "asc" },
    take: 100,
  });

  return res.json({ data: progress });
});

// POST /api/v1/member-portal/:gymSlug/:memberId/progress
memberPortalRouter.post("/:gymSlug/:memberId/progress", async (req, res, next) => {
  try {
    const parsed = progressSchema.parse(req.body);
    const gym = await prisma.gym.findUnique({ where: { slug: req.params.gymSlug } });
    if (!gym) return res.status(404).json({ message: "Gym not found" });

    const member = await prisma.member.findFirst({
      where: { id: req.params.memberId, gymId: gym.id, deletedAt: null },
      select: { id: true },
    });
    if (!member) return res.status(404).json({ message: "Member not found" });

    const progress = await prisma.memberProgressRecord.create({
      data: {
        gymId: gym.id,
        memberId: member.id,
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

// GET /api/v1/member-portal/:gymSlug/:memberId/workouts
memberPortalRouter.get("/:gymSlug/:memberId/workouts", async (req, res) => {
  const gym = await prisma.gym.findUnique({ where: { slug: req.params.gymSlug } });
  if (!gym) return res.status(404).json({ message: "Gym not found" });

  const assignments = await prisma.workoutPlanAssignment.findMany({
    where: { memberId: req.params.memberId, gymId: gym.id, deletedAt: null },
    include: { workoutPlan: true, coach: { select: { fullName: true } } },
    orderBy: { assignedAt: "desc" },
  });

  return res.json({ data: assignments });
});

// GET /api/v1/member-portal/:gymSlug/:memberId/diets
memberPortalRouter.get("/:gymSlug/:memberId/diets", async (req, res) => {
  const gym = await prisma.gym.findUnique({ where: { slug: req.params.gymSlug } });
  if (!gym) return res.status(404).json({ message: "Gym not found" });

  const assignments = await prisma.dietPlanAssignment.findMany({
    where: { memberId: req.params.memberId, gymId: gym.id, deletedAt: null },
    include: { dietPlan: true },
    orderBy: { assignedAt: "desc" },
  });

  return res.json({ data: assignments });
});

// GET /api/v1/member-portal/:gymSlug/:memberId/notifications
memberPortalRouter.get("/:gymSlug/:memberId/notifications", async (req, res) => {
  const gym = await prisma.gym.findUnique({ where: { slug: req.params.gymSlug } });
  if (!gym) return res.status(404).json({ message: "Gym not found" });

  const notifications = await prisma.notification.findMany({
    where: {
      gymId: gym.id,
      deletedAt: null,
      OR: [
        { memberId: req.params.memberId },
        { memberId: null }, // Gym-wide promotions
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return res.json({ data: notifications });
});
