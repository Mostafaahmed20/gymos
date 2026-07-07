import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/tokens";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.authUser = {
      userId: payload.sub,
      gymId: payload.gymId,
      role: payload.role,
      email: payload.email,
    };
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}
