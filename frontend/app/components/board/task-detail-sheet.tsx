import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isPast } from "date-fns";
import * as React from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Label } from "~/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Calendar } from "~/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { ConfirmDeleteDialog } from "~/components/ui/confirm-delete-dialog";
import type { Task, Board, WorkspaceMember } from "~/types/workspace";
import { taskApi } from "~/lib/task-api";
import { workspaceApi } from "~/lib/workspace-api";

const PRIORITIES = [
  { value: "LOW",    color: "#555555" },
  { value: "MEDIUM", color: "#4d7fe5" },
  { value: "HIGH",   color: "#e5a029" },
  { value: "URGENT", color: "#e54d4d" },
];

const TYPES = [
  { value: "TASK",        color: "#444444" },
  { value: "BUG",         color: "#e54d4d" },
  { value: "HOTFIX",      color: "#e5a029" },
  { value: "FEATURE",     color: "#4d7fe5" },
  { value: "IMPROVEMENT", color: "#4de57a" },
  { value: "TEST",        color: "#a855f7" },
];

export interface TaskDetailSheetProps {
  workspaceId: string;
  boardId: string;
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  board: Board | undefined;
}

function memberName(m: WorkspaceMember): string {
  return m.user?.profile?.name ?? m.user?.email ?? "User";
}

export function TaskDetailSheet({
  workspaceId,
  boardId,
  taskId,
  open,
  onOpenChange,
  board,
}: TaskDetailSheetProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = React.useState("");

  const {
    data: task,
    isLoading,
    refetch: refetchTask,
  } = useQuery({
    queryKey: ["task", workspaceId, boardId, taskId],
    queryFn: () =>
      taskApi.getTask(workspaceId, boardId, taskId!).then((r) => r.data),
    enabled: !!workspaceId && !!boardId && !!taskId && open,
  });

  const { data: workspace } = useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: () =>
      workspaceApi.getWorkspace(workspaceId).then((r) => r.data),
    enabled: !!workspaceId && open,
  });

  const handleMutateError = (err: unknown) => {
    const status =
      err && typeof err === "object" && "response" in err
        ? (err as { response?: { status?: number } }).response?.status
        : undefined;
    if (status === 409) {
      toast.error("This task was updated by someone else");
      void refetchTask();
    }
  };

  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof taskApi.updateTask>[3]) =>
      taskApi
        .updateTask(workspaceId, boardId, taskId!, body)
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "tasks"] });
      queryClient.invalidateQueries({
        queryKey: ["task", workspaceId, boardId, taskId],
      });
    },
    onError: handleMutateError,
  });

  const moveMutation = useMutation({
    mutationFn: ({
      columnId,
      order,
      expectedVersion,
    }: {
      columnId: string;
      order: number;
      expectedVersion: number;
    }) =>
      taskApi
        .moveTask(workspaceId, boardId, taskId!, {
          columnId,
          order: Number(order),
          expectedVersion: Number(expectedVersion),
        })
        .then((r) => r.data),
    onSuccess: (updatedTask) => {
      if (updatedTask) {
        queryClient.setQueryData(
          ["task", workspaceId, boardId, taskId],
          updatedTask
        );
      }
      queryClient.invalidateQueries({
        queryKey: ["board", boardId, "tasks", workspaceId],
      });
      toast.success("Status updated");
    },
    onError: handleMutateError,
  });

  const assignMutation = useMutation({
    mutationFn: (workspaceMemberId: string) =>
      taskApi
        .assignTask(workspaceId, boardId, taskId!, { workspaceMemberId })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "tasks"] });
      queryClient.invalidateQueries({
        queryKey: ["task", workspaceId, boardId, taskId],
      });
    },
    onError: handleMutateError,
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) =>
      taskApi
        .addComment(workspaceId, boardId, taskId!, { content })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["task", workspaceId, boardId, taskId],
      });
      setCommentText("");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      taskApi.deleteComment(workspaceId, boardId, taskId!, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["task", workspaceId, boardId, taskId],
      });
    },
    onError: () => toast.error("Failed to delete comment"),
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const deleteTaskMutation = useMutation({
    mutationFn: () =>
      taskApi.deleteTask(workspaceId, boardId, taskId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Task deleted");
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to delete task"),
  });

  const handleTitleBlur = (newTitle: string) => {
    if (!task || newTitle.trim() === task.title) return;
    updateMutation.mutate({
      expectedVersion: task.version ?? 1,
      title: newTitle.trim(),
    });
  };

  const handleDescriptionBlur = (newDesc: string) => {
    if (!task) return;
    updateMutation.mutate({
      expectedVersion: task.version ?? 1,
      description: newDesc,
    });
  };

  const t = task as { columnId?: string; column_id?: string; column?: { id: string }; version?: number } | undefined;
  const resolvedColumnId = t?.columnId ?? t?.column_id ?? t?.column?.id ?? "";
  const taskVersion = Number(t?.version ?? 1);

  const handleColumnChange = (newColumnId: string) => {
    if (!task || resolvedColumnId === newColumnId) return;
    moveMutation.mutate({
      columnId: newColumnId,
      order: 0,
      expectedVersion: taskVersion,
    });
  };
  const currentColumnId = resolvedColumnId;
  const currentPriority = PRIORITIES.find((p) => p.value === task?.priority);
  const currentType = TYPES.find((t) => t.value === task?.type);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(100vw,640px)] max-w-[640px] border-l border-[var(--border)] bg-[var(--bg-subtle)] p-0 text-[var(--text)] sm:w-[640px] sm:max-w-[640px]"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          navigate(`/boards/${boardId}`, { replace: true });
        }}
      >
        {isLoading || !task ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="size-5 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--text-muted)]" />
              <span className="font-mono text-[11px] text-[var(--text-subtle)]">
                Loading task...
              </span>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col">

            {/* ── HEADER ── */}
            <SheetHeader className="border-b border-[var(--border-muted)] px-6 py-5">
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] tracking-[0.06em] uppercase text-[var(--text-subtle)]">
                  {task.code}
                </span>
                <SheetTitle className="sr-only">{task.title}</SheetTitle>
                <Input
                  type="text"
                  defaultValue={task.title}
                  onBlur={(e) => handleTitleBlur(e.target.value)}
                  className="border-0 bg-transparent p-0 text-[17px] font-medium tracking-[-0.02em] text-[var(--text)] shadow-none placeholder:text-[var(--text-subtle)] focus-visible:ring-0 h-auto leading-snug"
                />
              </div>
            </SheetHeader>

            {/* ── BODY ── */}
            <div className="flex flex-1 overflow-hidden">

              {/* LEFT — description + comments */}
              <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">

                {/* Description */}
                <div className="flex flex-col gap-2">
                  <Label className="font-mono text-[10px] tracking-[0.06em] uppercase text-[var(--text-subtle)]">
                    Description
                  </Label>
                  <Textarea
                    defaultValue={task.description ?? ""}
                    onBlur={(e) => handleDescriptionBlur(e.target.value)}
                    placeholder="Add a description..."
                    rows={5}
                    className="resize-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[13px] font-light text-[var(--text)] placeholder:text-[var(--text-subtle)] focus-visible:border-[var(--border-hover)] focus-visible:ring-0"
                  />
                </div>

                {/* Comments */}
                <div className="flex flex-col gap-3">
                  <Label className="font-mono text-[10px] tracking-[0.06em] uppercase text-[var(--text-subtle)]">
                    Comments
                  </Label>

                  {/* Comment list */}
                  {task.comments && task.comments.length > 0 ? (
                    <ul className="flex flex-col gap-4">
                      {task.comments.map((c) => (
                        <li key={c.id} className="group flex gap-3">
                          <Avatar className="size-7 shrink-0 border border-[var(--border)] bg-[var(--surface)]">
                            <AvatarFallback className="text-[11px] font-medium text-[var(--text-muted)]">
                              {c.author?.profile?.name?.charAt(0) ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-medium text-[var(--text)]">
                                  {c.author?.profile?.name ?? "User"}
                                </span>
                                <span className="font-mono text-[10px] text-[var(--text-subtle)]">
                                  {format(new Date(c.createdAt), "MMM d, HH:mm")}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  deleteCommentMutation.mutate(c.id)
                                }
                                disabled={deleteCommentMutation.isPending}
                                className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-[var(--text-subtle)] hover:bg-transparent hover:text-[var(--red)]"
                                aria-label="Delete comment"
                              >
                                <svg
                                  className="size-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </Button>
                            </div>
                            <p className="text-[13px] font-light leading-relaxed text-[var(--text-muted)]">
                              {c.content}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="font-mono text-[11px] text-[var(--text-subtle)]">
                      No comments yet
                    </p>
                  )}

                  {/* Add comment */}
                  <div className="flex flex-col gap-2 pt-1">
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment..."
                      rows={3}
                      className="resize-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[13px] font-light text-[var(--text)] placeholder:text-[var(--text-subtle)] focus-visible:border-[var(--border-hover)] focus-visible:ring-0"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        className="h-8 rounded-md bg-[var(--accent)] px-4 text-[12px] font-medium text-[var(--primary-foreground)] hover:bg-[var(--accent-hover)] disabled:opacity-40"
                        onClick={() =>
                          commentText.trim() &&
                          commentMutation.mutate(commentText.trim())
                        }
                        disabled={
                          !commentText.trim() || commentMutation.isPending
                        }
                      >
                        Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT — metadata */}
              <div className="flex w-[220px] shrink-0 flex-col overflow-y-auto border-l border-[var(--border-muted)] px-5 py-5">

                {/* Status */}
                <div className="border-b border-[var(--border-muted)] py-3">
                  <span className="mb-1.5 block font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--text-subtle)]">
                    Status
                  </span>
                  <Select
                    value={currentColumnId || undefined}
                    onValueChange={handleColumnChange}
                  >
                    <SelectTrigger className="h-8 w-full rounded-md border-[var(--border)] bg-[var(--surface)] text-[12px] font-light text-[var(--text)] focus:ring-0">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
                      {board?.columns?.map((col) => (
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

                {/* Assignee */}
                <div className="border-b border-[var(--border-muted)] py-3">
                  <span className="mb-1.5 block font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--text-subtle)]">
                    Assignee
                  </span>
                  <Select
                    value={task.assigneeId ?? "__none__"}
                    onValueChange={(v) => {
                      if (v === "__none__")
                        updateMutation.mutate({
                          expectedVersion: task.version ?? 1,
                          assigneeId: null,
                        });
                      else assignMutation.mutate(v);
                    }}
                  >
                    <SelectTrigger className="h-8 w-full rounded-md border-[var(--border)] bg-[var(--surface)] text-[12px] font-light text-[var(--text)] focus:ring-0">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
                      <SelectItem value="__none__" className="text-[12px]">
                        Unassigned
                      </SelectItem>
                      {workspace?.members?.map((m) => (
                        <SelectItem
                          key={m.id}
                          value={m.id}
                          className="text-[12px]"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="size-4 shrink-0">
                              <AvatarFallback className="text-[9px]">
                                {memberName(m).charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            {memberName(m)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div className="border-b border-[var(--border-muted)] py-3">
                  <span className="mb-1.5 block font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--text-subtle)]">
                    Priority
                  </span>
                  <Select
                    value={task.priority}
                    onValueChange={(v) =>
                      updateMutation.mutate({
                        expectedVersion: task.version ?? 1,
                        priority: v,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 w-full rounded-md border-[var(--border)] bg-[var(--surface)] text-[12px] font-light text-[var(--text)] focus:ring-0">
                      <SelectValue placeholder="Priority">
                        {currentPriority && (
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2 rounded-full shrink-0"
                              style={{ background: currentPriority.color }}
                            />
                            {currentPriority.value}
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
                      {PRIORITIES.map((p) => (
                        <SelectItem
                          key={p.value}
                          value={p.value}
                          className="text-[12px]"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2 rounded-full shrink-0"
                              style={{ background: p.color }}
                            />
                            {p.value}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type */}
                <div className="border-b border-[var(--border-muted)] py-3">
                  <span className="mb-1.5 block font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--text-subtle)]">
                    Type
                  </span>
                  <Select
                    value={task.type}
                    onValueChange={(v) =>
                      updateMutation.mutate({
                        expectedVersion: task.version ?? 1,
                        type: v,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 w-full rounded-md border-[var(--border)] bg-[var(--surface)] text-[12px] font-light text-[var(--text)] focus:ring-0">
                      <SelectValue placeholder="Type">
                        {currentType && (
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-0.5 rounded-full shrink-0"
                              style={{ background: currentType.color }}
                            />
                            {currentType.value}
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="border-[var(--border)] bg-[var(--surface)]">
                      {TYPES.map((t) => (
                        <SelectItem
                          key={t.value}
                          value={t.value}
                          className="text-[12px]"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="h-3 w-0.5 rounded-full shrink-0"
                              style={{ background: t.color }}
                            />
                            {t.value}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Due Date */}
                <div className="border-b border-[var(--border-muted)] py-3">
                  <span className="mb-1.5 block font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--text-subtle)]">
                    Due date
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className="h-8 w-full justify-start rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 text-[12px] font-light text-[var(--text)] hover:bg-[var(--surface-hover)]"
                      >
                        <CalendarIcon className="mr-2 size-3 shrink-0 text-[var(--text-subtle)]" />
                        {task.dueDate ? (
                          <span
                            className={
                              isPast(new Date(task.dueDate))
                                ? "text-[var(--red)]"
                                : ""
                            }
                          >
                            {format(new Date(task.dueDate), "MMM d, yyyy")}
                          </span>
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
                        selected={
                          task.dueDate
                            ? new Date(task.dueDate)
                            : undefined
                        }
                        onSelect={(date) =>
                          updateMutation.mutate({
                            expectedVersion: task.version ?? 1,
                            dueDate: date ? date.toISOString() : null,
                          })
                        }
                        initialFocus
                      />
                      {task.dueDate && (
                        <div className="border-t border-[var(--border-muted)] p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-[12px] text-[var(--text-muted)] hover:bg-transparent hover:text-[var(--red)]"
                            onClick={() =>
                              updateMutation.mutate({
                                expectedVersion: task.version ?? 1,
                                dueDate: null,
                              })
                            }
                          >
                            Clear date
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Created */}
                <div className="border-b border-[var(--border-muted)] py-3">
                  <span className="mb-1.5 block font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--text-subtle)]">
                    Created
                  </span>
                  <span className="font-mono text-[11px] text-[var(--text-muted)]">
                    {format(new Date(task.createdAt), "MMM d, yyyy")}
                  </span>
                </div>

                {/* Created by */}
                {task.createdBy && (
                  <div className="py-3">
                    <span className="mb-1.5 block font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--text-subtle)]">
                      Created by
                    </span>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-5 shrink-0 border border-[var(--border)]">
                        <AvatarFallback className="text-[9px] text-[var(--text-muted)]">
                          {task.createdBy?.profile?.name?.charAt(0) ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[12px] text-[var(--text-muted)]">
                        {task.createdBy?.profile?.name ?? "User"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Danger zone */}
                <div className="mt-6 border-t border-[var(--border-muted)] pt-4">
                  <span className="mb-2 block font-mono text-[9px] tracking-[0.08em] uppercase text-[var(--text-subtle)]">
                    Danger zone
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 text-[12px] text-[var(--red)] hover:bg-[var(--red)]/10 hover:text-[var(--red)]"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    Delete task
                  </Button>
                </div>

              </div>
            </div>
          </div>
        )}
      </SheetContent>
      {task && (
        <ConfirmDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete task?"
          description="This will permanently delete this task and its comments. This action cannot be undone."
          confirmText={task.code}
          deleteLabel="Delete task"
          onConfirm={async () => {
          await deleteTaskMutation.mutateAsync();
        }}
        />
      )}
    </Sheet>
  );
}