// Always use /api/v1 as a relative path so it works on any host/port
// The VITE_SAAS_API_URL env var can override this for cross-origin deployments
export const SAAS_API_BASE: string =
  (import.meta.env.VITE_SAAS_API_URL as string | undefined) || "/api/v1";
