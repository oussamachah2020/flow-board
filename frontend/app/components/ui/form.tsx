import * as React from "react";
import { cn } from "~/lib/utils";
import { Label } from "~/components/ui/label";

/**
 * Form field wrapper for use with TanStack Form.
 * Renders a Label and optional error message; children (e.g. Input) go in between.
 */
function FormField({
  className,
  label,
  name,
  error,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  label: React.ReactNode;
  name: string;
  error?: string;
}) {
  return (
    <div
      data-slot="form-field"
      className={cn("grid gap-2", className)}
      {...props}
    >
      <Label htmlFor={name}>{label}</Label>
      {children}
      {error ? (
        <p className="text-sm font-normal text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { FormField };
