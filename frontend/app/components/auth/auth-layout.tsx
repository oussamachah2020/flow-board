import { Link } from "react-router";

const AUTH_BULLETS = [
  "Real-time collaboration across every board",
  "Smart filters that find your work instantly",
  "Full visibility into your team's workload",
] as const;

const TESTIMONIAL = "Trusted by 10,000+ teams worldwide";

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

export interface AuthLayoutProps {
  headline: string;
  children: React.ReactNode;
}

export function AuthLayout({ headline, children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-svh bg-[var(--bg)]">
      {/* Left panel — hidden on mobile */}
      <div
        className="hidden w-[40%] flex-col border-r border-[var(--border)] bg-[var(--bg)] p-8 md:flex"
        style={{
          backgroundImage: `
            linear-gradient(var(--surface) 1px, transparent 1px),
            linear-gradient(90deg, var(--surface) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      >
        <FlowBoardLogo />
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="text-[2.5rem] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--text)]">
            {headline}
          </h1>
          <ul className="mt-8 space-y-3">
            {AUTH_BULLETS.map((text) => (
              <li key={text} className="flex items-start gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--text-muted)]" />
                <span className="text-[14px] font-normal leading-[1.8] text-[var(--text-muted)]">
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[12px] text-[var(--text-subtle)]">
          {TESTIMONIAL}
        </p>
      </div>

      {/* Right panel */}
      <div className="flex w-full flex-1 items-center justify-center bg-[var(--bg-subtle)] px-4 py-12 md:w-[60%]">
        <div className="auth-form-container w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}
