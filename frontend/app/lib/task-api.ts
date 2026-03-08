import type { Task, Comment, BoardColumn } from "~/types/workspace";
import { api } from "~/lib/axios";

function taskPath(workspaceId: string, boardId: string) {
  return `/workspaces/${workspaceId}/boards/${boardId}/tasks`;
}

export const taskApi = {
  createTask(
    workspaceId: string,
    boardId: string,
    body: { columnId: string; title: string; description?: string; type?: string; priority?: string; dueDate?: string; assigneeId?: string }
  ) {
    return api.post<Task>(taskPath(workspaceId, boardId), body);
  },

  getTask(workspaceId: string, boardId: string, taskId: string) {
    return api.get<Task>(`${taskPath(workspaceId, boardId)}/${taskId}`);
  },

  updateTask(
    workspaceId: string,
    boardId: string,
    taskId: string,
    body: { expectedVersion: number; title?: string; description?: string; type?: string; priority?: string; dueDate?: string | null; assigneeId?: string | null }
  ) {
    return api.patch<Task>(`${taskPath(workspaceId, boardId)}/${taskId}`, body);
  },

  moveTask(
    workspaceId: string,
    boardId: string,
    taskId: string,
    body: { columnId: string; order: number; expectedVersion: number }
  ) {
    return api.patch<Task>(`${taskPath(workspaceId, boardId)}/${taskId}/move`, body);
  },

  assignTask(
    workspaceId: string,
    boardId: string,
    taskId: string,
    body: { workspaceMemberId: string }
  ) {
    return api.patch<Task>(`${taskPath(workspaceId, boardId)}/${taskId}/assign`, body);
  },

  deleteTask(workspaceId: string, boardId: string, taskId: string) {
    return api.delete(`${taskPath(workspaceId, boardId)}/${taskId}`);
  },

  getComments(workspaceId: string, boardId: string, taskId: string) {
    return api.get<Comment[]>(`${taskPath(workspaceId, boardId)}/${taskId}/comments`);
  },

  addComment(
    workspaceId: string,
    boardId: string,
    taskId: string,
    body: { content: string }
  ) {
    return api.post<Comment>(`${taskPath(workspaceId, boardId)}/${taskId}/comments`, body);
  },

  deleteComment(
    workspaceId: string,
    boardId: string,
    taskId: string,
    commentId: string
  ) {
    return api.delete(
      `${taskPath(workspaceId, boardId)}/${taskId}/comments/${commentId}`
    );
  },
};

const boardsPath = (workspaceId: string) => `/workspaces/${workspaceId}/boards`;

export const boardColumnApi = {
  createColumn(workspaceId: string, boardId: string, body: { name: string }) {
    return api.post<BoardColumn>(`${boardsPath(workspaceId)}/${boardId}/columns`, body);
  },

  renameColumn(workspaceId: string, boardId: string, columnId: string, body: { name: string }) {
    return api.patch<BoardColumn>(`${boardsPath(workspaceId)}/${boardId}/columns/${columnId}`, body);
  },

  deleteColumn(workspaceId: string, boardId: string, columnId: string) {
    return api.delete(`${boardsPath(workspaceId)}/${boardId}/columns/${columnId}`);
  },
};
