import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  VerifyEmailRequest,
  ResendVerificationRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  Profile,
} from "~/types/auth";
import { api } from "~/lib/axios";

const AUTH = "/auth";
const USERS = "/users";

export const authApi = {
  login(body: LoginRequest) {
    return api.post<LoginResponse>(`${AUTH}/login`, body);
  },

  register(body: RegisterRequest) {
    return api.post<RegisterResponse>(`${AUTH}/register`, body);
  },

  refresh() {
    return api.post<LoginResponse>(`${AUTH}/refresh`, {});
  },

  verifyEmail(body: VerifyEmailRequest) {
    return api.post(`${AUTH}/verify-email`, body);
  },

  resendVerification(body: ResendVerificationRequest) {
    return api.post(`${AUTH}/resend-verification`, body);
  },

  forgotPassword(body: ForgotPasswordRequest) {
    return api.post(`${AUTH}/forgot-password`, body);
  },

  resetPassword(body: ResetPasswordRequest) {
    return api.post(`${AUTH}/reset-password`, body);
  },

  logout() {
    return api.post(`${AUTH}/logout`);
  },

  getProfile() {
    return api.get<Profile>(`${USERS}/profile`);
  },

  getMe() {
    return api.get<{
      id: string;
      email: string;
      profile: { id: string; name: string; theme: string };
    }>(`${AUTH}/me`);
  },

  updateTheme(theme: "light" | "dark") {
    return api.patch<{ theme: string }>(`${AUTH}/me/theme`, { theme });
  },
};
