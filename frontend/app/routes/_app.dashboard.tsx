import { useQueries, useQuery } from "@tanstack/react-query";
import { format, isPast } from "date-fns";
import * as React from "react";
import { Link } from "react-router";

import { CreateTaskModal } from "~/components/dashboard/create-task-modal";
import { CreateWorkspaceModal } from "~/components/dashboard/create-workspace-modal";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import type { Board, Task, Workspace } from "~/types/workspace";
import { workspaceApi } from "~/lib/workspace-api";

type MetaArgs = Record<string, unknown>;

export function meta({}: MetaArgs) {
  return [
    { title: "Dashboard | FlowBoard" },
    { name: "description", content: "Your FlowBoard dashboard" },
  ];
}

function formatDueDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isPast(d)) return "Overdue";
  return format(d, "MMM d");
}

export default function DashboardPage() {
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [createTaskModalOpen, setCreateTaskModalOpen] = React.useState(false);

  const { data: workspaces, isLoading: workspacesLoading } = useQuery({
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

  const { data: myTasksData, isLoading: myTasksLoading } = useQuery({
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

  const allOverdue = (myTasksData?.overdue ?? []).length;
  const allDueToday = (myTasksData?.dueToday ?? []).length;
  const allDueThisWeek = (myTasksData?.dueThisWeek ?? []).length;

  const urgentTasks: (Task & { board?: Board })[] = [
    ...(myTasksData?.overdue ?? []),
    ...(myTasksData?.dueToday ?? []),
    ...(myTasksData?.dueThisWeek ?? []),
  ].slice(0, 5);

  const todayFormatted = format(new Date(), "EEEE, MMMM d");
  const dateMono = format(new Date(), "MMM d, yyyy");

  return (
    <div className="min-h-full">
      {/* Header — 64px, border-bottom, padding 24px */}
      <header className="flex h-16 items-center justify-between border-b border-[var(--border-muted)] px-6">
        <h1 className="text-[18px] font-medium tracking-[-0.01em] text-[var(--text)]">
          Dashboard
        </h1>
        <span
          className="text-[11px] text-[var(--text-muted)]"
        >
          {dateMono}
        </span>
      </header>

      {/* Content — full width, padding */}
      <div className="w-full p-8">
        {/* My Tasks Summary */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <p className="section-label text-[var(--text-subtle)]">
              My Tasks
            </p>
            <Button
              className="h-8 rounded-[6px] bg-[var(--accent)] px-3 text-[12px] font-normal text-[var(--primary-foreground)] hover:bg-[var(--accent-hover)]"
              onClick={() => setCreateTaskModalOpen(true)}
            >
              Create task
            </Button>
          </div>
          {myTasksLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[88px] rounded-[8px]" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div
                  className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-6 py-5 transition-colors hover:border-[#2a2a2a]"
                >
                  <p className="font-mono text-[11px] uppercase text-[var(--text-muted)]">
                    Overdue
                  </p>
                  <p className="mt-1 text-[32px] font-normal text-[var(--red)]">
                    {allOverdue}
                  </p>
                </div>
                <div
                  className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-6 py-5 transition-colors hover:border-[#2a2a2a]"
                >
                  <p className="font-mono text-[11px] uppercase text-[var(--text-muted)]">
                    Due Today
                  </p>
                  <p className="mt-1 text-[32px] font-normal text-[var(--amber)]">
                    {allDueToday}
                  </p>
                </div>
                <div
                  className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-6 py-5 transition-colors hover:border-[#2a2a2a]"
                >
                  <p className="font-mono text-[11px] uppercase text-[var(--text-muted)]">
                    Due This Week
                  </p>
                  <p className="mt-1 text-[32px] font-normal text-[var(--blue)]">
                    {allDueThisWeek}
                  </p>
                </div>
              </div>
              <div className="mt-4 border border-[var(--border)] bg-[var(--surface)] rounded-[8px] overflow-hidden">
                {urgentTasks.length === 0 ? (
                  <div className="py-6 text-center text-[13px] text-[var(--text-muted)]">
                    No urgent tasks
                  </div>
                ) : (
                  <ul>
                    {urgentTasks.map((task) => (
                      <li key={task.id}>
                        <Link
                          to={`/boards/${task.boardId}`}
                          className="grid grid-cols-[120px_1fr_100px_80px_100px] items-center gap-4 border-b border-[var(--border-muted)] px-4 py-3 text-[var(--text)] transition-colors last:border-b-0 hover:bg-[var(--surface-hover)] hover:cursor-pointer"
                        >
                          <span className="font-mono text-[12px] text-[var(--text-subtle)]">
                            {task.code}
                          </span>
                          <span className="truncate text-[13px]">{task.title}</span>
                          <span
                            className="flex items-center gap-1.5 border-l-2 pl-2 text-[11px] font-mono"
                            style={{
                              borderColor: TYPE_COLORS[task.type] ?? TYPE_COLORS.TASK,
                            }}
                          >
                            {task.type}
                          </span>
                          <span className="flex items-center gap-1.5 text-[11px] font-mono">
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
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Link
                to="/my-tasks"
                className="mt-2 inline-block text-[12px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
              >
                View all my tasks →
              </Link>
            </>
          )}
        </section>

        {/* Workspaces */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <p
              className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-subtle)]"
            >
              Workspaces
            </p>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="rounded p-1 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              aria-label="Create workspace"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          {workspacesLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[180px] rounded-[8px]" />
              ))}
            </div>
          ) : !workspaces?.length ? (
            <div
              className="flex flex-col items-center justify-center rounded-[8px] border border-dashed border-[var(--border)] bg-[var(--surface)] py-12"
            >
              <div className="mb-3 rounded-full p-3 text-[var(--text-subtle)]">
                <svg className="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="mb-3 text-[13px] text-[var(--text-muted)]">No workspaces yet</p>
              <Button
                className="h-[34px] rounded-[6px] bg-[var(--accent)] px-4 text-[13px] text-[#080808] hover:bg-[#e0e0e0]"
              className="font-normal"
              onClick={() => setCreateModalOpen(true)}
              >
                Create workspace
              </Button>
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {workspaces.map((ws) => {
                const boards = boardsByWorkspace[ws.id] ?? [];
                const memberCount = ws.members?.length ?? 0;
                return (
                  <Link
                    key={ws.id}
                    to={`/workspaces/${ws.id}`}
                    className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-6 py-5 transition-colors hover:border-[#2a2a2a]"
                  >
                    <p className="text-[13px] font-normal text-[var(--text)]">{ws.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--text-subtle)]">
                      {ws.slug}
                    </p>
                    <div className="my-4 border-t border-[var(--border-muted)]" />
                    <p className="text-[12px] text-[var(--text-muted)]">
                      {boards.length} boards · {memberCount} members
                    </p>
                    <div className="mt-3 flex -space-x-1.5">
                      {ws.members?.slice(0, 4).map((m) => (
                        <div
                          key={m.id}
                          className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--bg)] bg-[var(--surface-hover)] text-[10px] text-[var(--text)]"
                        >
                          {(m.user?.profile?.name ?? m.user?.email ?? "?").charAt(0).toUpperCase()}
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 font-mono text-[11px] text-[var(--text-subtle)]">
                      Updated {format(new Date(ws.updatedAt), "MMM d")}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Recent Activity */}
        <section>
          <p className="mb-4 section-label text-[var(--text-subtle)]">
            Recent Activity
          </p>
          <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="flex min-h-[48px] items-center gap-3">
              <div className="flex size-5 items-center justify-center rounded-full bg-[var(--surface-hover)] font-mono text-[10px] text-[var(--text-subtle)]">
                —
              </div>
              <p className="text-[13px] text-[var(--text-muted)]">No recent activity</p>
              <span className="ml-auto font-mono text-[11px] text-[var(--text-subtle)]">
                —
              </span>
            </div>
          </div>
        </section>
      </div>

      <CreateWorkspaceModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
      <CreateTaskModal
        open={createTaskModalOpen}
        onOpenChange={setCreateTaskModalOpen}
        defaultWorkspaceId={firstWorkspace?.id}
        defaultBoardId={firstBoardId}
      />
    </div>
  );
}
