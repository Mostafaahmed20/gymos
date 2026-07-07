import "dotenv/config";
import { createServer } from "http";
import { SAAS_CONFIG, isSaasConfigValid } from "./config";
import { createSaasApp } from "./app";

async function start() {
  if (!isSaasConfigValid) {
    console.warn(
      "[SaaS API] Missing required env values. Set DATABASE_URL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET."
    );
  }

  const app = createSaasApp();
  const server = createServer(app);

  server.listen(SAAS_CONFIG.port, () => {
    console.log(`[SaaS API] running on http://localhost:${SAAS_CONFIG.port}`);
  });
}

start().catch((error) => {
  console.error("[SaaS API] failed to start", error);
  process.exit(1);
});
