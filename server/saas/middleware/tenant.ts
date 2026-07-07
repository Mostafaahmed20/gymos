import type { NextFunction, Request, Response } from "express";
import { SAAS_CONFIG } from "../config";
import { prisma } from "../prisma";
import { getTenantDatabase, tenantDatabaseName } from "../services/tenant-database";
import { isGymLicenseActive } from "../services/tenant-policy";

function extractSlugFromHost(host?: string) {
  if (!host) return null;
  const hostname = host.split(":")[0];
  if (!hostname.endsWith(SAAS_CONFIG.appBaseDomain)) return null;
  const suffix = `.${SAAS_CONFIG.appBaseDomain}`;
  if (!hostname.endsWith(suffix)) return null;
  const slug = hostname.slice(0, -suffix.length);
  if (!slug || slug === "www") return null;
  return slug;
}

export async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const headerGymId = req.header("x-gym-id");
    const headerGymSlug = req.header("x-gym-slug");
    const hostSlug = extractSlugFromHost(req.header("host"));

    if (req.authUser?.role === "SUPER_ADMIN") {
      if (headerGymId) {
        req.gymId = headerGymId;
      } else if (headerGymSlug || hostSlug) {
        const slug = headerGymSlug ?? hostSlug!;
        const gym = await prisma.gym.findFirst({
          where: { slug, deletedAt: null },
          select: { id: true },
        });
        req.gymId = gym?.id;
      }
    } else if (req.authUser?.gymId) {
      req.gymId = req.authUser.gymId;
    } else if (headerGymId) {
      req.gymId = headerGymId;
    } else if (headerGymSlug || hostSlug) {
      const slug = headerGymSlug ?? hostSlug!;
      const gym = await prisma.gym.findFirst({
        where: { slug, deletedAt: null },
        select: { id: true },
      });
      req.gymId = gym?.id;
    }

    if (!req.gymId) {
      return res.status(400).json({ message: "Gym context is required" });
    }

    if (req.authUser?.gymId && req.authUser.gymId !== req.gymId) {
      return res.status(403).json({ message: "Cross-tenant access denied" });
    }

    const gym = await prisma.gym.findFirst({
      where: { id: req.gymId, deletedAt: null },
      select: {
        id: true,
        slug: true,
        status: true,
        trialEndDate: true,
        subscriptionEnd: true,
      },
    });

    if (!gym) {
      return res.status(404).json({ message: "Gym not found" });
    }

    if (req.authUser?.role !== "SUPER_ADMIN" && !isGymLicenseActive(gym)) {
      return res.status(402).json({
        message: "Your subscription has expired. Please renew your subscription.",
      });
    }

    req.tenantDatabaseName = tenantDatabaseName(gym);
    req.tenantDatabase = await getTenantDatabase(gym);

    return next();
  } catch (error) {
    return next(error);
  }
}
