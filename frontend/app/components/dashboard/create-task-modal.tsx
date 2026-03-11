import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
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

const TASK_TYPES = [
  "TASK",
  "BUG",
  "HOTFIX",
  "FEATURE",
  "IMPROVEMENT",
  "TEST",
] as const;
const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#555555",
  MEDIUM: "#4d7fe5",
  HIGH: "#e5a029",
  URGENT: "#e54d4d",
};

const TYPE_COLORS: Record<string, string> = {
  TASK: "#444444",
  BUG: "#e54d4d",
  HOTFIX: "#e5a029",
  FEATURE: "#4d7fe5",
  IMPROVEMENT: "#4de57a",
  TEST: "#a855f7",
};

export interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultWorkspaceId?: string;
  defaultBoardId?: string;
}

export function CreateTaskModal({
  open,
  onOpenChange,
  defaultWorkspaceId,
  defaultBoardId,
}: CreateTaskModalProps) {
  const queryClient = useQueryClient();
  const [workspaceId, setWorkspaceId] = React.useState<string>(
    defaultWorkspaceId ?? "",
  );
  const [boardId, setBoardId] = React.useState<string>(defaultBoardId ?? "");
  const [columnId, setColumnId] = React.useState<string>("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<string>("TASK");
  const [priority, setPriority] = React.useState<string>("MEDIUM");
  const [dueDate, setDueDate] = React.useState<Date | undefined>(undefined);
  const [dueDateOpen, setDueDateOpen] = React.useState(false);
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

  const boards = workspaceId ? (boardsByWorkspace[workspaceId] ?? []) : [];
  const columns: BoardColumn[] = board?.columns ?? [];

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
          dueDate: dueDate ? dueDate.toISOString() : undefined,
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
          : "Failed to create task",
      );
    },
  });

  function resetForm() {
    setTitle("");
    setDescription("");
    setType("TASK");
    setPriority("MEDIUM");
    setDueDate(undefined);
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
    !!title.trim() &&
    !!workspaceId &&
    !!boardId &&
    !!columnId &&
    !createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-md border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-[15px] font-medium tracking-[-0.01em]">
            Create task
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Workspace + Board */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="task-workspace"
                className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--text-subtle)]"
              >
                Workspace
              </Label>
              <Select
                value={workspaceId || "__none__"}
                onValueChange={(v) => setWorkspaceId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger
                  id="task-workspace"
                  className=" rounded-md border-[var(--border)] bg-[var(--bg-subtle)] text-[12px] font-light"
                >
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
                <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
                  <SelectItem value="__none__" className="text-[12px]">
                    Select workspace
                  </SelectItem>
                  {(workspaces ?? []).map((ws: Workspace) => (
                    <SelectItem
                      key={ws.id}
                      value={ws.id}
                      className="text-[12px]"
                    >
                      {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="task-board"
                className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--text-subtle)]"
              >
                Board
              </Label>
              <Select
                value={boardId || "__none__"}
                onValueChange={(v) => setBoardId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger
                  id="task-board"
                  className=" rounded-md border-[var(--border)] bg-[var(--bg-subtle)] text-[12px] font-light"
                  disabled={!workspaceId || boards.length === 0}
                >
                  <SelectValue placeholder="Select board" />
                </SelectTrigger>
                <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
                  <SelectItem value="__none__" className="text-[12px]">
                    Select board
                  </SelectItem>
                  {boards.map((b) => (
                    <SelectItem key={b.id} value={b.id} className="text-[12px]">
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Column */}
          <div className="space-y-1.5">
            <Label
              htmlFor="task-column"
              className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--text-subtle)]"
            >
              Column
            </Label>
            <Select
              value={columnId || "__none__"}
              onValueChange={(v) => setColumnId(v === "__none__" ? "" : v)}
            >
              <SelectTrigger
                id="task-column"
                className=" rounded-md border-[var(--border)] bg-[var(--bg-subtle)] text-[12px] font-light"
                disabled={!boardId || columns.length === 0}
              >
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
                <SelectItem value="__none__" className="text-[12px]">
                  Select column
                </SelectItem>
                {columns.map((col) => (
                  <SelectItem
                    key={col.id}
                    value={col.id}
                    className="text-[12px]"
                  >
                    {col.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label
              htmlFor="task-title"
              className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--text-subtle)]"
            >
              Title <span className="text-[var(--red)]">*</span>
            </Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className=" rounded-md border-[var(--border)] bg-[var(--bg-subtle)] text-[13px] font-light"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label
              htmlFor="task-desc"
              className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--text-subtle)]"
            >
              Description{" "}
              <span
                className="text-[var(--text-subtle)] normal-case"
                style={{ letterSpacing: 0 }}
              >
                (optional)
              </span>
            </Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={2}
              className="min-h-0 resize-none rounded-md border-[var(--border)] bg-[var(--bg-subtle)] text-[13px] font-light"
            />
          </div>

          {/* Type + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="task-type"
                className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--text-subtle)]"
              >
                Type
              </Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger
                  id="task-type"
                  className=" rounded-md border-[var(--border)] bg-[var(--bg-subtle)] text-[12px] font-light"
                >
                  <SelectValue placeholder="Type">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-0.5 shrink-0 rounded-full"
                        style={{
                          background: TYPE_COLORS[type] ?? TYPE_COLORS.TASK,
                        }}
                      />
                      {type}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
                  {TASK_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-[12px]">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-0.5 shrink-0 rounded-full"
                          style={{
                            background: TYPE_COLORS[t] ?? TYPE_COLORS.TASK,
                          }}
                        />
                        {t}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="task-priority"
                className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--text-subtle)]"
              >
                Priority
              </Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger
                  id="task-priority"
                  className=" rounded-md border-[var(--border)] bg-[var(--bg-subtle)] text-[12px] font-light"
                >
                  <SelectValue placeholder="Priority">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{
                          background: PRIORITY_COLORS[priority] ?? "#555555",
                        }}
                      />
                      {priority}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="text-[12px]">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{
                            background: PRIORITY_COLORS[p] ?? "#555555",
                          }}
                        />
                        {p}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--text-subtle)]">
              Due date{" "}
              <span
                className="text-[var(--text-subtle)] normal-case"
                style={{ letterSpacing: 0 }}
              >
                (optional)
              </span>
            </Label>
            <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className=" w-full justify-start rounded-md border border-[var(--border)] bg-[var(--bg-subtle)] px-3 text-[12px] font-light text-[var(--text)] hover:bg-[var(--surface-hover)]"
                >
                  <CalendarIcon className="mr-2 size-3 shrink-0 text-[var(--text-subtle)]" />
                  {dueDate ? (
                    format(dueDate, "MMM d, yyyy")
                  ) : (
                    <span className="text-[var(--text-subtle)]">
                      No due date
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto border-[var(--border)] bg-[var(--surface)] p-0"
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(date) => {
                    setDueDate(date);
                    setDueDateOpen(false);
                  }}
                  initialFocus
                />
                {dueDate && (
                  <div className="border-t border-[var(--border-muted)] p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-[12px] text-[var(--text-muted)] hover:bg-transparent hover:text-[var(--red)]"
                      onClick={() => {
                        setDueDate(undefined);
                        setDueDateOpen(false);
                      }}
                    >
                      Clear date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {submitError && (
            <p className="font-mono text-[11px] text-[var(--red)]">
              {submitError}
            </p>
          )}

          <DialogFooter className="gap-2 pt-1 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              className=" rounded-md border-[var(--border)] text-[12px] font-light text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              onClick={() => handleClose(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className=" rounded-md bg-[var(--accent)] px-4 text-[12px] font-medium text-[var(--primary-foreground)] hover:bg-[var(--accent-hover)] disabled:opacity-40"
            >
              {createMutation.isPending ? "Creating…" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}