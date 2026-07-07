import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../db";
import * as db from "../db";
import { ENV } from "./env";

type SessionPayload = {
  userId: number;
  role: "user" | "admin";
  name?: string | null;
  email?: string | null;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const getSessionSecret = () => {
  if (!ENV.sessionJwtSecret) {
    throw new Error("SESSION_JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(ENV.sessionJwtSecret);
};

function parseCookies(cookieHeader: string | undefined) {
  if (!cookieHeader) {
    return new Map<string, string>();
  }

  const parsed = parseCookieHeader(cookieHeader);
  return new Map(Object.entries(parsed));
}

export async function createSessionToken(
  payload: SessionPayload,
  options: { expiresInMs?: number } = {}
): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
  const secretKey = getSessionSecret();

  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
    name: payload.name ?? "",
    email: payload.email ?? "",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

export async function verifySession(
  cookieValue: string | undefined | null
): Promise<SessionPayload | null> {
  if (!cookieValue) {
    return null;
  }

  try {
    const secretKey = getSessionSecret();
    const { payload } = await jwtVerify(cookieValue, secretKey, {
      algorithms: ["HS256"],
    });

    const { userId, role, name, email } = payload as Record<string, unknown>;

    if (
      typeof userId !== "number" ||
      !isNonEmptyString(role) ||
      (role !== "user" && role !== "admin")
    ) {
      return null;
    }

    return {
      userId,
      role,
      name: typeof name === "string" ? name : null,
      email: typeof email === "string" ? email : null,
    };
  } catch (error) {
    console.warn("[Auth] Session verification failed", String(error));
    return null;
  }
}

export async function authenticateRequest(req: Request): Promise<User> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = cookies.get(COOKIE_NAME);
  const session = await verifySession(sessionCookie);

  if (!session) {
    throw ForbiddenError("Invalid session cookie");
  }

  const user = await db.getUserById(session.userId);
  if (!user) {
    throw ForbiddenError("User not found");
  }

  await db.touchUserLastSignedIn(user.id);
  return user;
}
