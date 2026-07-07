import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { resolveTenant } from "../middleware/tenant";
import { prisma } from "../prisma";

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth, resolveTenant);

dashboardRouter.get("/stats", async (req, res) => {
  const gymId = req.gymId!;
  const monthStart = startOfMonth();
  const todayStart = startOfToday();

  const [totalMembers, activeMemberships, expiredMemberships, monthlyRevenueAgg, todayAttendance, newMembers] =
    await Promise.all([
      prisma.member.count({ where: { gymId, deletedAt: null } }),
      prisma.membership.count({ where: { gymId, status: "ACTIVE", deletedAt: null } }),
      prisma.membership.count({ where: { gymId, status: "EXPIRED", deletedAt: null } }),
      prisma.payment.aggregate({
        where: { gymId, deletedAt: null, paidAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.attendance.count({ where: { gymId, deletedAt: null, checkInAt: { gte: todayStart } } }),
      prisma.member.count({ where: { gymId, deletedAt: null, createdAt: { gte: monthStart } } }),
    ]);

  return res.json({
    totalMembers,
    activeMemberships,
    expiredMemberships,
    monthlyRevenue: Number(monthlyRevenueAgg._sum.amount ?? 0),
    todayAttendance,
    newMembers,
  });
});
