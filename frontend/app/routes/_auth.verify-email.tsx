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

const resendSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type MetaArgs = Record<string, unknown>;

export function meta({}: MetaArgs) {
  return [
    { title: "Verify email | FlowBoard" },
    { name: "description", content: "Verify your email address" },
  ];
}

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [verified, setVerified] = React.useState<boolean | null>(null);
  const [resendSuccess, setResendSuccess] = React.useState(false);

  React.useEffect(() => {
    if (!token) return;
    let cancelled = false;
    authApi
      .verifyEmail({ token })
      .then(() => {
        if (!cancelled) setVerified(true);
      })
      .catch(() => {
        if (!cancelled) setVerified(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const form = useForm({
    defaultValues: { email: "" },
    validators: {
      onChange: ({ value }) =>
        zodValidator().validate({ value }, resendSchema),
    },
    onSubmit: async ({ value }) => {
      try {
        await authApi.resendVerification({ email: value.email });
        setResendSuccess(true);
        toast.success("Verification email sent.");
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
    },
  });

  if (token && verified === true) {
    return (
      <AuthLayout headline="Built for teams that ship.">
        <p
          className="mt-1 font-medium uppercase text-[#666666]"
          style={{ fontSize: "0.75rem", letterSpacing: "0.06em" }}
        >
          Verified
        </p>
        <h2
          className="mt-1 text-[#ffffff]"
          style={{
            fontWeight: 500,
            fontSize: "1.75rem",
            letterSpacing: "-0.01em",
          }}
        >
          Email verified
        </h2>
        <div className="mt-4 h-px w-full bg-[#1f1f1f]" />
        <p
          className="mt-8 text-[#888888]"
          style={{ fontSize: "0.875rem", lineHeight: 1.6 }}
        >
          Your email has been verified. You can sign in to your account.
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

  if (token && verified === false) {
    return (
      <AuthLayout headline="Built for teams that ship.">
        <p
          className="mt-1 font-medium uppercase text-[#666666]"
          style={{ fontSize: "0.75rem", letterSpacing: "0.06em" }}
        >
          Verification failed
        </p>
        <h2
          className="mt-1 text-[#ffffff]"
          style={{
            fontWeight: 500,
            fontSize: "1.75rem",
            letterSpacing: "-0.01em",
          }}
        >
          Link invalid or expired
        </h2>
        <div className="mt-4 h-px w-full bg-[#1f1f1f]" />
        <p
          className="mt-8 text-[#888888]"
          style={{ fontSize: "0.875rem", lineHeight: 1.6 }}
        >
          This verification link is invalid or has expired. Request a new one
          below.
        </p>
        <Link
          to="/verify-email"
          className="mt-8 inline-block font-medium text-[#ffffff] underline underline-offset-4 hover:text-white"
          style={{ fontSize: "0.875rem" }}
        >
          Resend verification email
        </Link>
      </AuthLayout>
    );
  }

  if (resendSuccess) {
    return (
      <AuthLayout headline="Built for teams that ship.">
        <p
          className="mt-1 font-medium uppercase text-[#666666]"
          style={{ fontSize: "0.75rem", letterSpacing: "0.06em" }}
        >
          Check your email
        </p>
        <h2
          className="mt-1 text-[#ffffff]"
          style={{
            fontWeight: 500,
            fontSize: "1.75rem",
            letterSpacing: "-0.01em",
          }}
        >
          Verification email sent
        </h2>
        <div className="mt-4 h-px w-full bg-[#1f1f1f]" />
        <p
          className="mt-8 text-[#888888]"
          style={{ fontSize: "0.875rem", lineHeight: 1.6 }}
        >
          We sent a verification link to your email. Check your inbox and spam
          folder.
        </p>
        <Link
          to="/login"
          className="mt-8 inline-block font-medium text-[#ffffff] underline underline-offset-4 hover:text-white"
          style={{ fontSize: "0.875rem" }}
        >
          Back to sign in
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout headline="Built for teams that ship.">
      <p
        className="mt-1 font-medium uppercase text-[#666666]"
        style={{ fontSize: "0.75rem", letterSpacing: "0.06em" }}
      >
        Check your inbox
      </p>
      <h2
        className="mt-1 text-[#ffffff]"
        style={{
          fontWeight: 500,
          fontSize: "1.75rem",
          letterSpacing: "-0.01em",
        }}
      >
        Verify your email
      </h2>
      <div className="mt-4 h-px w-full bg-[#1f1f1f]" />

      <p
        className="mt-8 text-[#888888]"
        style={{ fontSize: "0.875rem", lineHeight: 1.6 }}
      >
        We sent a verification link to your email. Click the link to verify your
        account.
      </p>

      <div className="mt-8 border-t border-[#1f1f1f] pt-8">
        <p
          className="mb-4 font-medium text-[#aaaaaa]"
          style={{ fontSize: "0.8125rem", letterSpacing: "0.01em" }}
        >
          Didn&apos;t receive the email?
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
        >
          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label
                  htmlFor="verify-email"
                  className="font-medium text-[#aaaaaa]"
                  style={{ fontSize: "0.8125rem", letterSpacing: "0.01em" }}
                >
                  Email
                </Label>
                <Input
                  id="verify-email"
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
                Sending…
              </span>
            ) : (
              "Resend verification email"
            )}
          </Button>
        </form>
      </div>

      <p
        className="mt-6 text-center text-[#666666]"
        style={{ fontSize: "0.8125rem" }}
      >
        Already verified?{" "}
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
