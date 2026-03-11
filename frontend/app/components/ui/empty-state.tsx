import * as React from "react";
import { cn } from "~/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  message: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, message, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-8 text-center",
        className
      )}
    >
      {icon != null && (
        <div className="mb-3 text-[var(--text-subtle)] [&_svg]:size-8">
          {icon}
        </div>
      )}
      <p className="text-[13px] font-light text-[var(--text-muted)]">{message}</p>
      {action != null && <div className="mt-3">{action}</div>}
    </div>
  );
}
