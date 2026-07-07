import type { UserRole } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

export function requireRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = req.authUser?.role;
    if (!role) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(role)) {
      return res.status(403).json({ message: "Insufficient role permissions" });
    }
    return next();
  };
}
