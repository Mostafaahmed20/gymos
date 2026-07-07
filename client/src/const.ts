export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const loginUrl = import.meta.env.VITE_AUTH_LOGIN_URL;
  if (!loginUrl) {
    throw new Error("VITE_AUTH_LOGIN_URL is not configured");
  }

  const redirectUri = `${window.location.origin}/api/auth/callback`;
  const url = new URL(loginUrl);
  url.searchParams.set("redirectUri", redirectUri);
  return url.toString();
};
