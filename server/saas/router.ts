/**
 * createSaasRouter — exports all SaaS API routes as a single Express Router
 * so they can be mounted directly inside the main app under /api/v1.
 * This avoids the double-body-parser issue that occurs when mounting a full
 * Express sub-application.
 */
import cors from "cors";
import crypto from "crypto";
import express, { Router } from "express";
import fs from "fs";
import helmet from "helmet";
import multer from "multer";
import path from "path";
import { UserRole } from "@prisma/client";
import { ZodError } from "zod";
import { SAAS_CONFIG } from "./config";
import { requireAuth } from "./middleware/auth";
import { apiRateLimit, authRateLimit } from "./middleware/rate-limit";
import { requireRoles } from "./middleware/roles";
import { resolveTenant } from "./middleware/tenant";
import { attendanceRouter } from "./routes/attendance.routes";
import { authRouter } from "./routes/auth.routes";
import { coachesRouter } from "./routes/coaches.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { gymRouter } from "./routes/gym.routes";
import { membersRouter } from "./routes/members.routes";
import { membershipsRouter } from "./routes/memberships.routes";
import { paymentsRouter } from "./routes/payments.routes";
import { reportsRouter } from "./routes/reports.routes";
import { superAdminRouter } from "./routes/super-admin.routes";
import { memberPortalRouter } from "./routes/member-portal.routes";
import { progressRouter } from "./routes/progress.routes";
import { plansRouter } from "./routes/plans.routes";

export function createSaasRouter() {
  const router = Router();

  const uploadDir = path.join(process.cwd(), "uploads", "member-photos");
  fs.mkdirSync(uploadDir, { recursive: true });

  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadDir),
      filename: (req: any, file: any, cb: any) => {
        const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
        cb(null, `${req.gymId}-${Date.now()}-${crypto.randomUUID()}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req: any, file: any, cb: any) => {
      if (!file.mimetype.startsWith("image/")) {
        cb(new Error("Only image uploads are allowed."));
        return;
      }
      cb(null, true);
    },
  });

  router.use(
    helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }) as any
  );
  router.use(
    cors({
      origin: SAAS_CONFIG.corsOrigin === "*" ? true : SAAS_CONFIG.corsOrigin,
      credentials: true,
    })
  );
  router.use(express.json({ limit: "10mb" }));
  router.use(express.urlencoded({ extended: true }));
  router.use(apiRateLimit);
  router.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  router.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "gymos-saas-api",
      timestamp: new Date().toISOString(),
    });
  });

  router.use("/auth", authRateLimit, authRouter);
  router.use("/gyms", gymRouter);
  router.use("/dashboard", dashboardRouter);
  router.use("/members", membersRouter);
  router.use("/memberships", membershipsRouter);
  router.use("/coaches", coachesRouter);
  router.use("/attendance", attendanceRouter);
  router.use("/payments", paymentsRouter);
  router.use("/reports", reportsRouter);
  router.use("/super-admin", superAdminRouter);
  router.use("/member-portal", memberPortalRouter);
  router.use("/progress", progressRouter);
  router.use("/plans", plansRouter);

  router.post(
    "/uploads/member-photo",
    requireAuth,
    resolveTenant,
    requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.RECEPTIONIST),
    upload.single("photo"),
    (req: any, res: any) => {
      if (!req.file) {
        return res.status(400).json({ message: "Photo file is required." });
      }
      return res.status(201).json({
        photoUrl: `/uploads/member-photos/${req.file.filename}`,
      });
    }
  );

  // Error handler
  router.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ message: error.message });
    }
    if (error instanceof Error && error.message === "Only image uploads are allowed.") {
      return res.status(400).json({ message: error.message });
    }
    console.error("[SaaS API Error]", error);
    return res.status(500).json({ message: "Internal server error" });
  });

  return router;
}
