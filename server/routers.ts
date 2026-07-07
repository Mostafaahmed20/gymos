import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { sendEmailCampaign } from "./_core/email";
import { getExerciseCatalogFacets, searchExerciseCatalog, searchExerciseVideos } from "./_core/fitnessCatalog";
import { hashPassword } from "./_core/password";
import { sendTelegramCampaignMessage } from "./_core/telegram";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

// Admin-only middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  return next({ ctx });
});

type NotificationType = Parameters<typeof db.createNotification>[0]["type"];
type NotificationPayload = {
  title: string;
  message: string;
  type?: NotificationType;
};

async function notifyTrainee(traineeId: number, payload: NotificationPayload) {
  try {
    const trainee = await db.getTraineeById(traineeId);
    await db.createNotification({
      userId: trainee?.userId ?? undefined,
      traineeId,
      title: payload.title,
      message: payload.message,
      type: payload.type ?? "general",
      isRead: false,
    });
  } catch (error) {
    console.warn("[Notifications] Failed to notify trainee", error);
  }
}

async function notifyAdmins(payload: NotificationPayload) {
  try {
    const admins = await db.getUsersByRole("admin");
    if (admins.length === 0) return;
    await Promise.all(
      admins.map((admin) =>
        db.createNotification({
          userId: admin.id,
          title: payload.title,
          message: payload.message,
          type: payload.type ?? "general",
          isRead: false,
        })
      )
    );
  } catch (error) {
    console.warn("[Notifications] Failed to notify admins", error);
  }
}

const nutritionGoalSchema = z.enum(["weight_loss", "muscle_gain", "maintenance", "cutting", "bulking"]);
const nutritionMealNameSchema = z.enum(["Breakfast", "Lunch", "Dinner", "Snack", "Pre-Workout", "Post-Workout"]);
const nutritionUnitSchema = z.enum(["grams", "ml", "pieces", "cups"]);
const nutritionAssignmentStatusSchema = z.enum(["active", "completed", "paused"]);

async function resolveCampaignRecipients(campaign: {
  targetAudience?: "all" | "active" | "expired" | "by_plan" | "by_goal" | null;
  targetPlanId?: number | null;
  targetGoal?: "weight_loss" | "muscle_gain" | "fitness" | "rehab" | "other" | null;
}) {
  const [traineesResult, activeSubs, expiredSubs, allSubs] = await Promise.all([
    db.getTrainees({ isActive: true, limit: 10000, offset: 0 }),
    db.getSubscriptions({ status: "active", limit: 10000, offset: 0 }),
    db.getSubscriptions({ status: "expired", limit: 10000, offset: 0 }),
    db.getSubscriptions({ limit: 10000, offset: 0 }),
  ]);

  const trainees = traineesResult.data;
  const traineeById = new Map(trainees.map((trainee) => [trainee.id, trainee]));
  const allActiveIds = new Set(trainees.map((trainee) => trainee.id));
  const activeSubIds = new Set(activeSubs.data.map((sub) => sub.traineeId));
  const expiredSubIds = new Set(expiredSubs.data.map((sub) => sub.traineeId));

  let selectedIds: Set<number>;
  switch (campaign.targetAudience ?? "all") {
    case "active":
      selectedIds = activeSubIds;
      break;
    case "expired":
      selectedIds = expiredSubIds;
      break;
    case "by_plan":
      selectedIds = new Set(
        allSubs.data
          .filter((sub) => campaign.targetPlanId && sub.planId === campaign.targetPlanId)
          .map((sub) => sub.traineeId)
      );
      break;
    case "by_goal":
      selectedIds = new Set(
        trainees
          .filter((trainee) => campaign.targetGoal && trainee.goal === campaign.targetGoal)
          .map((trainee) => trainee.id)
      );
      break;
    case "all":
    default:
      selectedIds = allActiveIds;
      break;
  }

  const recipients: Array<{ traineeId: number; userId?: number; email?: string }> = [];
  for (const traineeId of Array.from(selectedIds)) {
    const trainee = traineeById.get(traineeId) ?? (await db.getTraineeById(traineeId));
    if (!trainee) continue;
    recipients.push({
      traineeId,
      userId: trainee.userId ?? undefined,
      email: trainee.email ?? undefined,
    });
  }
  return recipients;
}

export const appRouter = router({
  system: systemRouter,

  // ===================== AUTH =====================
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ===================== DASHBOARD =====================
  dashboard: router({
    stats: adminProcedure.query(() => db.getDashboardStats()),
    monthlyRevenue: adminProcedure.input(z.object({ months: z.number().optional() })).query(({ input }) => db.getMonthlyRevenue(input.months ?? 6)),
  }),

  // ===================== TRAINERS =====================
  trainers: router({
    list: adminProcedure.input(z.object({ isActive: z.boolean().optional() })).query(({ input }) => db.getTrainers(input.isActive)),
    get: adminProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getTrainerById(input.id)),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        specialty: z.string().optional(),
        salary: z.string().optional(),
        commissionRate: z.string().optional(),
        performanceNotes: z.string().optional(),
      }))
      .mutation(({ input }) => db.createTrainer(input)),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        specialty: z.string().optional(),
        salary: z.string().optional(),
        commissionRate: z.string().optional(),
        performanceNotes: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(({ input }) => { const { id, ...data } = input; return db.updateTrainer(id, data); }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteTrainer(input.id)),
  }),

  // ===================== TRAINEES =====================
  trainees: router({
    list: adminProcedure
      .input(z.object({ search: z.string().optional(), isActive: z.boolean().optional(), goal: z.string().optional(), trainerId: z.number().optional(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(({ input }) => db.getTrainees(input)),
    get: adminProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getTraineeById(input.id)),
    myProfile: protectedProcedure.query(({ ctx }) => db.getTraineeByUserId(ctx.user.id)),
    create: adminProcedure
      .input(z.object({
        fullName: z.string().min(1),
        trainerId: z.number().optional(),
        age: z.number().optional(),
        gender: z.enum(["male", "female", "other"]).optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        height: z.string().optional(),
        weight: z.string().optional(),
        bodyFat: z.string().optional(),
        goal: z.enum(["weight_loss", "muscle_gain", "fitness", "rehab", "other"]).optional(),
        medicalNotes: z.string().optional(),
        emergencyContact: z.string().optional(),
        emergencyPhone: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input }) => db.createTrainee(input)),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        fullName: z.string().optional(),
        trainerId: z.number().optional().nullable(),
        age: z.number().optional(),
        gender: z.enum(["male", "female", "other"]).optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        height: z.string().optional(),
        weight: z.string().optional(),
        bodyFat: z.string().optional(),
        goal: z.enum(["weight_loss", "muscle_gain", "fitness", "rehab", "other"]).optional(),
        medicalNotes: z.string().optional(),
        emergencyContact: z.string().optional(),
        emergencyPhone: z.string().optional(),
        notes: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const before = await db.getTraineeById(id);
        await db.updateTrainee(id, data);

        if (before && data.trainerId !== undefined && before.trainerId !== data.trainerId) {
          if (data.trainerId === null) {
            await notifyTrainee(id, {
              title: "Trainer Assignment Updated",
              message: "Your trainer assignment was removed. Please check your profile for updates.",
              type: "general",
            });
          } else if (typeof data.trainerId === "number") {
            const trainer = await db.getTrainerById(data.trainerId);
            await notifyTrainee(id, {
              title: "New Trainer Assigned",
              message: `You are now assigned to trainer ${trainer?.name ?? `#${data.trainerId}`}.`,
              type: "general",
            });
          }
        }

        if (before && data.isActive !== undefined && before.isActive !== data.isActive) {
          await notifyTrainee(id, {
            title: data.isActive ? "Account Reactivated" : "Account Status Updated",
            message: data.isActive
              ? "Your membership profile is active again."
              : "Your membership profile was set to inactive. Contact the gym admin if this is unexpected.",
            type: "general",
          });
        }

        return db.getTraineeById(id);
      }),
    setCredentials: adminProcedure
      .input(z.object({
        traineeId: z.number(),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(["user", "admin"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const trainee = await db.getTraineeById(input.traineeId);
        if (!trainee) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Trainee not found" });
        }

        const user = await db.upsertLocalUserCredentials({
          email: input.email,
          passwordHash: hashPassword(input.password),
          name: trainee.fullName,
          role: input.role ?? "user",
        });

        await db.updateTrainee(input.traineeId, {
          userId: user.id,
          email: user.email,
        });

        await notifyTrainee(input.traineeId, {
          title: "Login Credentials Ready",
          message: `Your account login was created for ${user.email}. Use the password provided by your admin.`,
          type: "general",
        });

        return {
          traineeId: input.traineeId,
          userId: user.id,
          email: user.email,
          role: user.role,
        };
      }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteTrainee(input.id)),
  }),

  // ===================== SUBSCRIPTIONS =====================
  subscriptions: router({
    plans: publicProcedure.query(() => db.getSubscriptionPlans()),
    createPlan: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        type: z.enum(["monthly", "quarterly", "half_year", "yearly", "custom"]),
        durationDays: z.number(),
        price: z.string(),
        description: z.string().optional(),
      }))
      .mutation(({ input }) => db.createSubscriptionPlan(input)),
    updatePlan: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), price: z.string().optional(), description: z.string().optional(), isActive: z.boolean().optional() }))
      .mutation(({ input }) => { const { id, ...data } = input; return db.updateSubscriptionPlan(id, data); }),
    list: adminProcedure
      .input(z.object({ traineeId: z.number().optional(), status: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(({ input }) => db.getSubscriptions(input)),
    mySubscription: protectedProcedure.query(async ({ ctx }) => {
      const trainee = await db.getTraineeByUserId(ctx.user.id);
      if (!trainee) return null;
      return db.getActiveSubscriptionByTraineeId(trainee.id);
    }),
    getByTrainee: adminProcedure.input(z.object({ traineeId: z.number() })).query(({ input }) => db.getSubscriptions({ traineeId: input.traineeId })),
    create: adminProcedure
      .input(z.object({
        traineeId: z.number(),
        planId: z.number().optional(),
        planName: z.string().optional(),
        price: z.string(),
        startDate: z.string(),
        endDate: z.string(),
        status: z.enum(["active", "expired", "frozen", "cancelled", "pending"]).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const created = await db.createSubscription(input as any);
        await notifyTrainee(input.traineeId, {
          title: "Subscription Updated",
          message: `Your subscription ${input.planName ? `(${input.planName}) ` : ""}is set from ${input.startDate} to ${input.endDate}.`,
          type: "general",
        });
        return created;
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["active", "expired", "frozen", "cancelled", "pending"]).optional(),
        endDate: z.string().optional(),
        notes: z.string().optional(),
        renewalCount: z.number().optional(),
        frozenDays: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, endDate, ...rest } = input;
        const previous = await db.getSubscriptionById(id);
        await db.updateSubscription(id, { ...rest, ...(endDate ? { endDate: endDate as any } : {}) });
        const next = await db.getSubscriptionById(id);

        if (next && previous && previous.status !== next.status) {
          const statusText = next.status.charAt(0).toUpperCase() + next.status.slice(1);
          const notifType: NotificationType =
            next.status === "expired" ? "subscription_expired" : "general";
          await notifyTrainee(next.traineeId, {
            title: "Subscription Status Changed",
            message: `Your subscription status is now ${statusText}.`,
            type: notifType,
          });
        }

        return next;
      }),
  }),

  // ===================== PAYMENTS =====================
  payments: router({
    list: adminProcedure
      .input(z.object({ traineeId: z.number().optional(), type: z.string().optional(), method: z.string().optional(), startDate: z.date().optional(), endDate: z.date().optional(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(({ input }) => db.getPayments(input)),
    myPayments: protectedProcedure.query(async ({ ctx }) => {
      const trainee = await db.getTraineeByUserId(ctx.user.id);
      if (!trainee) return { data: [], total: 0 };
      return db.getPayments({ traineeId: trainee.id });
    }),
    revenueStats: adminProcedure.query(() => db.getRevenueStats()),
    monthlyRevenue: adminProcedure.input(z.object({ months: z.number().optional() })).query(({ input }) => db.getMonthlyRevenue(input.months ?? 6)),
    create: adminProcedure
      .input(z.object({
        traineeId: z.number(),
        subscriptionId: z.number().optional(),
        amount: z.string(),
        discount: z.string().optional(),
        finalAmount: z.string(),
        paymentMethod: z.enum(["cash", "card", "wallet", "transfer"]),
        paymentDate: z.string().optional(),
        receiptNumber: z.string().optional(),
        notes: z.string().optional(),
        type: z.enum(["subscription", "supplement", "other"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { paymentDate, ...data } = input;
        const created = await db.createPayment({
          ...data,
          type: data.type ?? "subscription",
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        });
        await notifyTrainee(input.traineeId, {
          title: "Payment Confirmed",
          message: `A payment of $${created?.finalAmount ?? input.finalAmount} was recorded.`,
          type: "payment_confirmed",
        });
        return created;
      }),
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          traineeId: z.number().optional(),
          subscriptionId: z.number().optional().nullable(),
          amount: z.string().optional(),
          discount: z.string().optional(),
          finalAmount: z.string().optional(),
          paymentMethod: z.enum(["cash", "card", "wallet", "transfer"]).optional(),
          paymentDate: z.string().optional(),
          receiptNumber: z.string().optional(),
          notes: z.string().optional(),
          type: z.enum(["subscription", "supplement", "other"]).optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, paymentDate, ...data } = input;
        return db.updatePayment(id, {
          ...data,
          ...(paymentDate ? { paymentDate: new Date(paymentDate) } : {}),
        });
      }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deletePayment(input.id)),
  }),

  // ===================== WORKOUT PLANS =====================
  workouts: router({
    list: adminProcedure.input(z.object({ isArchived: z.boolean().optional(), goal: z.string().optional() })).query(({ input }) => db.getWorkoutPlans(input)),
    get: adminProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getWorkoutPlanById(input.id)),
    getDays: adminProcedure.input(z.object({ planId: z.number() })).query(({ input }) => db.getWorkoutDaysByPlanId(input.planId)),
    getExercises: adminProcedure.input(z.object({ dayId: z.number() })).query(({ input }) => db.getExercisesByDayId(input.dayId)),
    myPlan: protectedProcedure.query(async ({ ctx }) => {
      const trainee = await db.getTraineeByUserId(ctx.user.id);
      if (!trainee) return null;
      return db.getTraineeWorkoutPlan(trainee.id);
    }),
    create: adminProcedure
      .input(z.object({ name: z.string().min(1), goal: z.enum(["weight_loss", "muscle_gain", "fitness", "rehab", "other"]).optional(), description: z.string().optional() }))
      .mutation(({ input }) => db.createWorkoutPlan(input)),
    update: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().optional(), goal: z.enum(["weight_loss", "muscle_gain", "fitness", "rehab", "other"]).optional(), description: z.string().optional(), isActive: z.boolean().optional(), isArchived: z.boolean().optional() }))
      .mutation(({ input }) => { const { id, ...data } = input; return db.updateWorkoutPlan(id, data); }),
    addDay: adminProcedure
      .input(z.object({ planId: z.number(), dayName: z.string(), dayOrder: z.number().optional(), category: z.enum(["chest", "back", "shoulders", "arms", "legs", "abs", "cardio", "full_body", "rest"]) }))
      .mutation(({ input }) => db.createWorkoutDay({ ...input, dayOrder: input.dayOrder ?? 0 })),
    deleteDay: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteWorkoutDay(input.id)),
    addExercise: adminProcedure
      .input(
        z.object({
          dayId: z.number(),
          name: z.string().min(1),
          sets: z.number().optional(),
          reps: z.string().optional(),
          restTime: z.string().optional(),
          instructions: z.array(z.string()).optional(),
          notes: z.string().optional(),
          demoUrl: z.string().optional(),
          gifUrl: z.string().optional(),
          bodyPart: z.string().optional(),
          target: z.string().optional(),
          equipment: z.string().optional(),
          orderIndex: z.number().optional(),
        })
      )
      .mutation(({ input }) => db.createExercise({ ...input, orderIndex: input.orderIndex ?? 0 })),
    updateExercise: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          sets: z.number().optional(),
          reps: z.string().optional(),
          restTime: z.string().optional(),
          instructions: z.array(z.string()).optional(),
          notes: z.string().optional(),
          demoUrl: z.string().optional(),
          gifUrl: z.string().optional(),
          bodyPart: z.string().optional(),
          target: z.string().optional(),
          equipment: z.string().optional(),
        })
      )
      .mutation(({ input }) => { const { id, ...data } = input; return db.updateExercise(id, data); }),
    deleteExercise: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteExercise(input.id)),
    librarySearch: adminProcedure
      .input(
        z.object({
          query: z.string().optional(),
          bodyPart: z.string().optional(),
          target: z.string().optional(),
          limit: z.number().min(1).max(50).optional(),
        })
      )
      .query(async ({ input }) => {
        try {
          return await searchExerciseCatalog(input.query ?? "", input.limit ?? 20, {
            bodyPart: input.bodyPart,
            target: input.target,
          });
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error instanceof Error ? error.message : "Exercise catalog search failed",
          });
        }
      }),
    libraryFilters: adminProcedure.query(async () => {
      try {
        return await getExerciseCatalogFacets();
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "Exercise catalog filters failed",
        });
      }
    }),
    libraryVideos: adminProcedure
      .input(z.object({ query: z.string().min(2), limit: z.number().min(1).max(20).optional() }))
      .query(async ({ input }) => {
        try {
          return await searchExerciseVideos(input.query, input.limit ?? 6);
        } catch (error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error instanceof Error ? error.message : "Exercise videos search failed",
          });
        }
      }),
    assign: adminProcedure
      .input(z.object({ traineeId: z.number(), planId: z.number() }))
      .mutation(async ({ input }) => {
        const assignment = await db.assignWorkoutPlan(input.traineeId, input.planId);
        const plan = await db.getWorkoutPlanById(input.planId);
        await notifyTrainee(input.traineeId, {
          title: "New Workout Plan Assigned",
          message: `Your admin assigned you the workout plan: ${plan?.name ?? `#${input.planId}`}.`,
          type: "new_workout",
        });
        return assignment;
      }),
    toggleCompletion: protectedProcedure
      .input(z.object({ exerciseId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const trainee = await db.getTraineeByUserId(ctx.user.id);
        if (!trainee) throw new TRPCError({ code: "NOT_FOUND" });
        return db.toggleExerciseCompletion(trainee.id, input.exerciseId);
      }),
    todayCompletions: protectedProcedure.query(async ({ ctx }) => {
      const trainee = await db.getTraineeByUserId(ctx.user.id);
      if (!trainee) return [];
      return db.getTodayCompletions(trainee.id);
    }),
  }),

  // ===================== ATTENDANCE =====================
  attendance: router({
    list: adminProcedure
      .input(z.object({ traineeId: z.number().optional(), startDate: z.date().optional(), endDate: z.date().optional(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(({ input }) => db.getAttendance(input)),
    myAttendance: protectedProcedure.query(async ({ ctx }) => {
      const trainee = await db.getTraineeByUserId(ctx.user.id);
      if (!trainee) return { data: [], total: 0 };
      return db.getAttendance({ traineeId: trainee.id, limit: 30 });
    }),
    todayCount: adminProcedure.query(() => db.getTodayAttendanceCount()),
    record: adminProcedure
      .input(z.object({ traineeId: z.number(), checkInDate: z.string(), status: z.enum(["present", "absent", "late"]).optional(), notes: z.string().optional() }))
      .mutation(({ input }) => db.recordAttendance(input as any)),
  }),

  // ===================== PROGRESS =====================
  progress: router({
    list: adminProcedure.input(z.object({ traineeId: z.number() })).query(({ input }) => db.getProgressRecords(input.traineeId)),
    myProgress: protectedProcedure.query(async ({ ctx }) => {
      const trainee = await db.getTraineeByUserId(ctx.user.id);
      if (!trainee) return [];
      return db.getProgressRecords(trainee.id);
    }),
    create: adminProcedure
      .input(z.object({
        traineeId: z.number(),
        recordDate: z.string(),
        weight: z.string().optional(),
        height: z.string().optional(),
        bodyFat: z.string().optional(),
        chest: z.string().optional(),
        waist: z.string().optional(),
        arm: z.string().optional(),
        thigh: z.string().optional(),
        bmi: z.string().optional(),
        photoUrl: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ input }) => db.createProgressRecord(input as any)),
    update: adminProcedure
      .input(z.object({ id: z.number(), weight: z.string().optional(), bodyFat: z.string().optional(), chest: z.string().optional(), waist: z.string().optional(), arm: z.string().optional(), thigh: z.string().optional(), bmi: z.string().optional(), notes: z.string().optional() }))
      .mutation(({ input }) => { const { id, ...data } = input; return db.updateProgressRecord(id, data); }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteProgressRecord(input.id)),
  }),

  // ===================== SUPPLEMENTS =====================
  supplements: router({
    categories: publicProcedure.query(() => db.getSupplementCategories()),
    createCategory: adminProcedure
      .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
      .mutation(({ input }) => db.createSupplementCategory(input)),
    updateCategory: adminProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).optional(), description: z.string().optional() }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updateSupplementCategory(id, data);
      }),
    deleteCategory: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteSupplementCategory(input.id)),
    list: publicProcedure
      .input(z.object({ categoryId: z.number().optional(), search: z.string().optional(), isFeatured: z.boolean().optional(), isActive: z.boolean().optional(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(({ input }) => db.getSupplements(input)),
    get: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => db.getSupplementById(input.id)),
    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        categoryId: z.number().optional(),
        description: z.string().optional(),
        price: z.string(),
        discountPrice: z.string().optional(),
        stock: z.number().optional(),
        sku: z.string().optional(),
        brand: z.string().optional(),
        imageUrl: z.string().optional(),
        isFeatured: z.boolean().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(({ input }) => db.createSupplement(input as any)),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        categoryId: z.number().nullable().optional(),
        price: z.string().optional(),
        discountPrice: z.string().optional(),
        stock: z.number().optional(),
        sku: z.string().optional(),
        isFeatured: z.boolean().optional(),
        isActive: z.boolean().optional(),
        description: z.string().optional(),
        brand: z.string().optional(),
        imageUrl: z.string().optional(),
      }))
      .mutation(({ input }) => { const { id, ...data } = input; return db.updateSupplement(id, data); }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteSupplement(input.id)),
    orders: adminProcedure
      .input(z.object({ traineeId: z.number().optional(), status: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(({ input }) => db.getSupplementOrders(input)),
    orderItems: adminProcedure
      .input(z.object({ orderId: z.number() }))
      .query(({ input }) => db.getSupplementOrderItems(input.orderId)),
    myOrders: protectedProcedure.query(async ({ ctx }) => {
      const trainee = await db.getTraineeByUserId(ctx.user.id);
      if (!trainee) return { data: [], total: 0 };
      return db.getSupplementOrders({ traineeId: trainee.id });
    }),
    placeOrder: protectedProcedure
      .input(z.object({
        items: z.array(z.object({ supplementId: z.number(), quantity: z.number().min(1) })),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const trainee = await db.getTraineeByUserId(ctx.user.id);
        if (!trainee) throw new TRPCError({ code: "NOT_FOUND", message: "Trainee profile not found" });
        const orderId = await db.createSupplementOrder(trainee.id, input.items, input.notes);
        await notifyTrainee(trainee.id, {
          title: "Order Placed",
          message: `Your supplement order #${orderId} was placed successfully and is pending confirmation.`,
          type: "new_order",
        });
        await notifyAdmins({
          title: "New Supplement Order",
          message: `${trainee.fullName} placed supplement order #${orderId}.`,
          type: "new_order",
        });
        return orderId;
      }),
    updateOrderStatus: adminProcedure
      .input(z.object({ id: z.number(), status: z.enum(["pending", "confirmed", "delivered", "cancelled"]) }))
      .mutation(async ({ input }) => {
        const order = await db.getSupplementOrderById(input.id);
        const result = await db.updateSupplementOrderStatus(input.id, input.status);

        if (order && order.status !== input.status) {
          const messages: Record<string, string> = {
            pending: `Your order #${input.id} is pending.`,
            confirmed: `Your order #${input.id} was confirmed and is being prepared.`,
            delivered: `Your order #${input.id} was delivered.`,
            cancelled: `Your order #${input.id} was cancelled.`,
          };
          await notifyTrainee(order.traineeId, {
            title: "Order Status Updated",
            message: messages[input.status] ?? `Your order #${input.id} status changed.`,
            type: "new_order",
          });
        }

        return result;
      }),
    recordOrderPayment: adminProcedure
      .input(
        z.object({
          orderId: z.number(),
          paymentMethod: z.enum(["cash", "card", "wallet", "transfer"]),
          paymentDate: z.string().optional(),
          receiptNumber: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const order = await db.getSupplementOrderById(input.orderId);
        const result = await db.recordSupplementOrderPayment(input.orderId, {
          paymentMethod: input.paymentMethod,
          paymentDate: input.paymentDate ? new Date(input.paymentDate) : undefined,
          receiptNumber: input.receiptNumber,
          notes: input.notes,
        });
        if (order) {
          await notifyTrainee(order.traineeId, {
            title: "Order Payment Confirmed",
            message: `Payment for order #${input.orderId} was confirmed by admin.`,
            type: "payment_confirmed",
          });
        }
        return result;
      }),
  }),

  // ===================== NUTRITION =====================
  nutrition: router({
    listPlans: adminProcedure
      .input(
        z.object({
          search: z.string().optional(),
          goal: nutritionGoalSchema.optional(),
          isTemplate: z.boolean().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        })
      )
      .query(({ input }) => db.getNutritionPlans(input)),
    getPlanById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => db.getNutritionPlanById(input.id)),
    createPlan: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          goal: nutritionGoalSchema,
          isTemplate: z.boolean().optional(),
          meals: z
            .array(
              z.object({
                mealName: nutritionMealNameSchema,
                mealOrder: z.number().optional(),
                foods: z
                  .array(
                    z.object({
                      foodName: z.string().min(1),
                      quantity: z.number(),
                      unit: nutritionUnitSchema,
                      calories: z.number(),
                      protein: z.number(),
                      carbs: z.number(),
                      fat: z.number(),
                      notes: z.string().optional(),
                    })
                  )
                  .optional(),
              })
            )
            .max(6)
            .optional(),
        })
      )
      .mutation(({ ctx, input }) => db.createNutritionPlan({ ...input, createdBy: ctx.user.id })),
    updatePlan: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          goal: nutritionGoalSchema.optional(),
          isTemplate: z.boolean().optional(),
          meals: z
            .array(
              z.object({
                mealName: nutritionMealNameSchema,
                mealOrder: z.number().optional(),
                foods: z
                  .array(
                    z.object({
                      foodName: z.string().min(1),
                      quantity: z.number(),
                      unit: nutritionUnitSchema,
                      calories: z.number(),
                      protein: z.number(),
                      carbs: z.number(),
                      fat: z.number(),
                      notes: z.string().optional(),
                    })
                  )
                  .optional(),
              })
            )
            .max(6)
            .optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updateNutritionPlan(id, data);
      }),
    duplicatePlan: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => db.duplicateNutritionPlan(input.id, ctx.user.id)),
    deletePlan: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteNutritionPlan(input.id)),
    addMeal: adminProcedure
      .input(
        z.object({
          planId: z.number(),
          mealName: nutritionMealNameSchema,
          mealOrder: z.number().optional(),
        })
      )
      .mutation(({ input }) => db.addNutritionMeal(input)),
    updateMeal: adminProcedure
      .input(
        z.object({
          id: z.number(),
          mealName: nutritionMealNameSchema.optional(),
          mealOrder: z.number().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updateNutritionMeal(id, data);
      }),
    deleteMeal: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteNutritionMeal(input.id)),
    reorderMeals: adminProcedure
      .input(z.object({ planId: z.number(), mealIds: z.array(z.number()).max(6) }))
      .mutation(({ input }) => db.reorderNutritionMeals(input.planId, input.mealIds)),
    addFood: adminProcedure
      .input(
        z.object({
          mealId: z.number(),
          foodName: z.string().min(1),
          quantity: z.number(),
          unit: nutritionUnitSchema,
          calories: z.number(),
          protein: z.number(),
          carbs: z.number(),
          fat: z.number(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ input }) => db.addNutritionFood(input)),
    updateFood: adminProcedure
      .input(
        z.object({
          id: z.number(),
          foodName: z.string().min(1).optional(),
          quantity: z.number().optional(),
          unit: nutritionUnitSchema.optional(),
          calories: z.number().optional(),
          protein: z.number().optional(),
          carbs: z.number().optional(),
          fat: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updateNutritionFood(id, data);
      }),
    deleteFood: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => db.deleteNutritionFood(input.id)),
    assignPlan: adminProcedure
      .input(
        z.object({
          planId: z.number(),
          traineeId: z.number(),
          startDate: z.string(),
          endDate: z.string(),
          status: nutritionAssignmentStatusSchema.optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const assignment = await db.assignNutritionPlan({
          ...input,
          assignedBy: ctx.user.id,
        });
        const plan = await db.getNutritionPlanById(input.planId);
        await notifyTrainee(input.traineeId, {
          title: "Nutrition Plan Assigned",
          message: `A nutrition plan (${plan?.name ?? `#${input.planId}`}) was assigned to you.`,
          type: "general",
        });
        return assignment;
      }),
    updateAssignment: adminProcedure
      .input(
        z.object({
          id: z.number(),
          planId: z.number().optional(),
          traineeId: z.number().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          status: nutritionAssignmentStatusSchema.optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return db.updateNutritionAssignment(id, data);
      }),
    listAssignments: adminProcedure
      .input(
        z.object({
          traineeId: z.number().optional(),
          planId: z.number().optional(),
          status: nutritionAssignmentStatusSchema.optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        })
      )
      .query(({ input }) => db.getNutritionAssignments(input)),
    getTraineeActivePlan: adminProcedure
      .input(z.object({ traineeId: z.number() }))
      .query(({ input }) => db.getTraineeActiveNutritionPlan(input.traineeId)),
    getMyPlan: protectedProcedure.query(async ({ ctx }) => {
      const trainee = await db.getTraineeByUserId(ctx.user.id);
      if (!trainee) return null;
      return db.getTraineeActiveNutritionPlan(trainee.id);
    }),
  }),

  // ===================== MARKETING =====================
  marketing: router({
    campaigns: adminProcedure
      .input(z.object({ status: z.string().optional(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(({ input }) => db.getCampaigns(input)),
    createCampaign: adminProcedure
      .input(z.object({
        title: z.string().min(1),
        message: z.string().min(1),
        targetAudience: z.enum(["all", "active", "expired", "by_plan", "by_goal"]).optional(),
        targetPlanId: z.number().optional(),
        targetGoal: z.enum(["weight_loss", "muscle_gain", "fitness", "rehab", "other"]).optional(),
        channel: z.enum(["in_app", "sms", "whatsapp", "email", "telegram", "both"]).optional(),
        scheduledAt: z.date().optional(),
      }))
      .mutation(({ input }) =>
        db.createCampaign({
          ...input,
          status: input.scheduledAt ? "scheduled" : "draft",
        } as any)
      ),
    updateCampaign: adminProcedure
      .input(z.object({ id: z.number(), title: z.string().optional(), message: z.string().optional(), status: z.enum(["draft", "scheduled", "sent", "cancelled"]).optional() }))
      .mutation(({ input }) => { const { id, ...data } = input; return db.updateCampaign(id, data); }),
    previewRecipients: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const campaign = await db.getCampaignById(input.id);
        if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });
        const recipients = await resolveCampaignRecipients(campaign as any);
        return { count: recipients.length };
      }),
    deleteCampaign: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteCampaign(input.id)),
    sendCampaign: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const campaign = await db.getCampaignById(input.id);
        if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found" });

        const recipients = await resolveCampaignRecipients(campaign as any);
        const sendInApp = campaign.channel === "in_app" || campaign.channel === "both";
        const sendTelegram = campaign.channel === "telegram" || campaign.channel === "both";
        const sendEmail = campaign.channel === "email" || campaign.channel === "both";

        if (sendInApp) {
          await Promise.all(
            recipients.map((recipient) =>
              db.createNotification({
                userId: recipient.userId,
                traineeId: recipient.traineeId,
                title: campaign.title,
                message: campaign.message,
                type: "offer",
                isRead: false,
              })
            )
          );
        }

        let telegramStatus: "sent" | "skipped" | "failed" = "skipped";
        let telegramReason: "missing_config" | "telegram_api_error" | "network_error" | null = null;
        if (sendTelegram) {
          const telegramResult = await sendTelegramCampaignMessage({
            title: campaign.title,
            message: campaign.message,
          });
          telegramStatus = telegramResult.ok ? "sent" : "failed";
          telegramReason = telegramResult.ok ? null : telegramResult.reason;
        }

        let emailStatus: "sent" | "skipped" | "failed" = "skipped";
        let emailReason: "missing_config" | "transport_error" | null = null;
        let emailSentCount = 0;
        let emailFailedCount = 0;
        if (sendEmail) {
          const emailRecipients = recipients
            .map((recipient) => recipient.email)
            .filter((email): email is string => Boolean(email));
          const emailResult = await sendEmailCampaign({
            title: campaign.title,
            message: campaign.message,
            recipients: emailRecipients,
          });
          emailStatus = emailResult.ok ? "sent" : "failed";
          emailReason = emailResult.reason;
          emailSentCount = emailResult.sent;
          emailFailedCount = emailResult.failed;
        }

        await db.updateCampaign(input.id, {
          status: "sent",
          sentAt: new Date(),
          recipientCount: recipients.length,
        });
        return {
          success: true,
          recipients: recipients.length,
          telegramStatus,
          telegramReason,
          emailStatus,
          emailReason,
          emailSentCount,
          emailFailedCount,
        };
      }),
    templates: adminProcedure.query(() => db.getMessageTemplates()),
    createTemplate: adminProcedure
      .input(z.object({ name: z.string().min(1), content: z.string().min(1), category: z.string().optional() }))
      .mutation(({ input }) => db.createMessageTemplate(input)),
    testEmail: adminProcedure
      .input(
        z.object({
          email: z.string().email(),
          title: z.string().min(1).optional(),
          message: z.string().min(1).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const emailResult = await sendEmailCampaign({
          title: input.title ?? "GymOS SMTP Test",
          message:
            input.message ??
            "This is a test email from GymOS. If you received this, SMTP is configured correctly.",
          recipients: [input.email],
        });
        return emailResult;
      }),
  }),

  // ===================== NOTIFICATIONS =====================
  notifications: router({
    list: protectedProcedure
      .input(z.object({ isRead: z.boolean().optional(), limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const trainee = await db.getTraineeByUserId(ctx.user.id);
        return db.getNotifications({ userId: ctx.user.id, traineeId: trainee?.id, isRead: input.isRead, limit: input.limit });
      }),
    markRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const trainee = await db.getTraineeByUserId(ctx.user.id);
        return db.markNotificationReadForRecipient(input.id, {
          userId: ctx.user.id,
          traineeId: trainee?.id,
        });
      }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      const trainee = await db.getTraineeByUserId(ctx.user.id);
      return db.markAllNotificationsReadForRecipient({
        userId: ctx.user.id,
        traineeId: trainee?.id,
      });
    }),
    create: adminProcedure
      .input(z.object({
        userId: z.number().optional(),
        traineeId: z.number().optional(),
        title: z.string().min(1),
        message: z.string().min(1),
        type: z.enum(["subscription_expiring", "subscription_expired", "payment_confirmed", "new_workout", "offer", "low_stock", "new_order", "new_trainee", "attendance_reminder", "general"]).optional(),
      }))
      .mutation(({ input }) => db.createNotification(input as any)),
  }),

  // ===================== USER PORTAL =====================
  userPortal: router({
    profile: protectedProcedure.query(async ({ ctx }) => {
      const trainee = await db.getTraineeByUserId(ctx.user.id);
      if (!trainee) return null;
      const [attendance] = await Promise.all([
        db.getAttendance({ traineeId: trainee.id, limit: 1000 }),
      ]);
      return { ...trainee, attendanceCount: attendance.total };
    }),
    upsertProfile: protectedProcedure
      .input(z.object({
        fullName: z.string().min(1),
        age: z.number().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        height: z.string().optional(),
        weight: z.string().optional(),
        goal: z.enum(["weight_loss", "muscle_gain", "fitness", "rehab", "other"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getTraineeByUserId(ctx.user.id);
        const payload = {
          fullName: input.fullName,
          age: input.age,
          phone: input.phone,
          email: input.email ?? ctx.user.email ?? undefined,
          height: input.height,
          weight: input.weight,
          goal: input.goal,
        };

        const wasNew = !existing;
        if (existing) {
          await db.updateTrainee(existing.id, payload);
        } else {
          await db.createTrainee({
            userId: ctx.user.id,
            fullName: payload.fullName,
            age: payload.age,
            phone: payload.phone,
            email: payload.email,
            height: payload.height,
            weight: payload.weight,
            goal: payload.goal,
          });
        }

        const profile = await db.getTraineeByUserId(ctx.user.id);
        if (profile && wasNew) {
          await notifyAdmins({
            title: "New Member Profile Linked",
            message: `${profile.fullName} completed profile setup and linked their account.`,
            type: "new_trainee",
          });
        }
        return profile;
      }),
    subscription: protectedProcedure.query(async ({ ctx }) => {
      const trainee = await db.getTraineeByUserId(ctx.user.id);
      if (!trainee) return null;
      const subs = await db.getSubscriptions({ traineeId: trainee.id, status: 'active', limit: 1 });
      return subs.data[0] ?? null;
    }),
    todayWorkout: protectedProcedure.query(async ({ ctx }) => {
      const trainee = await db.getTraineeByUserId(ctx.user.id);
      if (!trainee) return null;
      const plan = await db.getTraineeWorkoutPlan(trainee.id);
      if (!plan) return null;
      const days = await db.getWorkoutDaysByPlanId(plan.id);
      const dayOfWeek = new Date().getDay();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      return days[dayIndex % days.length] ?? null;
    }),
    workoutPlan: protectedProcedure.query(async ({ ctx }) => {
      const trainee = await db.getTraineeByUserId(ctx.user.id);
      if (!trainee) return null;
      const plan = await db.getTraineeWorkoutPlan(trainee.id);
      if (!plan) return null;
      const days = await db.getWorkoutDaysByPlanId(plan.id);
      return { plan, days };
    }),
    workoutDayExercises: protectedProcedure
      .input(z.object({ dayId: z.number() }))
      .query(({ input }) => db.getExercisesByDayId(input.dayId)),
    attendance: protectedProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const trainee = await db.getTraineeByUserId(ctx.user.id);
        if (!trainee) return { data: [], total: 0 };
        return db.getAttendance({ traineeId: trainee.id, limit: input.limit ?? 30, offset: input.offset });
      }),
    progress: protectedProcedure.query(async ({ ctx }) => {
      const trainee = await db.getTraineeByUserId(ctx.user.id);
      if (!trainee) return [];
      return db.getProgressRecords(trainee.id);
    }),
    addProgress: protectedProcedure
      .input(z.object({
        recordDate: z.string(),
        weight: z.string().optional(),
        bodyFat: z.string().optional(),
        chest: z.string().optional(),
        waist: z.string().optional(),
        hips: z.string().optional(),
        arm: z.string().optional(),
        thigh: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const trainee = await db.getTraineeByUserId(ctx.user.id);
        if (!trainee) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trainee profile not found' });
        const record = await db.createProgressRecord({
          traineeId: trainee.id,
          recordDate: new Date(input.recordDate),
          weight: input.weight,
          bodyFat: input.bodyFat,
          chest: input.chest,
          waist: input.waist,
          arm: input.arm,
          thigh: input.thigh,
          notes: input.notes,
        });
        await notifyAdmins({
          title: "Progress Update Submitted",
          message: `${trainee.fullName} added a new body progress record.`,
          type: "general",
        });
        return record;
      }),
    notifications: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const trainee = await db.getTraineeByUserId(ctx.user.id);
        return db.getNotifications({ userId: ctx.user.id, traineeId: trainee?.id, limit: input.limit ?? 20 });
      }),
    markNotificationRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const trainee = await db.getTraineeByUserId(ctx.user.id);
        return db.markNotificationReadForRecipient(input.id, {
          userId: ctx.user.id,
          traineeId: trainee?.id,
        });
      }),
    markAllNotificationsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        const trainee = await db.getTraineeByUserId(ctx.user.id);
        return db.markAllNotificationsReadForRecipient({
          userId: ctx.user.id,
          traineeId: trainee?.id,
        });
      }),
    supplements: protectedProcedure
      .input(z.object({ categoryId: z.number().optional(), search: z.string().optional(), limit: z.number().optional() }))
      .query(({ input }) => db.getSupplements({ categoryId: input.categoryId, search: input.search, isActive: true, limit: input.limit ?? 50 })),
    supplementCategories: protectedProcedure.query(() => db.getSupplementCategories()),
    placeOrder: protectedProcedure
      .input(z.object({
        items: z.array(z.object({ supplementId: z.number(), quantity: z.number().min(1) })),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const trainee = await db.getTraineeByUserId(ctx.user.id);
        if (!trainee) throw new TRPCError({ code: 'NOT_FOUND', message: 'Trainee profile not found' });
        const orderId = await db.createSupplementOrder(trainee.id, input.items, input.notes);
        await notifyTrainee(trainee.id, {
          title: "Order Placed",
          message: `Your supplement order #${orderId} was placed successfully and is pending confirmation.`,
          type: "new_order",
        });
        await notifyAdmins({
          title: "New Supplement Order",
          message: `${trainee.fullName} placed supplement order #${orderId}.`,
          type: "new_order",
        });
        return orderId;
      }),
    myOrders: protectedProcedure.query(async ({ ctx }) => {
      const trainee = await db.getTraineeByUserId(ctx.user.id);
      if (!trainee) return { data: [], total: 0 };
      return db.getSupplementOrders({ traineeId: trainee.id, limit: 20 });
    }),
    myOrderItems: protectedProcedure
      .input(z.object({ orderId: z.number() }))
      .query(async ({ ctx, input }) => {
        const trainee = await db.getTraineeByUserId(ctx.user.id);
        if (!trainee) return [];
        const order = await db.getSupplementOrderById(input.orderId);
        if (!order || order.traineeId !== trainee.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
        }
        return db.getSupplementOrderItems(input.orderId);
      }),
  }),

  // ===================== REPORTS =====================
  reports: router({
    revenue: adminProcedure
      .input(z.object({ startDate: z.date().optional(), endDate: z.date().optional(), months: z.number().optional() }))
      .query(async ({ input }) => {
        const [stats, monthly] = await Promise.all([
          db.getRevenueStats(),
          db.getMonthlyRevenue(input.months ?? 12),
        ]);
        return { stats, monthly };
      }),
    subscriptions: adminProcedure.query(async () => {
      const [active, expired, all] = await Promise.all([
        db.getSubscriptions({ status: "active", limit: 1000 }),
        db.getSubscriptions({ status: "expired", limit: 1000 }),
        db.getSubscriptions({ limit: 1000 }),
      ]);
      return { active: active.total, expired: expired.total, total: all.total };
    }),
    attendance: adminProcedure
      .input(z.object({ startDate: z.date().optional(), endDate: z.date().optional() }))
      .query(({ input }) => db.getAttendance({ startDate: input.startDate, endDate: input.endDate, limit: 1000 })),
    supplements: adminProcedure.query(async () => {
      const [orders, lowStock] = await Promise.all([
        db.getSupplementOrders({ limit: 1000 }),
        db.getSupplements({ isActive: true, limit: 100 }),
      ]);
      return { orders: orders.total, supplements: lowStock };
    }),
  }),
});

export type AppRouter = typeof appRouter;
