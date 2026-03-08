/** Cookie where we persist the access token (for reload). Refresh token is in an httpOnly cookie set by the backend. */
const ACCESS_TOKEN_COOKIE = "flowboard_access_token";

function isBrowser(): boolean {
  return typeof document !== "undefined";
}

export function getAccessTokenFromCookie(): string | null {
  if (!isBrowser()) return null;
  const match = document.cookie.match(
    new RegExp("(?:^|;\\s*)" + encodeURIComponent(ACCESS_TOKEN_COOKIE) + "=([^;]*)")
  );
  const value = match?.[1];
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function setAccessTokenCookie(token: string): void {
  if (!isBrowser()) return;
  const maxAge = 7 * 24 * 60 * 60; // 7 days; actual expiry is in the JWT
  const secure = import.meta.env.PROD ? "; Secure" : "";
  document.cookie =
    encodeURIComponent(ACCESS_TOKEN_COOKIE) +
    "=" +
    encodeURIComponent(token) +
    "; path=/; max-age=" +
    maxAge +
    "; SameSite=Lax" +
    secure;
}

export function clearAccessTokenCookie(): void {
  if (!isBrowser()) return;
  const secure = import.meta.env.PROD ? "; Secure" : "";
  document.cookie =
    encodeURIComponent(ACCESS_TOKEN_COOKIE) +
    "=; path=/; max-age=0; SameSite=Lax" +
    secure;
}
