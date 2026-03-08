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
import { Textarea } from "~/components/ui/textarea";
import { workspaceApi } from "~/lib/workspace-api";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be at most 50 characters"),
  description: z.string().max(200).optional(),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export interface CreateWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateWorkspaceModal({ open, onOpenChange }: CreateWorkspaceModalProps) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const form = useForm({
    defaultValues: { name: "", description: "" },
    validators: {
      onChange: ({ value }) => zodValidator().validate({ value }, schema),
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      try {
        await createMutation.mutateAsync({
          name: value.name,
          description: value.description || undefined,
        });
        toast.success("Workspace created successfully");
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
            : "Failed to create workspace";
        setSubmitError(msg);
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; description?: string }) =>
      workspaceApi.createWorkspace(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  const nameValue = form.state.values.name;
  const slugPreview = nameValue.trim() ? slugify(nameValue) : "your-workspace-name";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold tracking-[-0.01em]">
            Create workspace
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
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="workspace-name" className="text-[var(--text-muted)]">
                  Workspace name
                </Label>
                <Input
                  id="workspace-name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Acme Inc"
                  className="h-9 rounded-[6px] border-[var(--border)] bg-[var(--surface)] text-[13px] placeholder:text-[var(--text-muted)] focus:border-[#333333] focus:ring-0"
                  aria-invalid={!!field.state.meta.errors?.length}
                />
                <p className="font-mono text-[11px] text-[var(--text-subtle)]">
                  {slugPreview}
                </p>
                {field.state.meta.errors?.[0] != null ? (
                  <p className="text-xs text-[var(--red)]">{String(field.state.meta.errors[0])}</p>
                ) : null}
                {submitError ? <p className="text-xs text-[var(--red)]">{submitError}</p> : null}
              </div>
            )}
          </form.Field>
          <form.Field name="description">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="workspace-desc" className="text-[var(--text-muted)]">
                  Description (optional)
                </Label>
                <Textarea
                  id="workspace-desc"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="What's this workspace for?"
                  rows={3}
                  maxLength={200}
                  className="rounded-[6px] border-[var(--border)] bg-[var(--surface)] min-h-0"
                />
                <p className="text-right text-xs text-[var(--text-muted)]">{field.state.value.length}/200</p>
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
              {form.state.isSubmitting ? "Creating…" : "Create Workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
