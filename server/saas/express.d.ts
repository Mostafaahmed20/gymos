import type { AuthUser } from "./types";
import type { Db } from "mongodb";

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
      gymId?: string;
      tenantDatabase?: Db;
      tenantDatabaseName?: string;
    }
  }
}

export {};
