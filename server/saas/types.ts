import type { UserRole } from "@prisma/client";

export type AuthUser = {
  userId: string;
  gymId: string | null;
  role: UserRole;
  email: string;
};

export type AccessTokenPayload = {
  sub: string;
  gymId: string | null;
  role: UserRole;
  email: string;
  type: "access";
};

export type RefreshTokenPayload = {
  sub: string;
  gymId: string | null;
  type: "refresh";
};
