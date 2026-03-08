export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
  owner?: { id: string; email?: string; profile?: { name: string } };
  members?: WorkspaceMember[];
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  joinedAt: string;
  user?: { id: string; email?: string; profile?: { name: string } };
}

export interface CreateBoardRequest {
  name: string;
  description?: string;
}

export interface BoardColumn {
  id: string;
  boardId: string;
  name: string;
  order: number;
  createdAt: string;
}

export interface Board {
  id: string;
  name: string;
  prefix: string;
  description: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  columns?: BoardColumn[];
  memberCount?: number;
  columnCount?: number;
}

/** Tasks grouped by columnId (client-side grouping of flat task list) */
export type TasksByColumn = Record<string, Task[]>;

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
}

export interface MyTasksResponse {
  overdue: Task[];
  dueToday: Task[];
  dueThisWeek: Task[];
  noDueDate: Task[];
}

export interface Task {
  id: string;
  code: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  dueDate: string | null;
  order: number;
  boardId: string;
  columnId: string;
  assigneeId: string | null;
  version?: number;
  createdAt: string;
  updatedAt: string;
  board?: Board;
  column?: BoardColumn;
  assignee?: WorkspaceMember & { user?: { id: string; email?: string; profile?: { name: string } } };
  createdBy?: { id: string; profile?: { name: string } };
  comments?: Comment[];
}

export interface Comment {
  id: string;
  taskId: string;
  content: string;
  authorId: string;
  createdAt: string;
  author?: { id: string; profile?: { name: string } };
}
