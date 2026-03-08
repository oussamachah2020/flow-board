import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "sonner";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import type { Board, BoardColumn, Workspace } from "~/types/workspace";
import { taskApi } from "~/lib/task-api";
import { workspaceApi } from "~/lib/workspace-api";

const TASK_TYPES = ["TASK", "BUG"] as const;
const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional: preselect this workspace id */
  defaultWorkspaceId?: string;
  /** Optional: preselect this board id */
  defaultBoardId?: string;
}

export function CreateTaskModal({
  open,
  onOpenChange,
  defaultWorkspaceId,
  defaultBoardId,
}: CreateTaskModalProps) {
  const queryClient = useQueryClient();
  const [workspaceId, setWorkspaceId] = React.useState<string>(defaultWorkspaceId ?? "");
  const [boardId, setBoardId] = React.useState<string>(defaultBoardId ?? "");
  const [columnId, setColumnId] = React.useState<string>("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<string>("TASK");
  const [priority, setPriority] = React.useState<string>("MEDIUM");
  const [dueDate, setDueDate] = React.useState("");
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const { data: workspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => workspaceApi.getWorkspaces().then((r) => r.data),
    enabled: open,
  });

  const boardQueries = useQueries({
    queries: (workspaces ?? []).map((ws) => ({
      queryKey: ["workspaces", ws.id, "boards"],
      queryFn: () => workspaceApi.getBoards(ws.id).then((r) => r.data),
      enabled: open && !!workspaces?.length,
    })),
  });

  const { data: board } = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => workspaceApi.getBoardById(boardId).then((r) => r.data),
    enabled: open && !!boardId,
  });

  const boardsByWorkspace: Record<string, Board[]> = {};
  (workspaces ?? []).forEach((ws, i) => {
    const res = boardQueries[i]?.data;
    if (res) boardsByWorkspace[ws.id] = res;
  });

  const boards = workspaceId ? boardsByWorkspace[workspaceId] ?? [] : [];
  const columns: BoardColumn[] = board?.columns ?? [];

  // When modal opens or workspaces load, set default workspace/board
  React.useEffect(() => {
    if (!open) return;
    const first = workspaces?.[0];
    if (first && !workspaceId) {
      setWorkspaceId(defaultWorkspaceId ?? first.id);
    }
  }, [open, workspaces, defaultWorkspaceId, workspaceId]);

  React.useEffect(() => {
    if (!workspaceId) {
      setBoardId("");
      setColumnId("");
      return;
    }
    const list = boardsByWorkspace[workspaceId] ?? [];
    const first = list[0];
    if (first) {
      setBoardId(defaultBoardId ?? first.id);
    } else {
      setBoardId("");
      setColumnId("");
    }
  }, [workspaceId, boardsByWorkspace, defaultBoardId]);

  React.useEffect(() => {
    if (!boardId || !board?.columns?.length) {
      setColumnId("");
      return;
    }
    const firstCol = board.columns[0];
    if (firstCol && !columnId) {
      setColumnId(firstCol.id);
    }
  }, [boardId, board?.columns, columnId]);

  const createMutation = useMutation({
    mutationFn: () =>
      taskApi
        .createTask(workspaceId, boardId, {
          columnId,
          title: title.trim(),
          description: description.trim() || undefined,
          type: type || undefined,
          priority: priority || undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Task created");
      onOpenChange(false);
      resetForm();
    },
    onError: (err: unknown) => {
      const res =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
          : undefined;
      setSubmitError(
        res?.data?.message && typeof res.data.message === "string"
          ? res.data.message
          : "Failed to create task"
      );
    },
  });

  function resetForm() {
    setTitle("");
    setDescription("");
    setType("TASK");
    setPriority("MEDIUM");
    setDueDate("");
    setSubmitError(null);
  }

  function handleClose(open: boolean) {
    if (!open) resetForm();
    onOpenChange(open);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!title.trim()) {
      setSubmitError("Title is required");
      return;
    }
    if (!workspaceId || !boardId || !columnId) {
      setSubmitError("Please select a workspace, board, and column");
      return;
    }
    createMutation.mutate();
  }

  const canSubmit =
    !!title.trim() && !!workspaceId && !!boardId && !!columnId && !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="border-[var(--border)] bg-[var(--surface)] text-[var(--text)] max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-[18px] font-semibold tracking-[-0.01em]">
            Create task
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-workspace" className="text-[var(--text-muted)]">
                Workspace
              </Label>
              <Select value={workspaceId || "__none__"} onValueChange={(v) => setWorkspaceId(v === "__none__" ? "" : v)}>
                <SelectTrigger id="task-workspace" className="rounded-[6px] border-[var(--border)] bg-[var(--surface)]">
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select workspace</SelectItem>
                  {(workspaces ?? []).map((ws: Workspace) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-board" className="text-[var(--text-muted)]">
                Board
              </Label>
              <Select value={boardId || "__none__"} onValueChange={(v) => setBoardId(v === "__none__" ? "" : v)}>
                <SelectTrigger id="task-board" className="rounded-[6px] border-[var(--border)] bg-[var(--surface)]" disabled={!workspaceId || boards.length === 0}>
                  <SelectValue placeholder="Select board" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select board</SelectItem>
                  {boards.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-column" className="text-[var(--text-muted)]">
              Column
            </Label>
            <Select value={columnId || "__none__"} onValueChange={(v) => setColumnId(v === "__none__" ? "" : v)}>
              <SelectTrigger id="task-column" className="rounded-[6px] border-[var(--border)] bg-[var(--surface)]" disabled={!boardId || columns.length === 0}>
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select column</SelectItem>
                {columns.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-title" className="text-[var(--text-muted)]">
              Title <span className="text-[var(--red)]">*</span>
            </Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="rounded-[6px] border-[var(--border)] bg-[var(--surface)]"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-desc" className="text-[var(--text-muted)]">
              Description (optional)
            </Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={2}
              className="rounded-[6px] border-[var(--border)] bg-[var(--surface)] min-h-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-type" className="text-[var(--text-muted)]">
                Type
              </Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="task-type" className="rounded-[6px] border-[var(--border)] bg-[var(--surface)]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-priority" className="text-[var(--text-muted)]">
                Priority
              </Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="task-priority" className="rounded-[6px] border-[var(--border)] bg-[var(--surface)]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-due" className="text-[var(--text-muted)]">
              Due date (optional)
            </Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-[6px] border-[var(--border)] bg-[var(--surface)]"
            />
          </div>

          {submitError && (
            <p className="text-xs text-[var(--red)]">{submitError}</p>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="h-[34px] rounded-[6px] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="h-[34px] rounded-[6px] bg-[var(--accent)] px-4 text-[13px] font-normal text-[var(--primary-foreground)] hover:bg-[var(--accent-hover)]"
            >
              {createMutation.isPending ? "Creating…" : "Create Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
