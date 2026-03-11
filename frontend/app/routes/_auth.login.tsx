import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import * as React from "react";
import { Link, useSearchParams } from "react-router";
import { z } from "zod";

import { AuthLayout } from "~/components/auth/auth-layout";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authApi } from "~/lib/auth-api";
import { useAuthStore } from "~/stores/auth.store";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type MetaArgs = Record<string, unknown>;

export function meta({}: MetaArgs) {
  return [
    { title: "Sign in | FlowBoard" },
    { name: "description", content: "Sign in to your account" },
  ];
}

/** Allow redirect only to same-origin paths (no protocol/host). */
function getSafeRedirect(redirect: string | null): string {
  if (!redirect || typeof redirect !== "string") return "/dashboard";
  const trimmed = redirect.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/dashboard";
  return trimmed;
}

export default function Login() {
  const [searchParams] = useSearchParams();
  const redirectTo = getSafeRedirect(searchParams.get("redirect"));
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: {
      onChange: ({ value }) =>
        zodValidator().validate({ value }, loginSchema),
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        const { data } = await authApi.login({
          email: value.email,
          password: value.password,
        });
        setAccessToken(data.accessToken);
        window.location.replace(redirectTo);
      } catch (err: unknown) {
        const res =
          err &&
          typeof err === "object" &&
          "response" in err
            ? (err as { response?: { status?: number; data?: { message?: string } } })
                .response
            : undefined;
        const status = res?.status;
        const message = res?.data?.message;
        if (status === 401) {
          setSubmitError(
            message && typeof message === "string"
              ? message
              : "Invalid email or password"
          );
        } else {
          setSubmitError("Something went wrong. Please try again.");
        }
      }
    },
  });

  return (
    <AuthLayout headline="Where teams move fast.">
      <p
        className="mt-1 font-medium uppercase text-[#666666]"
        style={{ fontSize: "0.75rem", letterSpacing: "0.06em" }}
      >
        Welcome back
      </p>
      <h2
        className="mt-1 text-[#ffffff]"
        style={{
          fontWeight: 500,
          fontSize: "1.75rem",
          letterSpacing: "-0.01em",
        }}
      >
        Sign in to FlowBoard
      </h2>
      <div className="mt-4 h-px w-full bg-[#1f1f1f]" />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="mt-8 space-y-6"
      >
        <form.Field name="email">
          {(field) => (
            <div className="space-y-2">
              <Label
                htmlFor="login-email"
                className="font-medium text-[#aaaaaa]"
                style={{ fontSize: "0.8125rem", letterSpacing: "0" }}
              >
                Email
              </Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@company.com"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="email"
                className="h-10 rounded-md border-[#1f1f1f] bg-[#111111] text-[#ededed] placeholder:text-[#444444] focus-visible:border-[#444444] focus-visible:ring-[#444444]"
                aria-invalid={!!field.state.meta.errors?.length}
              />
              {field.state.meta.errors?.[0] != null ? (
                <p className="flex items-center gap-2 text-xs text-red-500">
                  <span className="size-1 rounded-full bg-red-500" />
                  {String(field.state.meta.errors[0])}
                </p>
              ) : null}
            </div>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="login-password"
                  className="font-medium text-[#aaaaaa]"
                  style={{ fontSize: "0.8125rem", letterSpacing: "0" }}
                >
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#666666] underline underline-offset-2 hover:text-[#ededed]"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="login-password"
                type="password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="current-password"
                className="h-10 rounded-md border-[#1f1f1f] bg-[#111111] text-[#ededed] placeholder:text-[#444444] focus-visible:border-[#444444] focus-visible:ring-[#444444]"
                aria-invalid={
                  !!field.state.meta.errors?.length || !!submitError
                }
              />
              {field.state.meta.errors?.[0] != null ? (
                <p className="flex items-center gap-2 text-xs text-red-500">
                  <span className="size-1 rounded-full bg-red-500" />
                  {String(field.state.meta.errors[0])}
                </p>
              ) : submitError ? (
                <p className="flex items-center gap-2 text-xs text-red-500">
                  <span className="size-1 rounded-full bg-red-500" />
                  {submitError}
                </p>
              ) : null}
            </div>
          )}
        </form.Field>

        <Button
          type="submit"
          disabled={form.state.isSubmitting}
          className="h-10 w-full rounded-md border-0 bg-[#ffffff] font-medium text-black hover:bg-[#e0e0e0]"
          style={{ fontSize: "0.875rem", letterSpacing: "0" }}
        >
          {form.state.isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="size-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Signing in…
            </span>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p
        className="mt-6 text-center text-[#666666]"
        style={{ fontSize: "0.8125rem" }}
      >
        Don&apos;t have an account?{" "}
        <Link
          to="/register"
          className="font-medium text-[#ffffff] underline underline-offset-4 hover:text-white"
        >
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}
