import cors from "cors";
import express from "express";
import helmet from "helmet";
import multer from "multer";
import { ZodError } from "zod";
import { SAAS_CONFIG } from "./config";
import { apiRateLimit, authRateLimit } from "./middleware/rate-limit";
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

export function createSaasApp() {
  const app = express();
  const upload = multer({ storage: multer.memoryStorage() });

  app.use(helmet());
  app.use(
    cors({
      origin: SAAS_CONFIG.corsOrigin === "*" ? true : SAAS_CONFIG.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(apiRateLimit);

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

  app.post("/api/v1/uploads/member-photo", upload.single("photo"), (_req, res) => {
    // Stub endpoint for Railway object storage integration.
    res.status(501).json({ message: "Upload storage integration not configured yet." });
  });

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

    console.error("[SaaS API Error]", error);
    return res.status(500).json({ message: "Internal server error" });
  });

  return app;
}
