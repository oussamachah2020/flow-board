import * as React from "react";

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

export interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** Text the user must type to confirm (e.g. workspace name) */
  confirmText: string;
  onConfirm: () => void | Promise<void>;
  /** Button label for the destructive action */
  deleteLabel?: string;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  onConfirm,
  deleteLabel = "Delete",
}: ConfirmDeleteDialogProps) {
  const [typed, setTyped] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const canConfirm = (typed ?? "").trim() === (confirmText ?? "").trim();

  React.useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  async function handleConfirm() {
    if (!canConfirm) return;
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle
            className="text-[20px]"
            style={{ fontWeight: 500, letterSpacing: "-0.02em" }}
          >
            {title}
          </DialogTitle>
          <p className="text-[13px] text-[var(--text-muted)]">{description}</p>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label
            htmlFor="confirm-delete-input"
            className="text-[var(--text-muted)]"
          >
            Type <strong className="text-[var(--text)]">{confirmText ?? ""}</strong>{" "}
            to confirm
          </Label>
          <Input
            id="confirm-delete-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmText ?? ""}
            className="h-9 rounded-[6px] border-[var(--border)] bg-[var(--surface)] text-[13px] focus:border-[var(--ring)] focus:ring-0"
            autoComplete="off"
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className=" rounded-[6px] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canConfirm || loading}
            className=" rounded-[6px] bg-[var(--red)] text-white hover:opacity-90"
            onClick={handleConfirm}
          >
            {loading ? "Deleting…" : deleteLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
