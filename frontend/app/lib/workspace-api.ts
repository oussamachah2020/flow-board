import type {
  Workspace,
  Board,
  Task,
  CreateWorkspaceRequest,
  CreateBoardRequest,
  MyTasksResponse,
} from "~/types/workspace";
import { api } from "~/lib/axios";

const WS = "/workspaces";

export const workspaceApi = {
  getWorkspaces() {
    return api.get<Workspace[]>(WS);
  },

  getWorkspace(workspaceId: string) {
    return api.get<Workspace>(`${WS}/${workspaceId}`);
  },

  createWorkspace(body: CreateWorkspaceRequest) {
    return api.post<Workspace>(WS, body);
  },

  getBoards(workspaceId: string) {
    return api.get<Board[]>(`${WS}/${workspaceId}/boards`);
  },

  createBoard(workspaceId: string, body: CreateBoardRequest) {
    return api.post<Board>(`${WS}/${workspaceId}/boards`, body);
  },

  /** Get a single board by id (includes columns). Use when you only have boardId. */
  getBoardById(boardId: string) {
    return api.get<Board>("/boards/" + encodeURIComponent(boardId));
  },

  /** Get tasks for a board (flat list). */
  getTasks(
    workspaceId: string,
    boardId: string,
    params?: {
      assigneeId?: string;
      search?: string;
      columnId?: string[];
      priority?: string[];
      type?: string[];
      overdue?: boolean;
    }
  ) {
    return api.get<Task[]>(
      `${WS}/${workspaceId}/boards/${boardId}/tasks`,
      { params }
    );
  },

  getMyTasks(workspaceId: string, boardId: string, params?: Record<string, unknown>) {
    return api.get<MyTasksResponse>(
      `${WS}/${workspaceId}/boards/${boardId}/tasks/my`,
      { params }
    );
  },

  updateWorkspace(workspaceId: string, body: { name?: string; description?: string }) {
    return api.patch<Workspace>(`${WS}/${workspaceId}`, body);
  },

  inviteMember(workspaceId: string, body: { email: string }) {
    return api.post<{ message?: string }>(`${WS}/${workspaceId}/invite`, body);
  },

  deleteWorkspace(workspaceId: string) {
    return api.delete(`${WS}/${workspaceId}`);
  },
};
