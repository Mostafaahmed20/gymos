import { GymPlan, SubscriptionStatus } from "@prisma/client";
import { SAAS_CONFIG } from "../config";
import { prisma } from "../prisma";

type LicenseCheckInput = {
  status: string;
  trialEndDate: Date;
  subscriptionEnd: Date | null;
};

export function isGymLicenseActive(gym: LicenseCheckInput) {
  const now = new Date();
  if (!["ACTIVE", "TRIAL"].includes(gym.status)) return false;
  if (gym.trialEndDate >= now) return true;
  if (gym.subscriptionEnd && gym.subscriptionEnd >= now) return true;
  return false;
}

export async function canUsePremiumFeatures(gymId: string) {
  const gym = await prisma.gym.findFirst({
    where: { id: gymId, deletedAt: null },
    select: { trialEndDate: true, subscriptionEnd: true, status: true },
  });
  if (!gym) return false;
  const now = new Date();
  if (gym.status !== "ACTIVE") return false;
  if (gym.trialEndDate >= now) return true;
  if (gym.subscriptionEnd && gym.subscriptionEnd >= now) return true;
  return false;
}

export async function enforceMemberLimit(gymId: string) {
  const gym = await prisma.gym.findFirst({
    where: { id: gymId, deletedAt: null },
    select: { plan: true },
  });
  if (!gym) return { allowed: false, reason: "Gym not found" };

  if (gym.plan !== GymPlan.BASIC) return { allowed: true };

  const membersCount = await prisma.member.count({
    where: { gymId, deletedAt: null },
  });

  if (membersCount >= SAAS_CONFIG.basicMemberLimit) {
    return {
      allowed: false,
      reason: `Basic plan member limit reached (${SAAS_CONFIG.basicMemberLimit})`,
    };
  }

  return { allowed: true };
}

export async function upsertGymSubscription(gymId: string, plan: GymPlan, endDate: Date) {
  const existing = await prisma.subscription.findFirst({
    where: { gymId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    return prisma.subscription.update({
      where: { id: existing.id },
      data: {
        plan,
        status: SubscriptionStatus.ACTIVE,
        endDate,
      },
    });
  }

  return prisma.subscription.create({
    data: {
      gymId,
      plan,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(),
      endDate,
    },
  });
}
