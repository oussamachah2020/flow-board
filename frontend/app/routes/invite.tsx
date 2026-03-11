// routes/invite.tsx
// Handles /invite?token=... — when authenticated, accepts the workspace invitation and redirects to the workspace; when not, prompts to sign in.

import * as React from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { AuthLayout } from "~/components/auth/auth-layout";
import { Button } from "~/components/ui/button";
import { workspaceApi } from "~/lib/workspace-api";
import { useAuthStore } from "~/stores/auth.store";
import { cn } from "~/lib/utils";

function FlowBoardLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative size-6 shrink-0" aria-hidden>
        <span
          className="absolute left-0 top-0 size-3.5 rounded-[2px] border border-[var(--border)]"
          style={{ transform: "translate(2px, 2px)" }}
        />
        <span
          className="absolute right-0 top-0 size-3.5 rounded-[2px] border border-[var(--border)]"
          style={{ transform: "translate(-2px, 2px)" }}
        />
      </div>
      <span className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text)]">
        FlowBoard
      </span>
    </div>
  );
}

export function meta() {
  return [
    { title: "Accept invitation | FlowBoard" },
    { name: "description", content: "Accept your workspace invitation" },
  ];
}

export default function InvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const navigate = useNavigate();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [status, setStatus] = React.useState<
    "idle" | "accepting" | "done" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const loginRedirectUrl = React.useMemo(() => {
    if (!token) return "/login";
    return `/login?redirect=${encodeURIComponent(`/invite?token=${token}`)}`;
  }, [token]);

  // When authenticated and we have a token, accept the invitation once
  React.useEffect(() => {
    if (!accessToken || !token) return;
    if (status !== "idle") return;

    let cancelled = false;
    setStatus("accepting");
    setErrorMessage(null);

    workspaceApi
      .acceptInvitation(token)
      .then((res) => {
        if (cancelled) return;
        setStatus("done");
        const workspace = res.data;
        navigate(`/workspaces/${workspace.id}`, { replace: true });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStatus("error");
        const msg =
          err &&
          typeof err === "object" &&
          "response" in err &&
          err.response &&
          typeof err.response === "object" &&
          "data" in err.response &&
          err.response.data &&
          typeof err.response.data === "object" &&
          "message" in err.response.data &&
          typeof (err.response.data as { message: unknown }).message === "string"
            ? (err.response.data as { message: string }).message
            : "This invitation could not be accepted. It may have expired or already been used.";
        setErrorMessage(msg);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, token, navigate, status]);

  // No token in URL — invalid invite link
  if (!token) {
    return (
      <AuthLayout headline="Where teams move fast.">
        <div className="flex flex-col items-center text-center">
          <div
            className="mb-4 flex size-12 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--text-subtle)]"
            aria-hidden
          >
            <svg
              className="size-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p
            className="text-sm font-medium tracking-tight text-[var(--text)]"
            style={{ letterSpacing: "-0.01em" }}
          >
            Invalid invitation link
          </p>
          <p className="mt-1.5 max-w-[280px] text-[13px] leading-relaxed text-[var(--text-muted)]">
            This link is missing an invitation token. Check your email for the
            correct link.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/login">Go to sign in</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  // Not authenticated — prompt to sign in (with redirect back to this URL)
  if (!accessToken) {
    return (
      <AuthLayout headline="Where teams move fast.">
        <div className="flex flex-col items-center text-center">
          <div
            className="mb-4 flex size-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]"
            aria-hidden
          >
            <svg
              className="size-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <p
            className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-subtle)]"
            style={{ letterSpacing: "0.08em" }}
          >
            You&apos;re invited
          </p>
          <h2
            className={cn(
              "mt-1 text-[var(--text)]",
              "text-xl font-semibold tracking-tight"
            )}
            style={{ letterSpacing: "-0.01em" }}
          >
            Sign in to join the workspace
          </h2>
          <p className="mt-2 max-w-[300px] text-[13px] leading-relaxed text-[var(--text-muted)]">
            Use the same email address the invitation was sent to. After signing
            in, you&apos;ll be added to the workspace.
          </p>
          <div className="mt-6 flex w-full flex-col gap-2">
            <Button asChild className="h-10 w-full rounded-md bg-[var(--accent)] font-medium text-[var(--primary-foreground)] hover:opacity-90">
              <Link to={loginRedirectUrl}>Sign in to accept</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="text-[var(--text-muted)]">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // Authenticated: accepting or error
  if (status === "accepting") {
    return (
      <AuthLayout headline="Where teams move fast.">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div
            className="mb-4 size-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]"
            aria-hidden
          />
          <p className="text-sm font-medium text-[var(--text)]">
            Accepting invitation…
          </p>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">
            You&apos;ll be redirected in a moment.
          </p>
        </div>
      </AuthLayout>
    );
  }

  if (status === "error" && errorMessage) {
    return (
      <AuthLayout headline="Where teams move fast.">
        <div className="flex flex-col items-center text-center">
          <div
            className="mb-4 flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-400"
            aria-hidden
          >
            <svg
              className="size-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--text)]">
            Couldn&apos;t accept invitation
          </p>
          <p className="mt-1.5 max-w-[280px] text-[13px] leading-relaxed text-[var(--text-muted)]">
            {errorMessage}
          </p>
          <div className="mt-6 flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/login">Sign in with different account</Link>
            </Button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // done (redirecting) or edge case — show same as accepting
  return (
    <AuthLayout headline="Where teams move fast.">
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div
          className="mb-4 size-8 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent)]"
          aria-hidden
        />
        <p className="text-sm font-medium text-[var(--text)]">
          Taking you to the workspace…
        </p>
      </div>
    </AuthLayout>
  );
}
