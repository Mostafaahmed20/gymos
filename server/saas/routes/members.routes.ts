import { UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireRoles } from "../middleware/roles";
import { resolveTenant } from "../middleware/tenant";
import { prisma } from "../prisma";
import { enforceMemberLimit } from "../services/tenant-policy";

const createMemberSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.string().optional(),
  notes: z.string().optional(),
});

const updateMemberSchema = createMemberSchema.partial();

const listMembersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

function memberCode() {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `MBR-${rand}`;
}

export const membersRouter = Router();

membersRouter.use(requireAuth, resolveTenant);

membersRouter.get("/", async (req, res, next) => {
  try {
    const parsed = listMembersSchema.parse(req.query);
    const skip = (parsed.page - 1) * parsed.pageSize;

    const where = {
      gymId: req.gymId!,
      deletedAt: null,
      ...(parsed.search
        ? {
            OR: [
              { fullName: { contains: parsed.search, mode: "insensitive" as const } },
              { email: { contains: parsed.search, mode: "insensitive" as const } },
              { phone: { contains: parsed.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.member.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: parsed.pageSize,
      }),
      prisma.member.count({ where }),
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

membersRouter.post(
  "/",
  requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.RECEPTIONIST),
  async (req, res, next) => {
    try {
      const allowed = await enforceMemberLimit(req.gymId!);
      if (!allowed.allowed) {
        return res.status(403).json({ message: allowed.reason });
      }

      const parsed = createMemberSchema.parse(req.body);

      const created = await prisma.member.create({
        data: {
          gymId: req.gymId!,
          code: memberCode(),
          ...parsed,
        },
      });

      return res.status(201).json({ member: created });
    } catch (error) {
      return next(error);
    }
  }
);

membersRouter.get("/:id", async (req, res) => {
  const member = await prisma.member.findFirst({
    where: { id: req.params.id, gymId: req.gymId!, deletedAt: null },
    include: {
      memberships: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!member) return res.status(404).json({ message: "Member not found" });
  return res.json({ member });
});

membersRouter.patch(
  "/:id",
  requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.RECEPTIONIST),
  async (req, res, next) => {
    try {
      const parsed = updateMemberSchema.parse(req.body);
      const existing = await prisma.member.findFirst({
        where: { id: req.params.id, gymId: req.gymId!, deletedAt: null },
        select: { id: true },
      });
      if (!existing) return res.status(404).json({ message: "Member not found" });

      const member = await prisma.member.update({
        where: { id: req.params.id },
        data: parsed,
      });
      return res.json({ member });
    } catch (error) {
      return next(error);
    }
  }
);

membersRouter.delete(
  "/:id",
  requireRoles(UserRole.OWNER, UserRole.MANAGER),
  async (req, res) => {
    const existing = await prisma.member.findFirst({
      where: { id: req.params.id, gymId: req.gymId!, deletedAt: null },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ message: "Member not found" });

    await prisma.member.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    return res.json({ message: "Member deleted" });
  }
);
