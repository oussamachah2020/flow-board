import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { workspaceApi } from "~/lib/workspace-api";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

export interface InviteMemberModalProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberModal({
  workspaceId,
  open,
  onOpenChange,
}: InviteMemberModalProps) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: "" },
    validators: {
      onChange: ({ value }) => zodValidator().validate({ value }, schema),
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        await inviteMutation.mutateAsync({ email: value.email });
        toast.success(`Invitation sent to ${value.email}`);
        onOpenChange(false);
        form.reset();
      } catch (err: unknown) {
        const res =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { message?: string } } }).response
            : undefined;
        const msg =
          res?.data?.message && typeof res.data.message === "string"
            ? res.data.message
            : "Failed to send invitation";
        setSubmitError(msg);
      }
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (body: { email: string }) =>
      workspaceApi.inviteMember(workspaceId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces", workspaceId] });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold tracking-[-0.01em] text-[var(--text)]">
            Invite member
          </DialogTitle>
        </DialogHeader>
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
                <Label htmlFor="invite-email" className="text-[var(--text-muted)]">
                  Email
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="colleague@example.com"
                  className="h-9 rounded-[6px] border-[var(--border)] bg-[var(--surface)] text-[13px] text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:border-[var(--border-focus)] focus-visible:ring-0"
                  aria-invalid={!!field.state.meta.errors?.length}
                />
                {field.state.meta.errors?.[0] != null ? (
                  <p className="text-xs text-[var(--red)]">{String(field.state.meta.errors[0])}</p>
                ) : null}
                {submitError ? (
                  <p className="text-xs text-[var(--red)]">{submitError}</p>
                ) : null}
              </div>
            )}
          </form.Field>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="h-[34px] rounded-[6px] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={form.state.isSubmitting}
              className="h-[34px] rounded-[6px] bg-[var(--accent)] px-4 text-[13px] font-normal text-[var(--primary-foreground)] hover:bg-[var(--accent-hover)]"
            >
              {form.state.isSubmitting ? "Sending…" : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
