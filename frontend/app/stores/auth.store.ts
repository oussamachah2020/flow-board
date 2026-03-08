import { create } from "zustand";
import {
  getAccessTokenFromCookie,
  setAccessTokenCookie,
  clearAccessTokenCookie,
} from "~/lib/cookies";

/**
 * Auth store holds only the access token (for Authorization header).
 * The refresh token is set by the backend in an httpOnly cookie and sent
 * automatically with withCredentials; we never read or store it here.
 * We persist the access token in a cookie so the session survives page reloads.
 */
interface AuthStore {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  clearAuth: () => void;
}

function getInitialToken(): string | null {
  return getAccessTokenFromCookie();
}

export const useAuthStore = create<AuthStore>((set) => ({
  accessToken: getInitialToken(),
  setAccessToken: (token) => {
    if (token) {
      setAccessTokenCookie(token);
    } else {
      clearAccessTokenCookie();
    }
    set({ accessToken: token });
  },
  clearAuth: () => {
    clearAccessTokenCookie();
    set({ accessToken: null });
  },
}));
