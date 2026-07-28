import cors from "cors";
import crypto from "crypto";
import express from "express";
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

export function createSaasApp() {
  const app = express();
  const uploadDir = path.join(process.cwd(), "uploads", "member-photos");
  fs.mkdirSync(uploadDir, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadDir),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
        cb(null, `${req.gymId}-${Date.now()}-${crypto.randomUUID()}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith("image/")) {
        cb(new Error("Only image uploads are allowed."));
        return;
      }
      cb(null, true);
    },
  });

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: SAAS_CONFIG.corsOrigin === "*" ? true : SAAS_CONFIG.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(apiRateLimit);
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  app.get("/api/v1/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "gymos-saas-api",
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/v1/auth", authRateLimit, authRouter);
  app.use("/api/v1/gyms", gymRouter);
  app.use("/api/v1/dashboard", dashboardRouter);
  app.use("/api/v1/members", membersRouter);
  app.use("/api/v1/memberships", membershipsRouter);
  app.use("/api/v1/coaches", coachesRouter);
  app.use("/api/v1/attendance", attendanceRouter);
  app.use("/api/v1/payments", paymentsRouter);
  app.use("/api/v1/reports", reportsRouter);
  app.use("/api/v1/super-admin", superAdminRouter);
  app.use("/api/v1/member-portal", memberPortalRouter);

  app.post(
    "/api/v1/uploads/member-photo",
    requireAuth,
    resolveTenant,
    requireRoles(UserRole.OWNER, UserRole.MANAGER, UserRole.RECEPTIONIST),
    upload.single("photo"),
    (req, res) => {
      if (!req.file) {
        return res.status(400).json({ message: "Photo file is required." });
      }

      return res.status(201).json({
        photoUrl: `/uploads/member-photos/${req.file.filename}`,
      });
    }
  );

  app.use((req, res) => {
    res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
  });

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
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

  return app;
}
