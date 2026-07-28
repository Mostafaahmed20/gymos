import { UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { requireRoles } from "../middleware/roles";
import { resolveTenant } from "../middleware/tenant";
import { prisma } from "../prisma";

const exerciseSchema = z.object({
  name: z.string().min(1),
  sets: z.string().optional(),
  reps: z.string().optional(),
  notes: z.string().optional(),
});

const mealSchema = z.object({
  name: z.string().min(1),
  time: z.string().optional(),
  foods: z.string().min(1),
  calories: z.coerce.number().nonnegative().optional(),
});

const createWorkoutPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  exercises: z.array(exerciseSchema).min(1),
  memberIds: z.array(z.string().min(1)).default([]),
  coachId: z.string().optional(),
});

const createDietPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  meals: z.array(mealSchema).min(1),
  memberIds: z.array(z.string().min(1)).default([]),
});

const assignmentSchema = z.object({
  memberId: z.string().min(1),
  coachId: z.string().optional(),
});

async function assertMembersInGym(gymId: string, memberIds: string[]) {
  if (memberIds.length === 0) return;
  const count = await prisma.member.count({
    where: { id: { in: memberIds }, gymId, deletedAt: null },
  });
  if (count !== new Set(memberIds).size) {
    throw new Error("One or more members were not found");
  }
}

export const plansRouter = Router();
plansRouter.use(requireAuth, resolveTenant);

plansRouter.get("/workouts", async (req, res) => {
  const data = await prisma.workoutPlan.findMany({
    where: { gymId: req.gymId!, deletedAt: null },
    include: {
      assignments: {
        where: { deletedAt: null },
        include: { member: { select: { id: true, fullName: true, code: true } } },
        orderBy: { assignedAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ data });
});

plansRouter.post(
  "/workouts",
  requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.COACH),
  async (req, res, next) => {
    try {
      const parsed = createWorkoutPlanSchema.parse(req.body);
      await assertMembersInGym(req.gymId!, parsed.memberIds);

      const workoutPlan = await prisma.$transaction(async (tx) => {
        const plan = await tx.workoutPlan.create({
          data: {
            gymId: req.gymId!,
            name: parsed.name,
            details: {
              description: parsed.description ?? "",
              exercises: parsed.exercises,
            },
          },
        });

        if (parsed.memberIds.length > 0) {
          await tx.workoutPlanAssignment.createMany({
            data: parsed.memberIds.map((memberId) => ({
              gymId: req.gymId!,
              workoutPlanId: plan.id,
              memberId,
              coachId: parsed.coachId,
            })),
          });
        }

        return plan;
      });

      return res.status(201).json({ workoutPlan });
    } catch (error) {
      if (error instanceof Error && error.message.includes("members")) {
        return res.status(404).json({ message: error.message });
      }
      return next(error);
    }
  }
);

plansRouter.post(
  "/workouts/:id/assignments",
  requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.COACH),
  async (req, res, next) => {
    try {
      const parsed = assignmentSchema.parse(req.body);
      const plan = await prisma.workoutPlan.findFirst({
        where: { id: req.params.id, gymId: req.gymId!, deletedAt: null },
        select: { id: true },
      });
      if (!plan) return res.status(404).json({ message: "Workout plan not found" });
      await assertMembersInGym(req.gymId!, [parsed.memberId]);

      const assignment = await prisma.workoutPlanAssignment.create({
        data: {
          gymId: req.gymId!,
          workoutPlanId: plan.id,
          memberId: parsed.memberId,
          coachId: parsed.coachId,
        },
      });
      return res.status(201).json({ assignment });
    } catch (error) {
      return next(error);
    }
  }
);

plansRouter.get("/diets", async (req, res) => {
  const data = await prisma.dietPlan.findMany({
    where: { gymId: req.gymId!, deletedAt: null },
    include: {
      assignments: {
        where: { deletedAt: null },
        include: { member: { select: { id: true, fullName: true, code: true } } },
        orderBy: { assignedAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ data });
});

plansRouter.post(
  "/diets",
  requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.COACH),
  async (req, res, next) => {
    try {
      const parsed = createDietPlanSchema.parse(req.body);
      await assertMembersInGym(req.gymId!, parsed.memberIds);

      const dietPlan = await prisma.$transaction(async (tx) => {
        const plan = await tx.dietPlan.create({
          data: {
            gymId: req.gymId!,
            name: parsed.name,
            details: {
              description: parsed.description ?? "",
              meals: parsed.meals,
            },
          },
        });

        if (parsed.memberIds.length > 0) {
          await tx.dietPlanAssignment.createMany({
            data: parsed.memberIds.map((memberId) => ({
              gymId: req.gymId!,
              dietPlanId: plan.id,
              memberId,
            })),
          });
        }

        return plan;
      });

      return res.status(201).json({ dietPlan });
    } catch (error) {
      if (error instanceof Error && error.message.includes("members")) {
        return res.status(404).json({ message: error.message });
      }
      return next(error);
    }
  }
);

plansRouter.post(
  "/diets/:id/assignments",
  requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.COACH),
  async (req, res, next) => {
    try {
      const parsed = assignmentSchema.parse(req.body);
      const plan = await prisma.dietPlan.findFirst({
        where: { id: req.params.id, gymId: req.gymId!, deletedAt: null },
        select: { id: true },
      });
      if (!plan) return res.status(404).json({ message: "Diet plan not found" });
      await assertMembersInGym(req.gymId!, [parsed.memberId]);

      const assignment = await prisma.dietPlanAssignment.create({
        data: {
          gymId: req.gymId!,
          dietPlanId: plan.id,
          memberId: parsed.memberId,
        },
      });
      return res.status(201).json({ assignment });
    } catch (error) {
      return next(error);
    }
  }
);
