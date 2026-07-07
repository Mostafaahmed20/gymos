import "dotenv/config";

function toNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const SAAS_CONFIG = {
  port: toNumber(process.env.SAAS_PORT, 4000),
  appBaseDomain: process.env.APP_BASE_DOMAIN ?? "platform.com",
  databaseUrl: process.env.DATABASE_URL ?? "",
  mongoTenantUri: process.env.SAAS_MONGODB_URI ?? process.env.MONGODB_URI ?? "",
  mongoPlatformDatabase: process.env.SAAS_PLATFORM_DB ?? "gymos_platform",
  mongoTenantDatabasePrefix: process.env.SAAS_TENANT_DB_PREFIX ?? "gymos",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? "change-me-access-secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? "change-me-refresh-secret",
  accessTokenMinutes: toNumber(process.env.JWT_ACCESS_MINUTES, 30),
  refreshTokenDays: toNumber(process.env.JWT_REFRESH_DAYS, 30),
  bcryptRounds: toNumber(process.env.BCRYPT_ROUNDS, 10),
  trialDays: toNumber(process.env.TRIAL_DAYS, 30),
  basicMemberLimit: toNumber(process.env.BASIC_MEMBER_LIMIT, 100),
  corsOrigin: process.env.SAAS_CORS_ORIGIN ?? "*",
};

export const isSaasConfigValid = Boolean(
  SAAS_CONFIG.databaseUrl &&
    SAAS_CONFIG.jwtAccessSecret &&
    SAAS_CONFIG.jwtRefreshSecret
);
