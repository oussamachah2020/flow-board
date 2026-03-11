import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import * as React from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { CreateBoardModal } from "~/components/dashboard/create-board-modal";
import { InviteMemberModal } from "~/components/workspace/invite-member-modal";
import { ConfirmDeleteDialog } from "~/components/ui/confirm-delete-dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Skeleton } from "~/components/ui/skeleton";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import type { Board, Workspace, WorkspaceMember } from "~/types/workspace";
import { workspaceApi } from "~/lib/workspace-api";

type MetaArgs = Record<string, unknown>;

export function meta({}: MetaArgs) {
  return [
    { title: "Workspace | FlowBoard" },
    { name: "description", content: "Workspace details" },
  ];
}

type Tab = "boards" | "members" | "settings";

function memberDisplayName(m: WorkspaceMember): string {
  return m.user?.profile?.name ?? m.user?.email ?? "User";
}

function memberInitial(m: WorkspaceMember): string {
  return memberDisplayName(m).charAt(0).toUpperCase();
}

export default function WorkspacePage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState<Tab>("boards");
  const [createBoardOpen, setCreateBoardOpen] = React.useState(false);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");

  const { data: workspace, isLoading: workspaceLoading } = useQuery({
    queryKey: ["workspaces", workspaceId],
    queryFn: () => workspaceApi.getWorkspace(workspaceId!).then((r) => r.data),
    enabled: !!workspaceId,
  });

  const { data: boards, isLoading: boardsLoading } = useQuery({
    queryKey: ["workspaces", workspaceId, "boards"],
    queryFn: () => workspaceApi.getBoards(workspaceId!).then((r) => r.data),
    enabled: !!workspaceId,
  });

  React.useEffect(() => {
    if (workspace) {
      document.title = workspace.name ? `${workspace.name} | FlowBoard` : "Workspace | FlowBoard";
      setName(workspace.name ?? "");
      setDescription(workspace.description ?? "");
    }
  }, [workspace?.name, workspace?.description]);

  const updateMutation = useMutation({
    mutationFn: (body: { name?: string; description?: string }) =>
      workspaceApi.updateWorkspace(workspaceId!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces", workspaceId] });
      toast.success("Workspace updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => workspaceApi.deleteWorkspace(workspaceId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      toast.success("Workspace deleted");
      navigate("/dashboard");
    },
  });

  function handleSaveSettings() {
    updateMutation.mutate({
      name: (name ?? "").trim() || undefined,
      description: (description ?? "").trim() || undefined,
    });
  }

  if (!workspaceId) return null;

  return (
    <div className="min-h-full">
      {/* Header — 64px, border-bottom */}
      <header className="flex h-16 items-center justify-between border-b border-[var(--border-muted)] px-6">
        <div className="flex items-center gap-2">
          {workspaceLoading ? (
            <Skeleton className="h-7 w-48" />
          ) : workspace ? (
            <>
              <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-[var(--text)]">
                {workspace.name}
              </h1>
              <span className="font-mono text-[12px] text-[var(--text-muted)]">
                / {workspace.slug}
              </span>
            </>
          ) : null}
        </div>
        {workspace && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className=" rounded-[6px] border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]"
              onClick={() => setInviteOpen(true)}
            >
              Invite Member
            </Button>
            <Button
              className="rounded-[6px] bg-[var(--accent)] px-4 text-[13px] font-normal text-[var(--primary-foreground)] hover:bg-[var(--accent-hover)]"
              onClick={() => setCreateBoardOpen(true)}
            >
              New Board
            </Button>
          </div>
        )}
      </header>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-muted)] px-6">
        {(["boards", "members", "settings"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`relative px-4 py-3 text-[13px] capitalize transition-colors ${
              tab === t
                ? "text-[var(--text)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]"
            }`}
          >
            {t}
            {tab === t && (
              <span className="absolute bottom-0 left-0 right-0 h-[1px] bg-[var(--accent)]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-8">
        {tab === "boards" && (
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            }}
          >
            {boardsLoading ? (
              [1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[160px] rounded-[8px]" />
              ))
            ) : boards?.length ? (
              boards.map((board) => (
                <Link
                  key={board.id}
                  to={`/boards/${board.id}`}
                  className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-6 py-5 transition-colors hover:border-[var(--border-hover)]"
                >
                  <p className="text-[13px] font-normal text-[var(--text)]">
                    {board.name}
                  </p>
                  <span className="mt-1 inline-block rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-muted)]">
                    {board.prefix}
                  </span>
                  <p className="mt-3 text-[12px] text-[var(--text-muted)]">
                    {(board as Board & { columnCount?: number }).columnCount ??
                      0}{" "}
                    columns ·{" "}
                    {(board as Board & { memberCount?: number }).memberCount ??
                      0}{" "}
                    members
                  </p>
                  <p className="mt-2 font-mono text-[11px] text-[var(--text-subtle)]">
                    Updated {format(new Date(board.updatedAt), "MMM d")}
                  </p>
                </Link>
              ))
            ) : workspace ? (
              <button
                type="button"
                onClick={() => setCreateBoardOpen(true)}
                className="flex flex-col items-center justify-center rounded-[8px] border border-dashed border-[var(--border)] bg-[var(--surface)] py-12 text-[var(--text-muted)] transition-colors hover:border-[#2a2a2a]"
              >
                <svg
                  className="mb-2 size-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create your first board
              </button>
            ) : null}
          </div>
        )}

        {tab === "members" && (
          <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            {workspaceLoading ? (
              <div className="space-y-0">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : workspace?.members?.length ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-muted)]">
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase text-[var(--text-subtle)]">
                      Member
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase text-[var(--text-subtle)]">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left font-mono text-[10px] uppercase text-[var(--text-subtle)]">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.members.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-[var(--border-muted)] last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8 border border-[var(--border)] bg-[var(--surface-hover)]">
                            <AvatarFallback className="text-[13px] text-[var(--text)]">
                              {memberInitial(member)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-[13px] font-normal text-[var(--text)]">
                              {memberDisplayName(member)}
                            </p>
                            <p className="text-[12px] text-[var(--text-muted)]">
                              {member.user?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex h-5 items-center rounded border px-2 font-mono text-[11px] ${
                            member.role === "OWNER"
                              ? "border-[var(--border)] text-[var(--accent)]"
                              : member.role === "ADMIN"
                                ? "border-[var(--border)] text-[var(--text-muted)]"
                                : "border-[var(--border-muted)] text-[var(--text-subtle)]"
                          }`}
                        >
                          {member.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-[var(--text-muted)]">
                        {format(new Date(member.joinedAt), "MMM d, yyyy")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : workspace ? (
              <div className="py-12 text-center text-[13px] text-[var(--text-muted)]">
                No members listed
              </div>
            ) : null}
          </div>
        )}

        {tab === "settings" && workspace && (
          <div className="max-w-lg space-y-8">
            <div>
              <h2 className="mb-4 text-[14px] font-medium text-[var(--text)]">
                Workspace details
              </h2>
              <div className="space-y-4 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-6">
                <div>
                  <Label htmlFor="ws-name" className="text-[var(--text-muted)]">
                    Name
                  </Label>
                  <Input
                    id="ws-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 h-9 rounded-[6px] border-[var(--border)] bg-[var(--surface)] text-[13px] focus:border-[#333333] focus:ring-0"
                  />
                </div>
                <div>
                  <Label htmlFor="ws-desc" className="text-[var(--text-muted)]">
                    Description
                  </Label>
                  <Textarea
                    id="ws-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="mt-1 rounded-[6px] border-[var(--border)] bg-[var(--surface)] min-h-0"
                    placeholder="Optional description"
                  />
                </div>
                <Button
                  className=" rounded-[6px] bg-[var(--accent)] px-4 text-[13px] font-normal text-[var(--primary-foreground)] hover:bg-[var(--accent-hover)]"
                  onClick={handleSaveSettings}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
            <div>
              <h2 className="mb-4 text-[14px] font-medium text-[var(--red)]">
                Danger zone
              </h2>
              <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-6">
                <p className="mb-3 text-[13px] text-[var(--text-muted)]">
                  Deleting this workspace will remove all boards, tasks, and
                  members. This cannot be undone.
                </p>
                <Button
                  variant="outline"
                  className=" rounded-[6px] border border-[var(--red)] bg-transparent text-[var(--red)] hover:bg-[var(--red)]/10"
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete Workspace
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <CreateBoardModal
        workspaceId={workspaceId}
        open={createBoardOpen}
        onOpenChange={setCreateBoardOpen}
      />
      <InviteMemberModal
        workspaceId={workspaceId}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete workspace"
        description="This will permanently delete the workspace and all its data."
        confirmText={workspace?.name ?? ""}
        deleteLabel="Delete Workspace"
        onConfirm={async () => {
          await deleteMutation.mutateAsync();
        }}
      />
    </div>
  );
}
