/** Auth API types aligned with backend */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterResponse {
  message: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export type Theme = "light" | "dark";

export interface Profile {
  id: string;
  name: string;
  bio: string;
  imageUrl: string;
  theme: Theme;
  emailNotifications: boolean;
  timezone: string;
  lastSeenAt: string | null;
  createdAt: string;
  updatedAt: string;
}
