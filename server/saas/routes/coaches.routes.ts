import { UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireRoles } from "../middleware/roles";
import { resolveTenant } from "../middleware/tenant";
import { prisma } from "../prisma";

const coachSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  salary: z.coerce.number().optional(),
  notes: z.string().optional(),
});

export const coachesRouter = Router();
coachesRouter.use(requireAuth, resolveTenant);

coachesRouter.get("/", async (req, res) => {
  const coaches = await prisma.coach.findMany({
    where: { gymId: req.gymId!, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ data: coaches });
});

coachesRouter.post(
  "/",
  requireRoles(UserRole.OWNER, UserRole.MANAGER),
  async (req, res, next) => {
    try {
      const parsed = coachSchema.parse(req.body);
      const coach = await prisma.coach.create({
        data: {
          gymId: req.gymId!,
          fullName: parsed.fullName,
          email: parsed.email,
          phone: parsed.phone,
          salary: parsed.salary,
          notes: parsed.notes,
        },
      });
      return res.status(201).json({ coach });
    } catch (error) {
      return next(error);
    }
  }
);
