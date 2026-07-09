import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { resolveTenant } from "../middleware/tenant";
import { prisma } from "../prisma";

const memberLoginSchema = z.object({
  gymSlug: z.string().min(2),
  identifier: z.string().min(1), // member code (MBR-XXXXXX) or email
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
        gender: member.gender,
        dateOfBirth: member.dateOfBirth,
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
