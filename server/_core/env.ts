export const ENV = {
  authJwtSecret: process.env.AUTH_JWT_SECRET ?? "",
  sessionJwtSecret: process.env.SESSION_JWT_SECRET ?? process.env.JWT_SECRET ?? "",
  mongoUri: process.env.MONGODB_URI ?? "",
  mongoDb: process.env.MONGODB_DB ?? "",
  ownerAuthId: process.env.OWNER_AUTH_ID ?? "",
  devLoginEmail: process.env.DEV_LOGIN_EMAIL ?? "",
  devLoginName: process.env.DEV_LOGIN_NAME ?? "",
  devLoginRole: (
    process.env.DEV_LOGIN_ROLE === "user" ? "user" : "admin"
  ) as "user" | "admin",
  isProduction: process.env.NODE_ENV === "production",
  platformApiUrl: process.env.PLATFORM_API_URL ?? "",
  platformApiKey: process.env.PLATFORM_API_KEY ?? "",
  mapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
  mapsProxyUrl: process.env.MAPS_PROXY_URL ?? "",
  rapidApiKey: process.env.RAPIDAPI_KEY ?? "",
  exerciseDbApiHost: process.env.EXERCISEDB_API_HOST ?? "exercisedb.p.rapidapi.com",
  youtubeApiHost:
    process.env.YOUTUBE_SEARCH_API_HOST ??
    "youtube-search-and-download.p.rapidapi.com",
  freeExerciseDbUrl:
    process.env.FREE_EXERCISE_DB_URL ??
    "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json",
  freeExerciseImageBaseUrl:
    process.env.FREE_EXERCISE_IMAGE_BASE_URL ??
    "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/",
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramDefaultChatId: process.env.TELEGRAM_DEFAULT_CHAT_ID ?? "",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? "587"),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "",
};
