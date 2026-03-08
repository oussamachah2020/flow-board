import { useQueries, useQuery } from "@tanstack/react-query";
import * as React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

import { CreateWorkspaceModal } from "~/components/dashboard/create-workspace-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Skeleton } from "~/components/ui/skeleton";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { authApi } from "~/lib/auth-api";
import { workspaceApi } from "~/lib/workspace-api";
import { useAuthStore } from "~/stores/auth.store";
import { useThemeStore } from "~/stores/theme.store";
import { Button } from "~/components/ui/button";

function FlowBoardLogo() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative size-4 shrink-0" aria-hidden>
        <span
          className="absolute left-0 top-0 size-2 rounded-[1px] border border-[var(--accent)]"
          style={{ transform: "translate(1px, 1px)" }}
        />
        <span
          className="absolute right-0 top-0 size-2 rounded-[1px] border border-[var(--accent)]"
          style={{ transform: "translate(-1px, 1px)" }}
        />
      </div>
      <span className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--accent)]">
        FlowBoard
      </span>
    </div>
  );
}

function boardDotColor(name: string): string {
  const i = (name.charCodeAt(0) ?? 0) % 5;
  const colors = ["#4d7fe5", "#4de57a", "#e5a029", "#a855f7", "#e54d4d"];
  return colors[i];
}

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [expandedWorkspaceId, setExpandedWorkspaceId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (accessToken === null) {
      navigate("/login", { replace: true });
    }
  }, [accessToken, navigate]);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => authApi.getProfile().then((r) => r.data),
    retry: (_, err) => {
      if (err && typeof err === "object" && "response" in err) {
        const status = (err as { response?: { status?: number } }).response?.status;
        if (status === 404) return false;
      }
      return true;
    },
    enabled: !!accessToken,
  });

  const { data: workspaces, isLoading: workspacesLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => workspaceApi.getWorkspaces().then((r) => r.data),
    enabled: !!accessToken,
  });

  const boardResults = useQueries({
    queries: (workspaces ?? []).map((ws) => ({
      queryKey: ["workspaces", ws.id, "boards"],
      queryFn: () => workspaceApi.getBoards(ws.id).then((r) => r.data),
    })),
  });

  const boardsByWorkspace: Record<string, Awaited<ReturnType<typeof workspaceApi.getBoards>>["data"]> = {};
  (workspaces ?? []).forEach((ws, i) => {
    const res = boardResults[i];
    if (res?.data) boardsByWorkspace[ws.id] = res.data;
  });

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    } finally {
      clearAuth();
      toast.success("Signed out");
      navigate("/login", { replace: true });
    }
  }

  const displayName = profile?.name ?? "User";
  const initial = displayName.charAt(0).toUpperCase();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  async function handleThemeClick() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      await authApi.updateTheme(next);
    } catch {
      toast.error("Failed to save theme preference");
    }
  }

  const isActive = (path: string) => location.pathname === path;
  const isBoardActive = (boardId: string) => location.pathname === `/boards/${boardId}`;
  const isWorkspaceActive = (workspaceId: string) => location.pathname === `/workspaces/${workspaceId}`;

  if (accessToken === null) {
    return null;
  }

  return (
    <div className="flex h-svh bg-[var(--bg)]">
      <aside
        className="fixed left-0 top-0 z-30 flex h-svh w-[220px] flex-col border-r border-[var(--border-muted)] bg-[var(--bg)]"
      >
        {/* Logo — 52px, border-bottom */}
        <div
          className="flex h-[52px] items-center border-b border-[var(--border-muted)] px-3"
        >
          <Link to="/dashboard" className="flex items-center gap-2">
            <FlowBoardLogo />
          </Link>
        </div>

        {/* Workspaces */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          <div className="mb-2 flex items-center justify-between px-2 py-1">
            <span
              className="section-label text-[var(--text-subtle)]"
            >
              Workspaces
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setCreateModalOpen(true)}
              className="size-8 rounded text-[var(--text-subtle)] transition-colors duration-100 hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              aria-label="Create workspace"
            >
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Button>
          </div>
          {workspacesLoading ? (
            <div className="space-y-1 px-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (
            <ul className="space-y-0.5">
              {workspaces?.map((ws) => {
                const expanded = expandedWorkspaceId === ws.id;
                const boards = boardsByWorkspace[ws.id] ?? [];
                const isActiveWs = isWorkspaceActive(ws.id);
                return (
                  <li key={ws.id}>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setExpandedWorkspaceId((id) => (id === ws.id ? null : ws.id))}
                      className={`flex h-auto w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-[13px] font-normal transition-colors duration-100 ${
                        isActiveWs
                          ? "bg-[var(--surface)] font-medium text-[var(--text)]"
                          : "font-normal text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                      }`}
                      style={{ letterSpacing: 0 }}
                    >
                      <span className="truncate">{ws.name}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        <span className="font-mono text-[11px] text-[var(--text-subtle)]">
                          {boards.length}
                        </span>
                        <svg
                          className={`size-4 transition-transform ${expanded ? "rotate-90" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </Button>
                    {expanded && (
                      <ul className="ml-2 mt-0.5 space-y-0.5 border-l border-[var(--border-muted)] pl-3">
                        {boards.map((board) => (
                          <li key={board.id}>
                            <Link
                              to={`/boards/${board.id}`}
                              className={`flex items-center gap-2 rounded py-1.5 pl-1 text-[12px] transition-colors duration-100 ${
                                isBoardActive(board.id)
                                  ? "bg-[var(--surface)] font-medium text-[var(--text)]"
                                  : "font-normal text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
                              }`}
                            >
                              <span
                                className="size-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: boardDotColor(board.name) }}
                              />
                              <span className="truncate">{board.name}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Theme toggle — above user */}
        <div className="flex justify-center border-t border-[var(--border-muted)] py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleThemeClick}
            className="rounded text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </Button>
        </div>

        {/* Bottom nav — border-top */}
        <div className="border-t border-[var(--border-muted)] px-2 py-2">
          <Link
            to="/dashboard"
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-[13px] transition-colors duration-100 ${
              isActive("/dashboard")
                ? "bg-[var(--surface)] font-medium text-[var(--text)]"
                : "font-normal text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            }`}
            style={{ letterSpacing: 0 }}
          >
            <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Dashboard
          </Link>
          <Link
            to="/my-tasks"
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-[13px] transition-colors duration-100 ${
              isActive("/my-tasks")
                ? "bg-[var(--surface)] font-medium text-[var(--text)]"
                : "font-normal text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            }`}
            style={{ letterSpacing: 0 }}
          >
            <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            My Tasks
          </Link>
          <Link
            to="/settings"
            className={`flex items-center gap-2 rounded-md px-2 py-2 text-[13px] transition-colors duration-100 ${
              isActive("/settings")
                ? "bg-[var(--surface)] font-medium text-[var(--text)]"
                : "font-normal text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
            }`}
            style={{ letterSpacing: 0 }}
          >
            <svg className="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Link>
        </div>

        {/* User — 52px, border-top */}
        <div className="flex h-[52px] items-center gap-2 border-t border-[var(--border-muted)] px-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="flex h-auto w-full items-center gap-2 rounded-md px-2 py-2 text-left font-normal transition-colors duration-100 hover:bg-[var(--surface-hover)]"
              >
                <Avatar className="size-6 border border-[var(--border)] bg-[var(--surface)]">
                  <AvatarFallback className="text-xs text-[var(--text)]">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text)]">
                  {displayName}
                </span>
                <svg
                  className="size-4 shrink-0 text-[var(--text-muted)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="top"
              className="min-w-[160px] border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
            >
              <DropdownMenuItem
                className="text-[var(--text)] focus:bg-[var(--surface-hover)]"
                onSelect={(e) => e.preventDefault()}
              >
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-[var(--text)] focus:bg-[var(--surface-hover)]"
                onSelect={handleLogout}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <main className="ml-[220px] flex-1 overflow-y-auto bg-[var(--bg-subtle)]">
        <Outlet />
      </main>

      <CreateWorkspaceModal open={createModalOpen} onOpenChange={setCreateModalOpen} />
    </div>
  );
}
