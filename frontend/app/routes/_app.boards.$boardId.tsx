import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isPast, isToday, isThisWeek } from "date-fns";
import * as React from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";

import { TaskDetailSheet } from "~/components/board/task-detail-sheet";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
import { Skeleton } from "~/components/ui/skeleton";
import { Input } from "~/components/ui/input";
import type { Board, BoardColumn, Task, WorkspaceMember } from "~/types/workspace";
import { workspaceApi } from "~/lib/workspace-api";
import { taskApi } from "~/lib/task-api";
import { boardColumnApi } from "~/lib/task-api";
import { PRIORITY_COLORS, TYPE_COLORS } from "~/lib/design-tokens";

type MetaArgs = Record<string, unknown>;

export function meta({}: MetaArgs) {
  return [
    { title: "Board | FlowBoard" },
    { name: "description", content: "Board view" },
  ];
}

const TASK_TYPES = ["TASK", "BUG", "HOTFIX", "FEATURE", "IMPROVEMENT", "TEST"] as const;
const TASK_TYPE_LABELS: Record<string, string> = {
  TASK: "T",
  BUG: "B",
  HOTFIX: "H",
  FEATURE: "F",
  IMPROVEMENT: "I",
  TEST: "TS",
};

function TaskCard({
  task,
  onClick,
}: {
  task: Task;
  onClick: () => void;
}) {
  const typeColor = TYPE_COLORS[task.type] ?? TYPE_COLORS.TASK;
  const priorityColor = PRIORITY_COLORS[task.priority] ?? "var(--text-subtle)";

  return (
    <Button
      type="button"
      variant="ghost"
      className="h-auto w-full justify-start rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-3 text-left transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-hover)]"
      style={{ borderLeftWidth: "2px", borderLeftColor: typeColor }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-[10px] text-[var(--text-subtle)]">
          {task.code}
        </span>
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: priorityColor }}
          title={task.priority}
        />
      </div>
      <p className="mt-1 line-clamp-2 text-[13px] text-[var(--text)]">{task.title}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span
          className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]"
        >
          {task.type}
        </span>
        <div className="flex items-center gap-1.5">
          {task.assigneeId && (
            <div className="flex size-5 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-hover)] text-[10px] text-[var(--text)]">
              ?
            </div>
          )}
          <span
            className={`font-mono text-[11px] ${task.dueDate && isPast(new Date(task.dueDate)) ? "text-[var(--red)]" : "text-[var(--text-subtle)]"}`}
          >
            {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "—"}
          </span>
        </div>
      </div>
    </Button>
  );
}

function SortableTaskCard({
  task,
  onClick,
}: {
  task: Task;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        onClick={() => {
          if (isDragging) return;
          onClick();
        }}
      />
    </div>
  );
}

function DroppableColumn({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`transition-colors duration-150 ${isOver ? "bg-[var(--surface-hover)]" : ""} ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function AddTaskInline({
  columnId,
  workspaceId,
  boardId,
  onDone,
}: {
  columnId: string;
  workspaceId: string;
  boardId: string;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState("TASK");
  const [priority, setPriority] = React.useState("MEDIUM");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      taskApi
        .createTask(workspaceId, boardId, {
          columnId,
          title: title.trim(),
          type,
          priority,
        })
        .then((r) => r.data),
    onSuccess: (createdTask) => {
      queryClient.setQueriesData(
        { queryKey: ["board", boardId, "tasks"] },
        (old: Task[] | undefined) => {
          if (!old || !Array.isArray(old)) return old;
          return [...old, createdTask];
        }
      );
      queryClient.invalidateQueries({ queryKey: ["board", boardId, "tasks"] });
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      toast.success("Task created");
      onDone();
    },
    onError: () => {
      toast.error("Failed to create task");
    },
  });

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!title.trim()) {
      toast.error("Task title is required");
      return;
    }
    createMutation.mutate();
  }

  return (
    <div className="rounded-[6px] border border-[var(--border)] bg-[var(--surface)] p-3">
      <Input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") onDone();
        }}
        placeholder="Task title"
        className="mb-2 h-8 rounded-[6px] border-[var(--border)] bg-[var(--surface)] text-[13px]"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-7 w-auto min-w-0 rounded-[6px] border-[var(--border)] bg-[var(--surface)] px-2 text-[11px]" title="Type">
              <span className="mr-1.5 size-2 shrink-0 rounded-full" style={{ backgroundColor: TYPE_COLORS[type] ?? TYPE_COLORS.TASK }} />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {TASK_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ backgroundColor: TYPE_COLORS[t] ?? TYPE_COLORS.TASK }} />
                    {TASK_TYPE_LABELS[t]}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={(v) => setPriority(v)}>
            <SelectTrigger className="h-7 w-auto min-w-0 rounded-[6px] border-[var(--border)] bg-[var(--surface)] px-2 text-[11px]" title="Priority">
              <span className="mr-1.5 size-2 shrink-0 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[priority] ?? "var(--text-subtle)" }} />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((p) => (
                <SelectItem key={p} value={p}>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[p] ?? "var(--text-subtle)" }} />
                    {p}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto flex gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleSubmit()}
              disabled={!title.trim() || createMutation.isPending}
              className="size-8 rounded text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              aria-label="Confirm"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDone}
              className="size-8 rounded text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              aria-label="Cancel"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>
    </div>
  );
}

export default function BoardPage() {
  const { boardId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const taskIdFromUrl = searchParams.get("taskId");
  const [sheetOpen, setSheetOpen] = React.useState(!!taskIdFromUrl);
  const [addTaskColumnId, setAddTaskColumnId] = React.useState<string | null>(null);
  const [addingColumn, setAddingColumn] = React.useState(false);
  const [newColumnName, setNewColumnName] = React.useState("");
  const [newColumnError, setNewColumnError] = React.useState("");
  const [editingColumnId, setEditingColumnId] = React.useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = React.useState("");
  const [deleteColumnId, setDeleteColumnId] = React.useState<string | null>(null);
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);
  const [localColumns, setLocalColumns] = React.useState<Record<string, Task[]>>({});

  const { data: boardRaw, isLoading: boardLoading } = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => workspaceApi.getBoardById(boardId!).then((r) => r.data),
    enabled: !!boardId,
  });

  const board = React.useMemo(() => {
    if (!boardRaw) return undefined;
    const wid =
      (boardRaw as Board & { workspace_id?: string }).workspaceId ??
      (boardRaw as Board & { workspace_id?: string }).workspace_id;
    return wid ? { ...boardRaw, workspaceId: wid } : boardRaw;
  }, [boardRaw]);

  const filters = React.useMemo(
    () => ({
      search: searchParams.get("search") ?? undefined,
      assigneeId: searchParams.get("assigneeId") ?? undefined,
      priority: searchParams.getAll("priority"),
      type: searchParams.getAll("type"),
      due: searchParams.get("due") ?? undefined,
      columnId: searchParams.getAll("columnId"),
    }),
    [searchParams]
  );

  const hasActiveFilters = React.useMemo(
    () =>
      Object.entries(filters).some(([k, v]) =>
        k === "search" ? (typeof v === "string" ? !!v?.trim() : false) : Array.isArray(v) ? v.length > 0 : !!v
      ),
    [filters]
  );

  const { data: workspace } = useQuery({
    queryKey: ["workspace", board?.workspaceId],
    queryFn: () =>
      workspaceApi.getWorkspace(board!.workspaceId).then((r) => r.data),
    enabled: !!board?.workspaceId,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["board", boardId, "tasks", board?.workspaceId],
    queryFn: () =>
      workspaceApi.getTasks(board!.workspaceId, board!.id).then((r) => r.data),
    enabled: !!boardId && !!board?.workspaceId,
  });

  const allTasks = React.useMemo(() => tasks ?? [], [tasks]);

  const filteredTasks = React.useMemo(() => {
    let result = allTasks;
    const searchStr = typeof filters.search === "string" ? filters.search : "";
    if (searchStr?.trim()) {
      const q = searchStr.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.code && t.code.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }
    if (filters.assigneeId) {
      result = result.filter((t) => t.assigneeId === filters.assigneeId);
    }
    if (filters.priority.length) {
      result = result.filter((t) => filters.priority.includes(t.priority));
    }
    if (filters.type.length) {
      result = result.filter((t) => filters.type.includes(t.type));
    }
    if (filters.due === "overdue") {
      result = result.filter(
        (t) => t.dueDate && isPast(new Date(t.dueDate))
      );
    }
    if (filters.due === "today") {
      result = result.filter(
        (t) => t.dueDate && isToday(new Date(t.dueDate))
      );
    }
    if (filters.due === "week") {
      result = result.filter(
        (t) => t.dueDate && isThisWeek(new Date(t.dueDate))
      );
    }
    if (filters.columnId.length) {
      result = result.filter((t) => {
        const cid = (t as Task & { column_id?: string }).columnId ?? (t as Task & { column_id?: string }).column_id;
        return cid != null && filters.columnId.includes(cid);
      });
    }
    return result;
  }, [allTasks, filters]);

  const groupedByColumn = React.useMemo(() => {
    const grouped: Record<string, Task[]> = {};
    for (const t of filteredTasks) {
      const key =
        (t as Task & { column_id?: string }).columnId ??
        (t as Task & { column_id?: string }).column_id;
      if (!key) continue;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(t);
    }
    for (const key of Object.keys(grouped)) {
      grouped[key] = grouped[key].slice().sort((a, b) => a.order - b.order);
    }
    return grouped;
  }, [filteredTasks]);

  React.useEffect(() => {
    if (activeTask !== null) return;
    setLocalColumns(groupedByColumn);
  }, [groupedByColumn, activeTask]);

  const moveTaskMutation = useMutation({
    mutationFn: ({
      taskId,
      columnId,
      order,
      expectedVersion,
    }: {
      taskId: string;
      columnId: string;
      order: number;
      expectedVersion: number;
    }) =>
      taskApi
        .moveTask(board!.workspaceId, board!.id, taskId, {
          columnId,
          order: Number(order),
          expectedVersion: Number(expectedVersion),
        })
        .then((r) => r.data),
    onSuccess: async (updatedTask) => {
      const taskKey = ["board", boardId, "tasks", board?.workspaceId];
      if (updatedTask?.id) {
        const resolvedColumnId =
          (updatedTask as Task & { column_id?: string }).columnId ??
          (updatedTask as Task & { column_id?: string }).column_id;
        queryClient.setQueryData<Task[]>(taskKey, (old) => {
          if (!Array.isArray(old)) return old;
          return old.map((t) =>
            t.id === updatedTask.id
              ? {
                  ...t,
                  ...updatedTask,
                  columnId: resolvedColumnId ?? t.columnId,
                  version: updatedTask.version ?? t.version,
                }
              : t
          );
        });
      }
      await queryClient.refetchQueries({ queryKey: taskKey });
      toast.success("Task moved");
    },
    onError: (err: unknown) => {
      queryClient.invalidateQueries({
        queryKey: ["board", boardId, "tasks", board?.workspaceId],
      });
      const status =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 409) {
        toast.error("Task was updated by someone else");
      } else {
        toast.error("Failed to move task");
      }
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const updateFilters = React.useCallback(
    (updater: (prev: URLSearchParams) => URLSearchParams) => {
      setSearchParams(updater);
    },
    [setSearchParams]
  );

  React.useEffect(() => {
    if (board?.name) document.title = `${board.name} | FlowBoard`;
  }, [board?.name]);

  React.useEffect(() => {
    setSheetOpen(!!taskIdFromUrl);
  }, [taskIdFromUrl]);

  const openTask = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("taskId", id);
      return next;
    });
    setSheetOpen(true);
  };

  const closeTask = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("taskId");
      return next;
    }, { replace: true });
    setSheetOpen(false);
  };

  const createColumnMutation = useMutation({
    mutationFn: (name: string) =>
      boardColumnApi
        .createColumn(board!.workspaceId, board!.id, { name })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setAddingColumn(false);
      setNewColumnName("");
      setNewColumnError("");
    },
    onError: () => {
      toast.error("Failed to create column");
    },
  });

  const renameColumnMutation = useMutation({
    mutationFn: ({ columnId, name }: { columnId: string; name: string }) =>
      boardColumnApi
        .renameColumn(board!.workspaceId, board!.id, columnId, { name })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setEditingColumnId(null);
      setEditingColumnName("");
    },
    onError: () => {
      toast.error("Failed to rename column");
    },
  });

  const deleteColumnMutation = useMutation({
    mutationFn: (columnId: string) =>
      boardColumnApi.deleteColumn(board!.workspaceId, board!.id, columnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", boardId] });
      setDeleteColumnId(null);
    },
    onError: (err: unknown) => {
      const res =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
          : undefined;
      const msg =
        res?.data?.message && typeof res.data.message === "string"
          ? res.data.message
          : "Failed to delete column";
      toast.error(msg);
    },
  });

  function handleAddColumnSubmit() {
    const name = newColumnName.trim();
    if (!name) {
      setNewColumnError("Name is required");
      return;
    }
    if (name.length > 50) {
      setNewColumnError("Name must be at most 50 characters");
      return;
    }
    setNewColumnError("");
    createColumnMutation.mutate(name);
  }

  function handleStartAddColumn() {
    setAddTaskColumnId(null);
    setAddingColumn(true);
    setNewColumnName("");
    setNewColumnError("");
  }

  function handleStartRename(column: BoardColumn) {
    setEditingColumnId(column.id);
    setEditingColumnName(column.name);
  }

  const handleDragStart = (event: DragStartEvent) => {
    const task = allTasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeTaskId = active.id as string;
    const overId = over.id as string;
    const activeColumnId = Object.keys(localColumns).find((colId) =>
      localColumns[colId].some((t) => t.id === activeTaskId)
    );
    const overColumnId =
      Object.keys(localColumns).find((colId) =>
        localColumns[colId].some((t) => t.id === overId)
      ) ?? overId;
    if (!activeColumnId || !overColumnId || activeColumnId === overColumnId)
      return;
    setLocalColumns((prev) => {
      const activeItems = [...prev[activeColumnId]];
      const overItems = [...(prev[overColumnId] ?? [])];
      const taskIndex = activeItems.findIndex((t) => t.id === activeTaskId);
      const [movedTask] = activeItems.splice(taskIndex, 1);
      const updatedTask = { ...movedTask, columnId: overColumnId };
      overItems.push(updatedTask);
      return {
        ...prev,
        [activeColumnId]: activeItems,
        [overColumnId]: overItems,
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    const activeTaskId = active.id as string;
    const overId = over.id as string;
    const activeColumnId = Object.keys(localColumns).find((colId) =>
      localColumns[colId].some((t) => t.id === activeTaskId)
    );
    const columnIds = columns.map((c) => c.id);
    const overColumnId = columnIds.includes(overId)
      ? overId
      : Object.keys(localColumns).find((colId) =>
          localColumns[colId].some((t) => t.id === overId)
        ) ?? overId;
    if (!activeColumnId || !overColumnId) return;
    const activeIndex = localColumns[activeColumnId].findIndex(
      (t) => t.id === activeTaskId
    );
    const overIndex = localColumns[overColumnId]?.findIndex(
      (t) => t.id === overId
    ) ?? -1;
    const resolvedOverIndex = overIndex >= 0 ? overIndex : 0;
    if (activeColumnId === overColumnId && activeIndex !== resolvedOverIndex) {
      setLocalColumns((prev) => ({
        ...prev,
        [activeColumnId]: arrayMove(
          prev[activeColumnId],
          activeIndex,
          resolvedOverIndex
        ),
      }));
    }
    const task =
      allTasks.find((t) => t.id === activeTaskId) ??
      localColumns[activeColumnId]?.find((t) => t.id === activeTaskId) ??
      localColumns[overColumnId]?.find((t) => t.id === activeTaskId);
    if (task) {
      moveTaskMutation.mutate({
        taskId: activeTaskId,
        columnId: overColumnId,
        order: resolvedOverIndex,
        expectedVersion: Number((task as Task & { version?: number }).version ?? 1),
      });
    }
  };

  const columns = board?.columns ?? [];
  const loading = boardLoading;
  const members = workspace?.members ?? [];

  function filterTriggerClass(active: boolean) {
    return active
      ? "border-[var(--border-hover)] bg-[var(--surface-hover)] text-[var(--text)]"
      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)]";
  }

  if (!board && !loading) {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] py-12 text-center">
          <p className="text-[13px] text-[var(--text-muted)]">Board not found or you don’t have access.</p>
          <Button asChild variant="outline" className="mt-4 h-[34px] rounded-[6px] border-[var(--border)] hover:bg-[var(--surface-hover)]">
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>

        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header — 64px, border-bottom */}
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-[var(--border-muted)] px-6">
        <div>
          {loading ? (
            <Skeleton className="h-5 w-48" />
          ) : board ? (
            <>
              <h1 className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--text)]">
                {board.name}
              </h1>
              <p className="font-mono text-[12px] text-[var(--text-muted)]">
                {board.workspaceId ? "Workspace" : ""} / {board.prefix}
              </p>
            </>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <Button
            className=" rounded-[6px] bg-[var(--accent)] px-4 text-[13px] font-normal text-[var(--primary-foreground)] hover:bg-[var(--accent-hover)]"
            onClick={() => {
              const firstCol = columns[0];
              if (firstCol) setAddTaskColumnId(firstCol.id);
            }}
          >
            Add Task
          </Button>
        </div>
      </header>

      {/* Filter bar */}
      <div
        className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--border-muted)] bg-[var(--bg)] px-6 py-3"
        style={{ padding: "12px 24px" }}
      >
        <div className="flex items-center gap-1.5">
          <div className="flex h-7 min-w-[160px] max-w-[240px] items-center gap-2 rounded-[5px] border border-[var(--border)] bg-[var(--surface)] px-2.5">
            <svg
              className="size-3.5 shrink-0 text-[var(--text-subtle)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <Input
              type="search"
              value={typeof filters.search === "string" ? filters.search : ""}
              onChange={(e) => {
                const v = e.target.value;
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  if (typeof v === "string" && v.trim()) next.set("search", v);
                  else next.delete("search");
                  return next;
                });
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete("search");
                    return next;
                  });
                }
              }}
              placeholder="Search tasks..."
              className="h-5 min-w-0 flex-1 border-0 bg-transparent p-0 text-[12px] text-[var(--text)] placeholder:text-[var(--text-subtle)] focus-visible:ring-0"
              aria-label="Search tasks"
            />
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`flex h-7 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12px] ${filterTriggerClass(!!filters.assigneeId)}`}
              >
                Assignee {filters.assigneeId ? "· 1" : "▾"}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="min-w-[180px] border-[var(--border)] bg-[var(--surface)] p-1.5"
            >
              {members.map((member) => {
                const name =
                  member.user?.profile?.name ??
                  member.user?.email ??
                  "Unknown";
                const isChecked = filters.assigneeId === member.userId;
                return (
                  <button
                    key={member.id}
                    type="button"
                    className="flex h-8 w-full items-center gap-2 rounded-[5px] px-2 text-[12px] text-[var(--text)] hover:bg-[var(--surface-hover)]"
                    onClick={() => {
                      updateFilters((prev) => {
                        const next = new URLSearchParams(prev);
                        if (isChecked) next.delete("assigneeId");
                        else next.set("assigneeId", member.userId);
                        return next;
                      });
                    }}
                  >
                    <Checkbox checked={isChecked} size={14} readOnly />
                    <Avatar className="size-5">
                      <AvatarFallback className="text-[10px]">
                        {name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{name}</span>
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`flex h-7 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12px] ${filterTriggerClass(filters.priority.length > 0)}`}
              >
                Priority {filters.priority.length ? `· ${filters.priority.length}` : "▾"}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="min-w-[180px] border-[var(--border)] bg-[var(--surface)] p-1.5"
            >
              {(["LOW", "MEDIUM", "HIGH", "URGENT"] as const).map((p) => {
                const isChecked = filters.priority.includes(p);
                const dotColor = PRIORITY_COLORS[p] ?? "#555555";
                return (
                  <button
                    key={p}
                    type="button"
                    className="flex h-8 w-full items-center gap-2 rounded-[5px] px-2 text-[12px] text-[var(--text)] hover:bg-[var(--surface-hover)]"
                    onClick={() => {
                      updateFilters((prev) => {
                        const next = new URLSearchParams(prev);
                        const current = next.getAll("priority");
                        const nextPriorities = current.includes(p)
                          ? current.filter((x) => x !== p)
                          : [...current, p];
                        next.delete("priority");
                        nextPriorities.forEach((v) => next.append("priority", v));
                        return next;
                      });
                    }}
                  >
                    <Checkbox checked={isChecked} size={14} readOnly />
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: dotColor }}
                    />
                    {p}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`flex h-7 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12px] ${filterTriggerClass(filters.type.length > 0)}`}
              >
                Type {filters.type.length ? `· ${filters.type.length}` : "▾"}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="min-w-[180px] border-[var(--border)] bg-[var(--surface)] p-1.5"
            >
              {TASK_TYPES.map((t) => {
                const isChecked = filters.type.includes(t);
                const barColor = TYPE_COLORS[t] ?? TYPE_COLORS.TASK;
                return (
                  <button
                    key={t}
                    type="button"
                    className="flex h-8 w-full items-center gap-2 rounded-[5px] px-2 text-[12px] text-[var(--text)] hover:bg-[var(--surface-hover)]"
                    onClick={() => {
                      updateFilters((prev) => {
                        const next = new URLSearchParams(prev);
                        const current = next.getAll("type");
                        const nextTypes = current.includes(t)
                          ? current.filter((x) => x !== t)
                          : [...current, t];
                        next.delete("type");
                        nextTypes.forEach((v) => next.append("type", v));
                        return next;
                      });
                    }}
                  >
                    <Checkbox checked={isChecked} size={14} readOnly />
                    <span
                      className="w-0.5 shrink-0 self-stretch rounded-sm"
                      style={{ backgroundColor: barColor, minHeight: 14 }}
                    />
                    {t}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`flex h-7 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12px] ${filterTriggerClass(!!filters.due)}`}
              >
                Due date {filters.due ? "· 1" : "▾"}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="min-w-[180px] border-[var(--border)] bg-[var(--surface)] p-1.5"
            >
              {[
                { value: "overdue", label: "Overdue" },
                { value: "today", label: "Due today" },
                { value: "week", label: "Due this week" },
              ].map(({ value, label }) => {
                const isChecked = filters.due === value;
                return (
                  <button
                    key={value}
                    type="button"
                    className="flex h-8 w-full items-center gap-2 rounded-[5px] px-2 text-[12px] text-[var(--text)] hover:bg-[var(--surface-hover)]"
                    onClick={() => {
                      updateFilters((prev) => {
                        const next = new URLSearchParams(prev);
                        if (isChecked) next.delete("due");
                        else next.set("due", value);
                        return next;
                      });
                    }}
                  >
                    <span
                      className="size-[14px] shrink-0 rounded-full border border-[var(--border)]"
                      style={{
                        borderWidth: isChecked ? 4 : 1,
                        backgroundColor: isChecked ? "var(--accent)" : "transparent",
                      }}
                    />
                    {label}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`flex h-7 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12px] ${filterTriggerClass(filters.columnId.length > 0)}`}
              >
                Column {filters.columnId.length ? `· ${filters.columnId.length}` : "▾"}
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="min-w-[180px] border-[var(--border)] bg-[var(--surface)] p-1.5"
            >
              {columns.map((col) => {
                const isChecked = filters.columnId.includes(col.id);
                return (
                  <button
                    key={col.id}
                    type="button"
                    className="flex h-8 w-full items-center gap-2 rounded-[5px] px-2 text-[12px] text-[var(--text)] hover:bg-[var(--surface-hover)]"
                    onClick={() => {
                      updateFilters((prev) => {
                        const next = new URLSearchParams(prev);
                        const current = next.getAll("columnId");
                        const nextIds = current.includes(col.id)
                          ? current.filter((x) => x !== col.id)
                          : [...current, col.id];
                        next.delete("columnId");
                        nextIds.forEach((v) => next.append("columnId", v));
                        return next;
                      });
                    }}
                  >
                    <Checkbox checked={isChecked} size={14} readOnly />
                    {col.name}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <>
              <span className="font-mono text-[11px] text-[var(--text-subtle)]">
                Showing {filteredTasks.length} of {allTasks.length} tasks
              </span>
              <Button
                type="button"
                variant="ghost"
                className="h-auto p-0 text-[12px] text-[var(--text-subtle)] hover:text-[var(--red)]"
                onClick={() => {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.delete("search");
                    next.delete("assigneeId");
                    next.delete("priority");
                    next.delete("type");
                    next.delete("due");
                    next.delete("columnId");
                    return next;
                  });
                }}
              >
                Clear all
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto p-6">
        {tasksLoading && columns.length > 0 ? (
          <div className="flex gap-3">
            {columns.map((col) => (
              <Skeleton key={col.id} className="h-64 w-[280px] shrink-0 rounded-[8px]" />
            ))}
          </div>
        ) : columns.length === 0 && !addingColumn ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-[8px] border border-dashed border-[var(--border)] bg-[var(--surface)]">
            <svg
              className="size-10 text-[var(--text-muted)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <rect x="6" y="4" width="4" height="16" rx="1" strokeWidth={2} />
              <rect x="14" y="4" width="4" height="16" rx="1" strokeWidth={2} />
              <rect x="10" y="4" width="4" height="16" rx="1" strokeWidth={2} />
            </svg>
            <h2 className="text-[14px] font-medium text-[var(--text)]">
              No columns yet
            </h2>
            <p className="text-[13px] text-[var(--text-muted)]">
              Create your first column to start organizing tasks
            </p>
            <Button
              className="h-[34px] rounded-[6px] bg-[var(--accent)] px-4 text-[13px] font-normal text-[var(--primary-foreground)] hover:bg-[var(--accent-hover)]"
              onClick={handleStartAddColumn}
            >
              Add Column
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-3">
              {columns.map((column) => {
                const columnTasks = (localColumns[column.id] ?? []).slice().sort((a, b) => a.order - b.order);
                const isEditing = editingColumnId === column.id;
                return (
                  <div
                    key={column.id}
                    className="flex w-[280px] shrink-0 flex-col rounded-[8px] border border-[var(--border)] bg-[var(--bg-subtle)]"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-[var(--border-muted)] px-3 py-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        {isEditing ? (
                        <>
                          <Input
                            type="text"
                            value={editingColumnName}
                            onChange={(e) => setEditingColumnName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const name = editingColumnName.trim();
                                if (name && name.length <= 50) renameColumnMutation.mutate({ columnId: column.id, name });
                              }
                              if (e.key === "Escape") {
                                setEditingColumnId(null);
                                setEditingColumnName("");
                              }
                            }}
                            className="min-w-0 flex-1 rounded-[6px] border-[var(--border)] bg-[var(--surface)] py-1 text-[13px]"
                            autoFocus
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const name = editingColumnName.trim();
                              if (name && name.length <= 50) renameColumnMutation.mutate({ columnId: column.id, name });
                            }}
                            disabled={!editingColumnName.trim() || editingColumnName.trim().length > 50 || renameColumnMutation.isPending}
                            className="size-8 shrink-0 rounded text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                            aria-label="Confirm"
                          >
                            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => { setEditingColumnId(null); setEditingColumnName(""); }}
                            className="size-8 shrink-0 rounded text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                            aria-label="Cancel"
                          >
                            <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </Button>
                        </>
                      ) : (
                        <>
                          <h3 className="truncate text-[13px] font-normal text-[var(--text)]">
                            {column.name}
                          </h3>
                          <span className="shrink-0 font-mono text-[11px] text-[var(--text-subtle)]">
                            {columnTasks.length}
                          </span>
                        </>
                      )}
                    </div>
                    {!isEditing && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 rounded text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                          onClick={() => setAddTaskColumnId(column.id)}
                          aria-label="Add task"
                        >
                          <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                              aria-label="Column menu"
                            >
                              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                              </svg>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="start"
                            className="min-w-[120px] border-[var(--border)] bg-[var(--surface)]"
                          >
                            <DropdownMenuItem
                              className="text-[var(--text)] focus:bg-[var(--surface-hover)]"
                              onSelect={() => handleStartRename(column)}
                            >
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-[var(--red)] focus:bg-[var(--surface-hover)]"
                              onSelect={() => setDeleteColumnId(column.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                  <DroppableColumn
                    id={column.id}
                    className="flex flex-col gap-1.5 overflow-y-auto p-3"
                  >
                    {addTaskColumnId === column.id && board && (
                      <AddTaskInline
                        columnId={column.id}
                        workspaceId={board.workspaceId}
                        boardId={board.id}
                        onDone={() => setAddTaskColumnId(null)}
                      />
                    )}
                    {columnTasks.length === 0 && addTaskColumnId !== column.id ? (
                      <p className="py-6 text-center font-mono text-[11px] text-[var(--text-subtle)]">
                        No tasks
                      </p>
                    ) : (
                      <SortableContext
                        items={columnTasks.map((t) => t.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {columnTasks.map((task) => (
                          <SortableTaskCard
                            key={task.id}
                            task={task}
                            onClick={() => openTask(task.id)}
                          />
                        ))}
                      </SortableContext>
                    )}
                  </DroppableColumn>
                </div>
              );
            })}
            {addingColumn && board && (
              <div className="flex w-[280px] shrink-0 flex-col rounded-[8px] border border-[var(--border)] bg-[var(--bg-subtle)] p-3">
                <Input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => {
                    setNewColumnName(e.target.value);
                    setNewColumnError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddColumnSubmit();
                    if (e.key === "Escape") {
                      setAddingColumn(false);
                      setNewColumnName("");
                      setNewColumnError("");
                    }
                  }}
                  placeholder="Column name"
                  className="rounded-[6px] border-[var(--border)] bg-[var(--surface)] text-[13px]"
                  autoFocus
                />
                {newColumnError && (
                  <p className="mt-1 text-[12px] text-[var(--red)]">{newColumnError}</p>
                )}
                <div className="mt-2 flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleAddColumnSubmit}
                    disabled={createColumnMutation.isPending}
                    className="size-8 rounded text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                    aria-label="Confirm"
                  >
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setAddingColumn(false);
                      setNewColumnName("");
                      setNewColumnError("");
                    }}
                    className="size-8 rounded text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                    aria-label="Cancel"
                  >
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              </div>
            )}
            {columns.length > 0 && !addingColumn && board && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleStartAddColumn}
                className="flex h-[40px] w-[200px] shrink-0 items-center justify-center gap-2 self-start rounded-[8px] border border-dashed border-[var(--border)] bg-transparent text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text)]"
              >
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add column
              </Button>
            )}
            </div>
            <DragOverlay>
              {activeTask ? (
                <div
                  style={{
                    transform: "rotate(1.5deg)",
                    opacity: 0.95,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                  }}
                >
                  <TaskCard task={activeTask} onClick={() => {}} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {board && deleteColumnId && (
        <Dialog open={!!deleteColumnId} onOpenChange={(open) => !open && setDeleteColumnId(null)}>
          <DialogContent className="border-[var(--border)] bg-[var(--surface)] text-[var(--text)]">
            <DialogHeader>
              <DialogTitle className="text-[18px] font-normal">
                Delete column?
              </DialogTitle>
              <p className="text-[13px] text-[var(--text-muted)]">
                This will block deletion if tasks exist. Move or delete tasks first.
              </p>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                className="h-[34px] rounded-[6px] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
                onClick={() => setDeleteColumnId(null)}
              >
                Cancel
              </Button>
              <Button
                className="h-[34px] rounded-[6px] border border-[var(--red)] bg-transparent text-[var(--red)] hover:bg-[var(--red)]/10"
                onClick={() => deleteColumnId && deleteColumnMutation.mutate(deleteColumnId)}
                disabled={deleteColumnMutation.isPending}
              >
                {deleteColumnMutation.isPending ? "Deleting…" : "Delete column"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {board && (
        <TaskDetailSheet
          workspaceId={board.workspaceId}
          boardId={board.id}
          taskId={taskIdFromUrl}
          open={sheetOpen}
          onOpenChange={(open) => !open && closeTask()}
          board={board}
        />
      )}
    </div>
  );
}
