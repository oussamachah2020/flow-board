import { useQueries, useQuery } from "@tanstack/react-query";
import { format, isPast } from "date-fns";
import * as React from "react";
import { Link } from "react-router";

import { CreateTaskModal } from "~/components/dashboard/create-task-modal";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import type { Board, Task } from "~/types/workspace";
import { workspaceApi } from "~/lib/workspace-api";
import { PRIORITY_COLORS, TYPE_COLORS } from "~/lib/design-tokens";

type MetaArgs = Record<string, unknown>;

export function meta({}: MetaArgs) {
  return [
    { title: "My Tasks | FlowBoard" },
    { name: "description", content: "All tasks assigned to you" },
  ];
}

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isPast(d)) return "Overdue";
  return format(d, "MMM d");
}

function TaskRow({ task, board }: { task: Task; board?: Board }) {
  return (
    <Link
      to={`/boards/${task.boardId}${board ? `?taskId=${task.id}` : ""}`}
      className="grid grid-cols-[100px_80px_1fr_120px_80px_100px_80px] items-center gap-4 border-b border-[var(--border-muted)] px-4 py-3 text-[var(--text)] transition-colors last:border-b-0 hover:bg-[var(--surface-hover)] min-h-[48px]"
    >
      <span className="font-mono text-[12px] text-[var(--text-subtle)]">
        {task.code}
      </span>
      <span
        className="border-l-2 pl-2 font-mono text-[11px]"
        style={{
          borderColor: TYPE_COLORS[task.type] ?? TYPE_COLORS.TASK,
        }}
      >
        {task.type}
      </span>
      <span className="truncate text-[13px]">{task.title}</span>
      <span className="truncate text-[12px] text-[var(--text-muted)]">{board?.name ?? "—"}</span>
      <span className="flex items-center gap-1.5 font-mono text-[11px]">
        <span
          className="size-1.5 rounded-full"
          style={{ backgroundColor: PRIORITY_COLORS[task.priority] ?? "#555" }}
        />
        {task.priority}
      </span>
      <span
        className={`font-mono text-[12px] ${task.dueDate && isPast(new Date(task.dueDate)) ? "text-[var(--red)]" : "text-[var(--text-muted)]"}`}
      >
        {formatDueDate(task.dueDate)}
      </span>
      <span className="text-[12px] text-[var(--text-muted)]">—</span>
    </Link>
  );
}

export default function MyTasksPage() {
  const [overdueOpen, setOverdueOpen] = React.useState(true);
  const [dueTodayOpen, setDueTodayOpen] = React.useState(true);
  const [dueThisWeekOpen, setDueThisWeekOpen] = React.useState(true);
  const [noDueDateOpen, setNoDueDateOpen] = React.useState(true);
  const [createTaskModalOpen, setCreateTaskModalOpen] = React.useState(false);

  const { data: workspaces } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => workspaceApi.getWorkspaces().then((r) => r.data),
  });

  const boardQueries = useQueries({
    queries: (workspaces ?? []).map((ws) => ({
      queryKey: ["workspaces", ws.id, "boards"],
      queryFn: () => workspaceApi.getBoards(ws.id).then((r) => r.data),
    })),
  });

  const firstWorkspace = workspaces?.[0];
  const firstBoards = firstWorkspace
    ? boardQueries[(workspaces ?? []).indexOf(firstWorkspace)]?.data
    : undefined;
  const firstBoardId = firstBoards?.[0]?.id;

  const { data: myTasksData, isLoading } = useQuery({
    queryKey: ["my-tasks", firstWorkspace?.id, firstBoardId],
    queryFn: () =>
      workspaceApi
        .getMyTasks(firstWorkspace!.id, firstBoardId!)
        .then((r) => r.data),
    enabled: !!firstWorkspace?.id && !!firstBoardId,
  });

  const boardsByWorkspace: Record<string, Board[]> = {};
  (workspaces ?? []).forEach((ws, i) => {
    const res = boardQueries[i]?.data;
    if (res) boardsByWorkspace[ws.id] = res;
  });

  const getBoard = (boardId: string) =>
    Object.values(boardsByWorkspace).flat().find((b) => b.id === boardId);

  return (
    <div className="min-h-full">
      <header className="flex h-16 flex-col justify-center border-b border-[var(--border-muted)] px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-[var(--text)]">
              My Tasks
            </h1>
            <p className="text-[13px] text-[var(--text-muted)]">
              All tasks assigned to you across every board
            </p>
          </div>
          <Button
            className="h-8 rounded-[6px] bg-[var(--accent)] px-3 text-[12px] font-normal text-[var(--primary-foreground)] hover:bg-[var(--accent-hover)]"
            onClick={() => setCreateTaskModalOpen(true)}
          >
            Create task
          </Button>
        </div>
      </header>

      <div className="p-8">
        {/* Filter row — placeholder for chips */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-[var(--text-subtle)]">
            Filters (coming soon)
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-[8px]" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overdue */}
            <section className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)]">
              <button
                type="button"
                onClick={() => setOverdueOpen((o) => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-[13px] font-normal text-[var(--red)]">Overdue</span>
                <span className="font-mono text-[11px] text-[var(--red)]">
                  {(myTasksData?.overdue ?? []).length}
                </span>
                <svg
                  className={`size-4 text-[var(--red)] transition-transform ${overdueOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {overdueOpen && (
                <div>
                  {(myTasksData?.overdue ?? []).length === 0 ? (
                    <p className="py-6 text-center text-[13px] text-[var(--text-subtle)]">No tasks here</p>
                  ) : (
                    (myTasksData?.overdue ?? []).map((task) => (
                      <TaskRow key={task.id} task={task} board={getBoard(task.boardId)} />
                    ))
                  )}
                </div>
              )}
            </section>

            {/* Due Today */}
            <section className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)]">
              <button
                type="button"
                onClick={() => setDueTodayOpen((o) => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-[13px] font-normal text-[var(--amber)]">Due Today</span>
                <span className="font-mono text-[11px] text-[var(--amber)]">
                  {(myTasksData?.dueToday ?? []).length}
                </span>
                <svg
                  className={`size-4 text-[var(--amber)] transition-transform ${dueTodayOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {dueTodayOpen && (
                <div>
                  {(myTasksData?.dueToday ?? []).length === 0 ? (
                    <p className="py-6 text-center text-[13px] text-[var(--text-subtle)]">No tasks here</p>
                  ) : (
                    (myTasksData?.dueToday ?? []).map((task) => (
                      <TaskRow key={task.id} task={task} board={getBoard(task.boardId)} />
                    ))
                  )}
                </div>
              )}
            </section>

            {/* Due This Week */}
            <section className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)]">
              <button
                type="button"
                onClick={() => setDueThisWeekOpen((o) => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-[13px] font-normal text-[var(--blue)]">Due This Week</span>
                <span className="font-mono text-[11px] text-[var(--blue)]">
                  {(myTasksData?.dueThisWeek ?? []).length}
                </span>
                <svg
                  className={`size-4 text-[var(--blue)] transition-transform ${dueThisWeekOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {dueThisWeekOpen && (
                <div>
                  {(myTasksData?.dueThisWeek ?? []).length === 0 ? (
                    <p className="py-6 text-center text-[13px] text-[var(--text-subtle)]">No tasks here</p>
                  ) : (
                    (myTasksData?.dueThisWeek ?? []).map((task) => (
                      <TaskRow key={task.id} task={task} board={getBoard(task.boardId)} />
                    ))
                  )}
                </div>
              )}
            </section>

            {/* No Due Date */}
            <section className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)]">
              <button
                type="button"
                onClick={() => setNoDueDateOpen((o) => !o)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-[13px] font-normal text-[var(--text-muted)]">No Due Date</span>
                <span className="font-mono text-[11px] text-[var(--text-subtle)]">
                  {(myTasksData?.noDueDate ?? []).length}
                </span>
                <svg
                  className={`size-4 text-[var(--text-muted)] transition-transform ${noDueDateOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {noDueDateOpen && (
                <div>
                  {(myTasksData?.noDueDate ?? []).length === 0 ? (
                    <p className="py-6 text-center text-[13px] text-[var(--text-subtle)]">No tasks here</p>
                  ) : (
                    (myTasksData?.noDueDate ?? []).map((task) => (
                      <TaskRow key={task.id} task={task} board={getBoard(task.boardId)} />
                    ))
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
      <CreateTaskModal
        open={createTaskModalOpen}
        onOpenChange={setCreateTaskModalOpen}
        defaultWorkspaceId={firstWorkspace?.id}
        defaultBoardId={firstBoardId}
      />
    </div>
  );
}
