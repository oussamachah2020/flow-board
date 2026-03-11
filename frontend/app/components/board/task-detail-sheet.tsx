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
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Calendar } from "~/components/ui/calendar";
import { CalendarIcon, Trash2 } from "lucide-react";
import { ConfirmDeleteDialog } from "~/components/ui/confirm-delete-dialog";
import type { Task, Board, WorkspaceMember } from "~/types/workspace";
import { taskApi } from "~/lib/task-api";
import { workspaceApi } from "~/lib/workspace-api";
import { PRIORITY_COLORS, TYPE_COLORS } from "~/lib/design-tokens";
import { cn } from "~/lib/utils";

const PRIORITY_VALUES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const TYPE_VALUES = [
  "TASK",
  "BUG",
  "HOTFIX",
  "FEATURE",
  "IMPROVEMENT",
  "TEST",
] as const;

const DROPDOWN_CONTENT =
  "border border-[var(--border)] bg-[var(--surface)] shadow-xl shadow-black/50";

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
  const [commentInputFocused, setCommentInputFocused] = React.useState(false);

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
      setCommentInputFocused(false);
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
  const currentColumn = board?.columns?.find((c) => c.id === currentColumnId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(100vw,640px)] max-w-[640px] border-l border-[var(--border-muted)] bg-[var(--bg-subtle)] p-0 text-[var(--text)] sm:w-[640px] sm:max-w-[640px]"
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
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[11px] text-[var(--text-subtle)] tracking-wide">
                  {task.code}
                </span>
                <SheetTitle className="sr-only">{task.title}</SheetTitle>
                <Input
                  type="text"
                  defaultValue={task.title}
                  onBlur={(e) => handleTitleBlur(e.target.value)}
                  className="border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[18px] font-semibold tracking-tight text-[var(--text)] shadow-none transition-colors placeholder:text-[var(--text-subtle)] hover:bg-[var(--surface-hover)] focus-visible:ring-1 focus-visible:ring-[var(--border-hover)] focus-visible:outline-0"
                />
              </div>
            </SheetHeader>

            {/* ── BODY ── */}
            <div className="flex flex-1 overflow-hidden">
              {/* LEFT — description + comments */}
              <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-6 py-6 scrollbar-none">
                {/* Description — borderless at rest; hover/focus per spec */}
                <div className="flex flex-col gap-2">
                  <span className="block text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-subtle)]">
                    Description
                  </span>
                  <Textarea
                    defaultValue={task.description ?? ""}
                    onBlur={(e) => handleDescriptionBlur(e.target.value)}
                    placeholder="Add a description..."
                    rows={5}
                    className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[13px] leading-relaxed text-[var(--text-muted)] shadow-none placeholder:text-[var(--text-subtle)] focus:ring-1 focus:ring-[var(--border-hover)] focus:outline-0"
                  />
                </div>

                {/* Comments / Activity */}
                <div className="flex flex-col gap-4">
                  <span className="block text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-subtle)]">
                    Comments
                  </span>

                  {/* Comment list */}
                  {task.comments && task.comments.length > 0 ? (
                    <ul className="flex flex-col gap-5">
                      {task.comments.map((c) => (
                        <li key={c.id} className="group flex gap-3">
                          <Avatar className="size-6 shrink-0 border border-[var(--border-muted)] bg-[var(--surface)]">
                            <AvatarFallback className="text-[10px] font-medium text-[var(--text-muted)]">
                              {c.author?.profile?.name?.charAt(0) ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] font-semibold text-[var(--text)]">
                                  {c.author?.profile?.name ?? "User"}
                                </span>
                                <span className="font-mono text-[11px] text-[var(--text-subtle)]">
                                  {format(
                                    new Date(c.createdAt),
                                    "MMM d, HH:mm",
                                  )}
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
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div
                        className="mb-3 size-8 rounded-full bg-[var(--surface)] flex items-center justify-center text-[var(--text-subtle)]"
                        aria-hidden
                      >
                        <svg
                          className="size-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 2 13.574 2 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                      </div>
                      <p className="text-[13px] text-[var(--text-subtle)]">
                        No comments yet
                      </p>
                    </div>
                  )}

                  {/* Add comment — avatar inline + borderless input; expands on focus + Save/Cancel */}
                  <div className="flex flex-col gap-3 pt-2">
                    <div className="flex items-start gap-3">
                      <Avatar className="size-6 shrink-0 border border-[var(--border-muted)] bg-[var(--surface)]">
                        <AvatarFallback className="text-[10px] font-medium text-[var(--text-muted)]">
                          ?
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <Textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onFocus={() => setCommentInputFocused(true)}
                          onBlur={() => setCommentInputFocused(false)}
                          placeholder="Add a comment..."
                          rows={commentInputFocused ? 3 : 1}
                          className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[13px] text-[var(--text-muted)] shadow-none placeholder:text-[var(--text-subtle)] focus:ring-1 focus:ring-[var(--border-hover)] focus:outline-0"
                        />
                        {commentInputFocused && (
                          <div className="mt-3 flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs text-[var(--text-subtle)]"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setCommentText("");
                                setCommentInputFocused(false);
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="rounded px-4 py-2 text-[11px] font-medium bg-[var(--accent)] text-[var(--primary-foreground)] hover:bg-[var(--accent-hover)] disabled:opacity-40"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                if (commentText.trim())
                                  commentMutation.mutate(commentText.trim());
                              }}
                              disabled={
                                !commentText.trim() || commentMutation.isPending
                              }
                            >
                              Save
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT — metadata: stacked label + value per field, w-[200px], all var() tokens */}
              <div className="flex w-[200px] shrink-0 flex-col overflow-y-auto border-l border-[var(--border-muted)] px-5 py-6 scrollbar-none">
                {/* Status — label stacked, flat clickable value row, chevron on hover */}
                <div className="group border-b border-[var(--border-muted)] py-4">
                  <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-subtle)]">
                    Status
                  </span>
                  <Select
                    value={currentColumnId || undefined}
                    onValueChange={handleColumnChange}
                  >
                    <SelectTrigger className="flex w-full cursor-pointer items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 shadow-none transition-colors hover:bg-[var(--surface-hover)] focus:ring-1 focus:ring-[var(--border-hover)] [&>svg]:size-3 [&>svg]:text-[var(--text-subtle)] [&>svg]:opacity-0 [&>svg]:transition-opacity group-hover:[&>svg]:opacity-100">
                      <span className="text-[12px] font-medium text-[var(--text)]">
                        <SelectValue placeholder="Status" />
                      </span>
                    </SelectTrigger>
                    <SelectContent className={DROPDOWN_CONTENT}>
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

                {/* Assignee — stacked; value: avatar size-4 + name or Unassigned */}
                <div className="group border-b border-[var(--border-muted)] py-4">
                  <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-subtle)]">
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
                    <SelectTrigger className="group flex w-full cursor-pointer items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 shadow-none transition-colors hover:bg-[var(--surface-hover)] focus:ring-1 focus:ring-[var(--border-hover)] [&>svg]:size-3 [&>svg]:text-[var(--text-subtle)] [&>svg]:opacity-0 [&>svg]:transition-opacity group-hover:[&>svg]:opacity-100">
                      <span className="flex w-full items-center gap-1.5 text-[12px] font-medium text-[var(--text)]">
                        <SelectValue placeholder="Unassigned" />
                      </span>
                    </SelectTrigger>
                    <SelectContent className={DROPDOWN_CONTENT}>
                      <SelectItem
                        value="__none__"
                        className="text-[12px] text-[var(--text-subtle)]"
                      >
                        Unassigned
                      </SelectItem>
                      {workspace?.members?.map((m) => (
                        <SelectItem
                          key={m.id}
                          value={m.id}
                          className="text-[12px]"
                        >
                          <div className="flex items-center gap-1.5">
                            <Avatar className="size-4 shrink-0 border border-[var(--border-muted)] bg-[var(--surface)]">
                              <AvatarFallback className="text-[9px] text-[var(--text-muted)]">
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

                {/* Priority — stacked; value: colored dot (PRIORITY_COLORS) + label */}
                <div className="group border-b border-[var(--border-muted)] py-4">
                  <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-subtle)]">
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
                    <SelectTrigger className="group flex w-full cursor-pointer items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 shadow-none transition-colors hover:bg-[var(--surface-hover)] focus:ring-1 focus:ring-[var(--border-hover)] [&>svg]:size-3 [&>svg]:text-[var(--text-subtle)] [&>svg]:opacity-0 [&>svg]:transition-opacity group-hover:[&>svg]:opacity-100">
                      <span className="flex w-full items-center gap-1.5 text-[12px] font-medium text-[var(--text)]">
                        <SelectValue placeholder="Priority">
                          {task.priority && (
                            <>
                              <span
                                className="size-2 shrink-0 rounded-full"
                                style={{
                                  backgroundColor:
                                    PRIORITY_COLORS[task.priority],
                                }}
                              />
                              {task.priority}
                            </>
                          )}
                        </SelectValue>
                      </span>
                    </SelectTrigger>
                    <SelectContent className={DROPDOWN_CONTENT}>
                      {PRIORITY_VALUES.map((p) => (
                        <SelectItem key={p} value={p} className="text-[12px]">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: PRIORITY_COLORS[p] }}
                            />
                            {p}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type — stacked; value: pill badge bg 10% + border 20% + colored text (TYPE_COLORS) */}
                <div className="group border-b border-[var(--border-muted)] py-4">
                  <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-subtle)]">
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
                    <SelectTrigger className="group flex w-full cursor-pointer items-center rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 shadow-none transition-colors hover:bg-[var(--surface-hover)] focus:ring-1 focus:ring-[var(--border-hover)] [&>svg]:size-3 [&>svg]:text-[var(--text-subtle)] [&>svg]:opacity-0 [&>svg]:transition-opacity group-hover:[&>svg]:opacity-100">
                      <span className="flex w-full items-center gap-1.5 text-[12px] font-medium text-[var(--text)]">
                        <SelectValue placeholder="Type">
                          {task.type && TYPE_COLORS[task.type] && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                              style={{
                                backgroundColor: `color-mix(in srgb, ${TYPE_COLORS[task.type]} 10%, transparent)`,
                                border: `1px solid ${TYPE_COLORS[task.type]}`,
                                color: TYPE_COLORS[task.type],
                              }}
                            >
                              {task.type}
                            </span>
                          )}
                        </SelectValue>
                      </span>
                    </SelectTrigger>
                    <SelectContent className={DROPDOWN_CONTENT}>
                      {TYPE_VALUES.map((t) => (
                        <SelectItem key={t} value={t} className="text-[12px]">
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                            style={{
                              backgroundColor: `color-mix(in srgb, ${TYPE_COLORS[t]} 10%, transparent)`,
                              border: `1px solid ${TYPE_COLORS[t]}`,
                              color: TYPE_COLORS[t],
                            }}
                          >
                            {t}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Due date — stacked; calendar icon + date; overdue = var(--red) */}
                <div className="border-b border-[var(--border-muted)] py-4">
                  <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-subtle)]">
                    Due date
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className="flex w-full cursor-pointer items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-[12px] font-medium text-[var(--text)] shadow-none transition-colors hover:bg-[var(--surface-hover)] focus:ring-1 focus:ring-[var(--border-hover)]"
                      >
                        <CalendarIcon className="size-3 shrink-0 text-[var(--text-subtle)]" />
                        {task.dueDate ? (
                          isPast(new Date(task.dueDate)) ? (
                            <span className="text-[var(--red)]">
                              {format(new Date(task.dueDate), "MMM d, yyyy")}
                            </span>
                          ) : (
                            format(new Date(task.dueDate), "MMM d, yyyy")
                          )
                        ) : (
                          <span className="text-[var(--text-subtle)]">
                            No date
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className={cn("w-auto p-0", DROPDOWN_CONTENT)}
                      align="start"
                    >
                      <Calendar
                        mode="single"
                        selected={
                          task.dueDate ? new Date(task.dueDate) : undefined
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

                {/* Created — read-only, font-mono */}
                <div className="border-b border-[var(--border-muted)] py-4">
                  <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-subtle)]">
                    Created
                  </span>
                  <span className="font-mono text-[11px] text-[var(--text-subtle)]">
                    {format(new Date(task.createdAt), "MMM d, yyyy")}
                  </span>
                </div>

                {/* Created by — read-only */}
                {task.createdBy && (
                  <div className="border-b border-[var(--border-muted)] py-4">
                    <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--text-subtle)]">
                      Created by
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-5 shrink-0 border border-[var(--border-muted)] bg-[var(--surface)]">
                        <AvatarFallback className="text-[9px] font-mono text-[var(--text-subtle)]">
                          {task.createdBy?.profile?.name?.charAt(0) ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-mono text-[11px] text-[var(--text-subtle)]">
                        {task.createdBy?.profile?.name ?? "User"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Danger zone — border-t mt-auto pt-6; trash + text only; red/50 → red on hover */}
                <div className="mt-auto border-t border-[var(--border-muted)] pt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex items-center gap-1.5 text-xs font-medium text-[var(--red)]/50 transition-colors hover:bg-transparent hover:text-[var(--red)]"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="size-3.5 shrink-0" />
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