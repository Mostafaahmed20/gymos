import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { jwtVerify, SignJWT } from "jose";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { verifyPassword } from "./password";
import { createSessionToken } from "./authService";
import { ENV } from "./env";

type ExternalAuthPayload = {
  sub?: string;
  userId?: string;
  openId?: string;
  email?: string;
  name?: string;
  role?: "user" | "admin";
  loginMethod?: string;
};

function resolveRole(value: string | undefined): "user" | "admin" | undefined {
  if (value === "user" || value === "admin") return value;
  return undefined;
}

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function getBodyParam(req: Request, key: string): string | undefined {
  const body = req.body as Record<string, unknown> | undefined;
  const value = body?.[key];
  return typeof value === "string" ? value : undefined;
}

async function verifyExternalToken(token: string): Promise<ExternalAuthPayload> {
  if (!ENV.authJwtSecret) {
    throw new Error("AUTH_JWT_SECRET is not configured");
  }

  const secretKey = new TextEncoder().encode(ENV.authJwtSecret);
  const { payload } = await jwtVerify(token, secretKey, {
    algorithms: ["HS256"],
  });

  return payload as ExternalAuthPayload;
}

function resolveExternalId(payload: ExternalAuthPayload): string | null {
  return payload.sub || payload.userId || payload.openId || null;
}

function renderLocalCredentialsLoginForm(errorMessage?: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GymOS Login</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; background: #f5f7fb; color: #111827; }
      .card { max-width: 460px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; }
      h1 { margin: 0 0 10px; font-size: 20px; }
      p { margin: 0 0 16px; color: #4b5563; font-size: 14px; }
      label { display: block; font-size: 13px; margin: 12px 0 6px; color: #374151; }
      input, button { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 14px; }
      button { margin-top: 14px; background: #111827; color: #fff; border: 0; cursor: pointer; }
      .error { margin-top: 10px; font-size: 12px; color: #b91c1c; }
      .hint { margin-top: 10px; font-size: 12px; color: #6b7280; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>GymOS Login</h1>
      <p>Sign in with the email and password created by your admin.</p>
      <form method="POST" action="/api/auth/local-login">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" required placeholder="member@example.com" />

        <label for="password">Password</label>
        <input id="password" name="password" type="password" required placeholder="Enter your password" />

        <button type="submit">Sign in</button>
      </form>
      ${errorMessage ? `<div class="error">${errorMessage}</div>` : ""}
      <div class="hint">If you don't have credentials yet, ask your admin to create them.</div>
    </div>
  </body>
</html>`;
}

export function registerAuthRoutes(app: Express) {
  app.get("/local-login", (req: Request, res: Response) => {
    const error = getQueryParam(req, "error");
    const errorMessage =
      error === "invalid"
        ? "Invalid email or password."
        : error === "missing"
          ? "Email and password are required."
          : undefined;
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.status(200).send(renderLocalCredentialsLoginForm(errorMessage));
  });

  app.post("/api/auth/local-login", async (req: Request, res: Response) => {
    const email = getBodyParam(req, "email");
    const password = getBodyParam(req, "password");
    if (!email || !password) {
      res.redirect(302, "/local-login?error=missing");
      return;
    }

    try {
      const localAuth = await db.getLocalAuthUserByEmail(email);
      if (!localAuth || !verifyPassword(password, localAuth.passwordHash)) {
        res.redirect(302, "/local-login?error=invalid");
        return;
      }

      const sessionToken = await createSessionToken(
        {
          userId: localAuth.user.id,
          role: localAuth.user.role,
          name: localAuth.user.name ?? null,
          email: localAuth.user.email ?? null,
        },
        { expiresInMs: ONE_YEAR_MS }
      );

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.redirect(302, localAuth.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (error) {
      console.error("[Auth] Local login failed", error);
      res.redirect(302, "/local-login?error=invalid");
    }
  });

  // Dev helper: generates a short-lived auth token and forwards to callback.
  app.get("/mock-login", async (req: Request, res: Response) => {
    if (ENV.isProduction) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (!ENV.authJwtSecret) {
      res.status(500).json({ error: "AUTH_JWT_SECRET is not configured" });
      return;
    }

    const manual = getQueryParam(req, "manual") === "1";
    const requestedEmail = getQueryParam(req, "email");
    const email = requestedEmail ?? (!manual ? ENV.devLoginEmail : undefined);
    const name =
      getQueryParam(req, "name") ??
      (ENV.devLoginName || undefined);
    const role = resolveRole(getQueryParam(req, "role"));

    // If no identity is configured, show a tiny local login form.
    if (!email) {
      res.setHeader("content-type", "text/html; charset=utf-8");
      res.status(200).send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Local Login</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; background: #f5f7fb; color: #111827; }
      .card { max-width: 460px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; }
      h1 { margin: 0 0 10px; font-size: 20px; }
      p { margin: 0 0 16px; color: #4b5563; font-size: 14px; }
      label { display: block; font-size: 13px; margin: 12px 0 6px; color: #374151; }
      input, select, button { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 14px; }
      button { margin-top: 14px; background: #111827; color: #fff; border: 0; cursor: pointer; }
      .hint { margin-top: 10px; font-size: 12px; color: #6b7280; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Local Sign In</h1>
      <p>Create or sign in as any local user for development.</p>
      <form method="GET" action="/mock-login">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" required placeholder="user@example.com" />

        <label for="name">Name</label>
        <input id="name" name="name" type="text" placeholder="Your name" />

        <label for="role">Role</label>
        <select id="role" name="role">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>

        <button type="submit">Continue</button>
      </form>
      <div class="hint">Tip: same email signs you back into the same account.</div>
    </div>
  </body>
</html>`);
      return;
    }

    try {
      const secret = new TextEncoder().encode(ENV.authJwtSecret);
      const externalId = `local:${email.toLowerCase()}`;
      const tokenPayload: ExternalAuthPayload = {
        sub: externalId,
        email,
        name: name || email.split("@")[0] || "Local User",
        loginMethod: "local",
      };
      if (role) tokenPayload.role = role;

      const token = await new SignJWT(tokenPayload)
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setExpirationTime("15m")
        .sign(secret);

      res.redirect(302, `/api/auth/callback?token=${encodeURIComponent(token)}`);
    } catch (error) {
      console.error("[Auth] Mock login failed", error);
      res.status(500).json({ error: "Mock login failed" });
    }
  });

  app.get("/api/auth/callback", async (req: Request, res: Response) => {
    const token = getQueryParam(req, "token");

    if (!token) {
      res.status(400).json({ error: "token is required" });
      return;
    }

    try {
      const payload = await verifyExternalToken(token);
      const externalId = resolveExternalId(payload);

      if (!externalId) {
        res.status(400).json({ error: "external user id missing from token" });
        return;
      }

      const existingUser = await db.getUserByOpenId(externalId);
      const tokenRole = resolveRole(payload.role);
      const isOwner = Boolean(ENV.ownerAuthId && externalId === ENV.ownerAuthId);
      const isDefaultDevIdentity = Boolean(
        payload.loginMethod === "local" &&
          ENV.devLoginEmail &&
          payload.email?.toLowerCase() === ENV.devLoginEmail.toLowerCase()
      );
      const canOverrideWithLocalRole =
        payload.loginMethod === "local" && Boolean(tokenRole) && !isOwner;
      const bootstrapRole = isOwner
        ? "admin"
        : isDefaultDevIdentity
          ? ENV.devLoginRole
          : "user";
      const role = canOverrideWithLocalRole
        ? (tokenRole as "user" | "admin")
        : existingUser?.role ?? tokenRole ?? bootstrapRole;

      const user = await db.upsertUser({
        openId: externalId,
        name: payload.name ?? null,
        email: payload.email ?? null,
        loginMethod: payload.loginMethod ?? "external",
        role,
        lastSignedIn: new Date(),
      });

      const sessionToken = await createSessionToken(
        {
          userId: user.id,
          role: user.role,
          name: user.name ?? null,
          email: user.email ?? null,
        },
        { expiresInMs: ONE_YEAR_MS }
      );

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.redirect(302, user.role === "admin" ? "/admin" : "/dashboard");
    } catch (error) {
      console.error("[Auth] Callback failed", error);
      res.status(500).json({ error: "Auth callback failed" });
    }
  });
}
