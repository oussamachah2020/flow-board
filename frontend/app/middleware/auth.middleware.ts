import axios from "axios";
import { redirect } from "react-router";
import { getApiBaseURL } from "~/lib/axios";
import { useAuthStore } from "~/stores/auth.store";
const AUTH_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];
const PROTECTED_PATHS = ["/dashboard"];

function getPathname(url: string): string {
  try {
    return new URL(url, "http://localhost").pathname;
  } catch {
    return "/";
  }
}

/** Uses refresh token from httpOnly cookie (set by backend on login/refresh). */
export async function attemptRefresh(): Promise<string | null> {
  try {
    const { data } = await axios.post<{ accessToken: string }>(
      `${getApiBaseURL()}/auth/refresh`,
      {},
      { withCredentials: true }
    );
    return data.accessToken ?? null;
  } catch {
    return null;
  }
}

export async function authClientMiddleware(
  { request }: { request: Request },
  next: () => Promise<unknown>
): Promise<void> {
  const pathname = getPathname(request.url);
  const token = useAuthStore.getState().accessToken;

  // Authenticated user visiting auth pages -> redirect to dashboard or ?redirect=
  if (token && AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    const url = new URL(request.url);
    const redirectParam = url.searchParams.get("redirect");
    const safeRedirect =
      redirectParam?.trim().startsWith("/") && !redirectParam.trim().startsWith("//")
        ? redirectParam.trim()
        : "/dashboard";
    throw redirect(safeRedirect);
  }

  // Protected route without token -> try silent refresh
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (isProtected && !token) {
    const newToken = await attemptRefresh();
    if (newToken) {
      useAuthStore.getState().setAccessToken(newToken);
    } else {
      throw redirect("/login");
    }
  }

  await next();
}
