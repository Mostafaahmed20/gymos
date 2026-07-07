import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { SAAS_CONFIG } from "../config";
import type { AccessTokenPayload, RefreshTokenPayload } from "../types";

export function createAccessToken(payload: Omit<AccessTokenPayload, "type">) {
  return jwt.sign(
    {
      ...payload,
      type: "access",
    },
    SAAS_CONFIG.jwtAccessSecret,
    { expiresIn: `${SAAS_CONFIG.accessTokenMinutes}m` }
  );
}

export function createRefreshToken(payload: Omit<RefreshTokenPayload, "type">) {
  return jwt.sign(
    {
      ...payload,
      type: "refresh",
    },
    SAAS_CONFIG.jwtRefreshSecret,
    { expiresIn: `${SAAS_CONFIG.refreshTokenDays}d` }
  );
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, SAAS_CONFIG.jwtAccessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, SAAS_CONFIG.jwtRefreshSecret) as RefreshTokenPayload;
}

export function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
