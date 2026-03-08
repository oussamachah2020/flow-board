import axios from "axios";
import { useAuthStore } from "~/stores/auth.store";

export function getApiBaseURL(): string {
  const env = import.meta.env.VITE_API_URL;
  if (env && typeof env === "string") return env;
  if (import.meta.env.DEV) {
    return "http://localhost:3000/v1/api";
  }
  return "";
}

export const api = axios.create({
  baseURL: getApiBaseURL(),
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await api.post<{ accessToken: string }>(
          "/auth/refresh",
          {},
          { withCredentials: true }
        );
        useAuthStore.getState().setAccessToken(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        useAuthStore.getState().clearAuth();
        window.location.href = "/login";
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);
