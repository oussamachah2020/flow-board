import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import * as React from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

import { AuthLayout } from "~/components/auth/auth-layout";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { authApi } from "~/lib/auth-api";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/\d/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type MetaArgs = Record<string, unknown>;

export function meta({}: MetaArgs) {
  return [
    { title: "Reset password | FlowBoard" },
    { name: "description", content: "Set a new password" },
  ];
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [success, setSuccess] = React.useState(false);

  const form = useForm({
    defaultValues: { password: "", confirmPassword: "" },
    validators: {
      onChange: ({ value }) =>
        zodValidator().validate({ value }, resetPasswordSchema),
    },
    onSubmit: async ({ value }) => {
      if (!token) {
        toast.error("Invalid or missing reset link.");
        return;
      }
      try {
        await authApi.resetPassword({
          token,
          password: value.password,
        });
        setSuccess(true);
        toast.success("Password updated. You can sign in now.");
      } catch {
        toast.error("Something went wrong. The link may have expired.");
      }
    },
  });

  if (success) {
    return (
      <AuthLayout headline="Where teams move fast.">
        <p
          className="mt-1 font-medium uppercase text-[#666666]"
          style={{ fontSize: "0.75rem", letterSpacing: "0.06em" }}
        >
          All set
        </p>
        <h2
          className="mt-1 text-[#ffffff]"
          style={{
            fontWeight: 500,
            fontSize: "1.75rem",
            letterSpacing: "-0.01em",
          }}
        >
          Password updated
        </h2>
        <div className="mt-4 h-px w-full bg-[#1f1f1f]" />
        <p
          className="mt-8 text-[#888888]"
          style={{ fontSize: "0.875rem", lineHeight: 1.6 }}
        >
          Your password has been reset. Sign in with your new password.
        </p>
        <Link
          to="/login"
          className="mt-8 inline-block font-medium text-[#ffffff] underline underline-offset-4 hover:text-white"
          style={{ fontSize: "0.875rem" }}
        >
          Sign in
        </Link>
      </AuthLayout>
    );
  }

  if (!token) {
    return (
      <AuthLayout headline="Where teams move fast.">
        <p
          className="mt-1 font-medium uppercase text-[#666666]"
          style={{ fontSize: "0.75rem", letterSpacing: "0.06em" }}
        >
          Invalid link
        </p>
        <h2
          className="mt-1 text-[#ffffff]"
          style={{
            fontWeight: 500,
            fontSize: "1.75rem",
            letterSpacing: "-0.01em",
          }}
        >
          Reset link missing or expired
        </h2>
        <div className="mt-4 h-px w-full bg-[#1f1f1f]" />
        <p
          className="mt-8 text-[#888888]"
          style={{ fontSize: "0.875rem", lineHeight: 1.6 }}
        >
          Request a new password reset link to try again.
        </p>
        <Link
          to="/forgot-password"
          className="mt-8 inline-block font-medium text-[#ffffff] underline underline-offset-4 hover:text-white"
          style={{ fontSize: "0.875rem" }}
        >
          Forgot password
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout headline="Where teams move fast.">
      <p
        className="mt-1 font-medium uppercase text-[#666666]"
        style={{ fontSize: "0.75rem", letterSpacing: "0.06em" }}
      >
        Set new password
      </p>
      <h2
        className="mt-1 text-[#ffffff]"
        style={{
          fontWeight: 500,
          fontSize: "1.75rem",
          letterSpacing: "-0.01em",
        }}
      >
        Reset your password
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
        <form.Field name="password">
          {(field) => (
            <div className="space-y-2">
              <Label
                htmlFor="reset-password"
                className="font-medium text-[#aaaaaa]"
                style={{ fontSize: "0.8125rem", letterSpacing: "0.01em" }}
              >
                New password
              </Label>
              <Input
                id="reset-password"
                type="password"
                placeholder="At least 8 characters, one number"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="new-password"
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

        <form.Field name="confirmPassword">
          {(field) => (
            <div className="space-y-2">
              <Label
                htmlFor="reset-confirm"
                className="font-medium text-[#aaaaaa]"
                style={{ fontSize: "0.8125rem", letterSpacing: "0.01em" }}
              >
                Confirm password
              </Label>
              <Input
                id="reset-confirm"
                type="password"
                placeholder="Repeat your password"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                autoComplete="new-password"
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

        <Button
          type="submit"
          disabled={form.state.isSubmitting}
          className="h-10 w-full rounded-md border-0 bg-[#ffffff] font-medium text-black hover:bg-[#e0e0e0]"
          style={{ fontSize: "0.875rem", letterSpacing: "0.01em" }}
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
              Updating…
            </span>
          ) : (
            "Update password"
          )}
        </Button>
      </form>

      <p
        className="mt-6 text-center text-[#666666]"
        style={{ fontSize: "0.8125rem" }}
      >
        Remember your password?{" "}
        <Link
          to="/login"
          className="font-medium text-[#ffffff] underline underline-offset-4 hover:text-white"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
