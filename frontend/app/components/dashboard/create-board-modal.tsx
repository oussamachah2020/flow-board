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
  name: z.string().min(2, "Name must be at least 2 characters").max(255, "Name must be at most 255 characters"),
  description: z.string().max(500).optional(),
});

/** Mirror backend prefix generation for preview */
function previewPrefix(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "B";
  if (words.length === 1 && words[0].length >= 3) {
    return words[0].slice(0, 3).toUpperCase().slice(0, 5);
  }
  return words
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 5);
}

export interface CreateBoardModalProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateBoardModal({
  workspaceId,
  open,
  onOpenChange,
}: CreateBoardModalProps) {
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
        toast.success("Board created successfully");
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
            : "Failed to create board";
        setSubmitError(msg);
      }
    },
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; description?: string }) =>
      workspaceApi.createBoard(workspaceId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces", workspaceId, "boards"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  const nameValue = form.state.values.name;
  const prefixPreview = nameValue.trim() ? previewPrefix(nameValue) : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold tracking-[-0.01em]">
            Create board
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
                <Label htmlFor="board-name" className="text-[var(--text-muted)]">
                  Board name
                </Label>
                <Input
                  id="board-name"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. Frontend"
                  className="h-9 rounded-[6px] border-[var(--border)] bg-[var(--surface)] text-[13px] placeholder:text-[var(--text-muted)] focus:border-[#333333] focus:ring-0"
                  aria-invalid={!!field.state.meta.errors?.length}
                />
                <p className="font-mono text-[11px] text-[var(--text-subtle)]">
                  PREFIX: {prefixPreview}
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
                <Label htmlFor="board-desc" className="text-[var(--text-muted)]">
                  Description (optional)
                </Label>
                <Textarea
                  id="board-desc"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="What's this board for?"
                  rows={2}
                  maxLength={500}
                  className="rounded-[6px] border-[var(--border)] bg-[var(--surface)] min-h-0"
                />
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
              {form.state.isSubmitting ? "Creating…" : "Create Board"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
