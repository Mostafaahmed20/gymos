import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@gymos.com",
    name: "Admin User",
    loginMethod: "external",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@gymos.com",
    name: "Regular User",
    loginMethod: "external",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("auth", () => {
  it("me returns null for unauthenticated context", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("me returns user for authenticated context", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.role).toBe("admin");
  });

  it("logout clears cookie and returns success", async () => {
    const clearedCookies: string[] = [];
    const ctx = createAdminContext();
    ctx.res.clearCookie = (name: string) => { clearedCookies.push(name); };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBeGreaterThan(0);
  });
});

describe("role-based access", () => {
  it("admin can access dashboard stats", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    // Should not throw FORBIDDEN
    await expect(caller.dashboard.stats()).resolves.toBeDefined();
  });

  it("regular user cannot access admin dashboard", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dashboard.stats()).rejects.toThrow();
  });

  it("regular user can access userPortal profile", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    // Should not throw FORBIDDEN (returns null if no trainee profile)
    await expect(caller.userPortal.profile()).resolves.toBeNull();
  });

  it("regular user cannot read arbitrary trainee details", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.trainees.get({ id: 1 })).rejects.toThrow();
  });

  it("regular user cannot read another trainee subscriptions", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.subscriptions.getByTrainee({ traineeId: 1 })).rejects.toThrow();
  });

  it("regular user cannot access workouts management list", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.workouts.list({ isArchived: false })).rejects.toThrow();
  });
});

describe("userPortal", () => {
  it("subscription returns null for user with no trainee profile", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.userPortal.subscription();
    expect(result).toBeNull();
  });

  it("todayWorkout returns null for user with no trainee profile", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.userPortal.todayWorkout();
    expect(result).toBeNull();
  });

  it("progress returns empty array for user with no trainee profile", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.userPortal.progress();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(0);
  });

  it("attendance returns empty for user with no trainee profile", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.userPortal.attendance({});
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });
});
