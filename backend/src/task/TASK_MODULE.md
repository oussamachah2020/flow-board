# Task Module Documentation

This document describes the task feature: tasks on boards, task events (audit log), comments, filtering, optimistic locking (version), and assignment to workspace members. All task routes are scoped to a board and use the same guards as the board module.

---

## Table of Contents

1. [Overview](#overview)
2. [Board Entity Changes (prefix, taskCount)](#board-entity-changes-prefix-taskcount)
3. [Module Structure](#module-structure)
4. [Entity Model & Relationships](#entity-model--relationships)
5. [Enums](#enums)
6. [Entities](#entities)
7. [DTOs](#dtos)
8. [EventsService](#eventsservice)
9. [TaskService Methods](#taskservice-methods)
10. [Request Flow: Guards](#request-flow-guards)
11. [API Routes](#api-routes)
12. [Version Conflicts & Soft Delete](#version-conflicts--soft-delete)
13. [Migration](#migration)

---

## Overview

The task module lets board members:

- **Create tasks** in a column (title, optional description, type, priority, due date, assignee). Task **code** is auto-generated from the board’s **prefix** and **task count** (e.g. `FB-001`). **Order** is set to the next value in the target column.
- **List tasks** for a board, optionally **filtered** by assignee, priority, type, due date range, column(s), search (title/description), and overdue.
- **Get “my tasks”** for the current user (assignee + board member), grouped by **overdue**, **due today**, **due this week**, **no due date**.
- **Get a single task** with assignee (and profile), creator (and profile), column, and latest 10 comments with authors.
- **Update a task** (title, description, type, priority, due date, assignee) with **optimistic locking** via **expectedVersion**; on conflict returns **currentTask** for client reconciliation.
- **Move a task** to another column and/or order, with version check.
- **Assign a task** to a workspace member (must belong to the board’s workspace).
- **Soft delete** a task (sets **deletedAt**); soft-deleted tasks are never returned.
- **Comments**: add, list, update, and soft delete; add/update/delete are author-only where applicable.

**Task events** are recorded for CREATED, MOVED, UPDATED, ASSIGNED, COMMENTED, DELETED. The **TaskEvent** table is **append-only** (no updates or deletes). Events are persisted by **TaskEventsService**; they can later be used for real-time (e.g. Socket.io) or audit.

All routes use **JwtAuthGuard**, **WorkspaceGuard**, and **BoardGuard**. The current user is read via **`@CurrentUser()`**; **`@CurrentBoardMember()`** is available when needed.

---

## Board Entity Changes (prefix, taskCount)

The **Board** entity (in `src/board/entities/board.entity.ts`) was extended for task codes and counting:

| Field      | Type   | Constraints              | Description |
|-----------|--------|---------------------------|-------------|
| **prefix**   | varchar(5) | required, unique per workspace | Short code derived from board name (e.g. "Frontend Board" → `FB`, "FlowBoard" → `FLO`). Used to generate task codes like `FB-001`. |
| **taskCount**| int    | default 0                 | Number of tasks ever created on this board; incremented on each **createTask**. |

**Unique constraint:** `(workspaceId, prefix)` — two boards in the same workspace cannot share a prefix.

**Prefix generation** (in `BoardService.createBoard`):

- Words = `name.trim().split(/\s+/).filter(Boolean)`.
- If **one word** and length ≥ 3: prefix = first 3 characters, uppercase, max 5 (e.g. "FlowBoard" → `FLO`).
- Otherwise: first letter of each word, joined, uppercase, max 5 (e.g. "Frontend Board" → `FB`).
- If the base prefix is already taken in the workspace, a numeric suffix is appended (e.g. `FB-1`) until unique.

**Task code** (in `TaskService.createTask`): `{board.prefix}-{String(board.taskCount).padStart(3, '0')}` (e.g. `FB-001`). The **code** is set once on creation and **never updated**.

---

## Module Structure

```
src/task/
├── entities/
│   ├── task.entity.ts
│   ├── task-event.entity.ts
│   └── comment.entity.ts
├── enums/
│   ├── task-priority.enum.ts
│   ├── task-type.enum.ts
│   └── task-event-type.enum.ts
├── dto/
│   ├── create-task.dto.ts
│   ├── update-task.dto.ts
│   ├── move-task.dto.ts
│   ├── filter-tasks.dto.ts
│   ├── assign-task.dto.ts
│   ├── create-comment.dto.ts
│   └── update-comment.dto.ts
├── events.service.ts
├── task.service.ts
├── task.controller.ts
├── task.module.ts
└── TASK_MODULE.md
```

**Dependencies:** Task module imports **BoardModule** and **WorkspaceModule** (for Board, BoardColumn, BoardMember, WorkspaceMember repositories). **BoardModule** registers the **Task** entity (from `src/task/entities/task.entity.ts`) in its TypeORM feature list so `BoardService.deleteColumn` can count tasks.

---

## Entity Model & Relationships

```mermaid
erDiagram
  Board ||--o{ Task : "has tasks"
  BoardColumn ||--o{ Task : "has tasks"
  WorkspaceMember ||--o{ Task : "assigned to"
  User ||--o{ Task : "created by"
  Task ||--o{ TaskEvent : "has events"
  Task ||--o{ Comment : "has comments"
  User ||--o{ TaskEvent : "actor"
  User ||--o{ Comment : "author"

  Task {
    uuid id PK
    uuid board_id FK
    uuid column_id FK
    uuid assignee_id FK nullable
    uuid created_by_id FK
    string code UK
    string title
    text description
    enum type
    enum priority
    timestamp due_date
    int order
    int version
    timestamp deleted_at
  }

  TaskEvent {
    uuid id PK
    uuid task_id FK
    uuid user_id FK
    enum type
    jsonb payload
    timestamp created_at
  }

  Comment {
    uuid id PK
    uuid task_id FK
    uuid author_id FK
    text content
    timestamp deleted_at
  }
```

**Relationship summary:**

| From          | To         | Relation | Description |
|---------------|------------|----------|-------------|
| Board         | Task       | OneToMany| A board has many tasks. |
| BoardColumn   | Task       | OneToMany| A column has many tasks. |
| WorkspaceMember | Task    | OneToMany| A workspace member can be assignee of many tasks. |
| User          | Task       | OneToMany| A user creates many tasks (createdById). |
| Task          | TaskEvent  | OneToMany| Append-only events for the task. |
| Task          | Comment    | OneToMany| Comments on the task (soft delete). |
| User          | TaskEvent  | ManyToOne| User who performed the action. |
| User          | Comment    | ManyToOne| Author of the comment. |

---

## Enums

### TaskPriority

| Value   | Description |
|--------|-------------|
| LOW    | Low priority. |
| MEDIUM | Default. |
| HIGH   | High priority. |
| URGENT | Urgent. |

### TaskType

| Value       | Description |
|------------|-------------|
| TASK       | Default. |
| BUG        | Bug. |
| HOTFIX     | Hotfix. |
| FEATURE    | Feature. |
| IMPROVEMENT| Improvement. |
| TEST       | Test. |

### TaskEventType

| Value    | When recorded |
|----------|----------------|
| CREATED  | After creating a task. |
| MOVED    | After moving (column/order change); payload: fromColumnId, toColumnId, fromOrder, toOrder. |
| UPDATED  | After updating; payload: only changed fields. |
| ASSIGNED | After assigning; payload: assigneeId, assigneeName. |
| COMMENTED| After adding a comment; payload: commentId, preview (first 100 chars). |
| DELETED  | After soft delete. |

---

## Entities

### Task

| Field       | Type           | Constraints       | Description |
|------------|----------------|-------------------|-------------|
| id         | uuid           | PK                | Primary key. |
| boardId    | uuid           | FK → Board        | Board id. |
| board      | Board          | ManyToOne         | Board relation. |
| columnId   | uuid           | FK → BoardColumn  | Column id. |
| column     | BoardColumn    | ManyToOne         | Column relation. |
| assigneeId | uuid           | FK → WorkspaceMember, nullable | Assignee workspace member id. |
| assignee   | WorkspaceMember| ManyToOne, nullable | Assignee relation. |
| createdById| uuid           | FK → User         | Creator user id. |
| createdBy  | User           | ManyToOne         | Creator relation. |
| code       | varchar(255)   | unique            | Human-readable code (e.g. FB-001); set once, never updated. |
| title      | varchar(255)   | required          | Task title. |
| description| text           | nullable          | Task description. |
| type       | TaskType       | default TASK      | Task type. |
| priority   | TaskPriority   | default MEDIUM   | Priority. |
| dueDate    | timestamp      | nullable          | Due date. |
| order      | integer        | default 0        | Order within column. |
| version    | integer        | default 1        | Incremented on update/move/assign; used for optimistic locking. |
| createdAt  | timestamp      | —                 | Creation time. |
| updatedAt  | timestamp      | —                 | Last update time. |
| deletedAt  | timestamp      | nullable          | Soft delete; null when not deleted. |

**Indexes:** assigneeId, columnId, dueDate, boardId (for filtering and ordering).

### TaskEvent

| Field     | Type          | Constraints | Description |
|----------|---------------|-------------|-------------|
| id       | uuid           | PK          | Primary key. |
| taskId   | uuid           | FK → Task   | Task id. |
| task     | Task           | ManyToOne   | Task relation. |
| userId   | uuid           | FK → User   | User who performed the action. |
| user     | User           | ManyToOne   | User relation. |
| type     | TaskEventType  | required    | Event type. |
| payload  | jsonb          | nullable    | Optional event data. |
| createdAt| timestamp      | CreateDateColumn | When the event was recorded. |

**Append-only:** No updates or deletes. Used for audit and future real-time events.

### Comment

| Field     | Type     | Constraints   | Description |
|----------|----------|---------------|-------------|
| id       | uuid     | PK            | Primary key. |
| taskId   | uuid     | FK → Task     | Task id. |
| task     | Task     | ManyToOne     | Task relation. |
| authorId | uuid     | FK → User     | Author user id. |
| author   | User     | ManyToOne     | Author relation. |
| content  | text     | required      | Comment body (max 2000 in DTO). |
| createdAt| timestamp| —             | Creation time. |
| updatedAt| timestamp| —             | Last update time. |
| deletedAt| timestamp| nullable      | Soft delete. |

---

## DTOs

| DTO                 | Purpose           | Fields / Notes |
|---------------------|-------------------|----------------|
| **CreateTaskDto**   | Create task       | `columnId` (required), `title` (required, max 255), `description?`, `type?`, `priority?`, `dueDate?`, `assigneeId?`. |
| **UpdateTaskDto**   | Update task       | `expectedVersion` (required), then optional: `title?`, `description?`, `type?`, `priority?`, `dueDate?`, `assigneeId?`. No columnId. |
| **MoveTaskDto**     | Move task         | `columnId` (required), `order` (required), `expectedVersion` (required). |
| **FilterTasksDto**  | Filter task list  | All optional query params: `assigneeId`, `priority[]`, `type[]`, `dueDateFrom`, `dueDateTo`, `columnId[]`, `search`, `overdue` (boolean). |
| **AssignTaskDto**   | Assign task       | `workspaceMemberId` (required, UUID). |
| **CreateCommentDto**| Add comment       | `content` (required, max 2000). |
| **UpdateCommentDto**| Edit comment      | `content` (required, max 2000). |

Validation uses `class-validator` and `class-transformer` (e.g. `@Type(() => Number)` for expectedVersion, order).

---

## EventsService

**File:** `src/task/events.service.ts`

**Method:** `record(type: TaskEventType, task: Task, userId: string, payload?: Record<string, unknown>): Promise<TaskEvent>`

- Persists a **TaskEvent** row with the given type, taskId, userId, and optional payload.
- No updates or deletes; append-only.
- Used by **TaskService** after create, update, move, assign, add comment, and delete. Can be extended later to emit Socket.io (or other) events.

---

## TaskService Methods

| Method | Description |
|--------|-------------|
| **createTask(boardId, userId, dto)** | In a **transaction**: load board and column; increment **board.taskCount**; generate **code** as `{prefix}-{padded taskCount}`; get max **order** in column and set task order to max+1; create and save task. After commit, record **CREATED** event. Return saved task. |
| **getTasks(boardId, filters)** | QueryBuilder: tasks for board, **deletedAt** null. Apply optional filters (assigneeId, priority[], type[], dueDateFrom/To, columnId[], **search** ILIKE title/description, **overdue** = dueDate &lt; NOW()). Order by columnId ASC, order ASC. Return **Record&lt;string, Task[]&gt;** grouped by columnId. |
| **getTask(taskId)** | Load task with assignee (+ profile), createdBy (+ profile), column. Load latest 10 comments (by createdAt DESC, then reversed) with author and profile. Return task with **comments** attached. |
| **updateTask(taskId, userId, dto)** | Load task. If **task.version !== dto.expectedVersion**, throw **ConflictException** with `{ message: 'Task was updated by someone else', currentTask }`. Update only present fields; increment version; save in transaction. Record **UPDATED** with payload of changed fields. Return full task. |
| **moveTask(taskId, userId, dto)** | Load task. Version check as above. Update columnId and order; increment version; save in transaction. Record **MOVED** with fromColumnId, toColumnId, fromOrder, toOrder. Return full task. |
| **deleteTask(taskId, userId)** | Set **deletedAt** = now; save. Record **DELETED**. |
| **assignTask(taskId, workspaceMemberId, userId)** | Load task (with board) and workspace member (with user/profile). Verify **workspaceMember.workspaceId === task.board.workspaceId**. Update assigneeId; increment version. Record **ASSIGNED** with assigneeId, assigneeName. Return full task. |
| **getMyTasks(userId, filters?)** | QueryBuilder: tasks where **assignee** is the user and the user is a **BoardMember** of the task’s board; **deletedAt** null. Apply same filters as getTasks. Group results into **overdue**, **dueToday**, **dueThisWeek**, **noDueDate** (by dueDate vs today/week). |
| **addComment(taskId, userId, dto)** | Create comment; record **COMMENTED** with commentId and content preview (first 100 chars). Return saved comment. |
| **updateComment(commentId, userId, dto)** | Load comment; verify **authorId === userId**; update content. |
| **deleteComment(commentId, userId)** | Load comment; verify authorId; set **deletedAt**; save. |
| **getComments(taskId)** | Return comments for task where **deletedAt** null, order **createdAt** ASC, with author and profile. |

All mutations that change task state use **DataSource.createQueryRunner()** for transactions where required. **code** is never updated after creation.

---

## Request Flow: Guards

Task routes live under **`/workspaces/:workspaceId/boards/:boardId/tasks`**. They use:

1. **JwtAuthGuard** — validates JWT and sets `request.user` (e.g. `user.sub`).
2. **WorkspaceGuard** — ensures the user is a workspace member; sets `request.workspaceMember`.
3. **BoardGuard** — ensures the user is a board member; sets `request.boardMember`.

So by the time a task controller action runs, the user is authenticated and is a member of both the workspace and the board. The controller uses **`@CurrentUser()`** to pass **user.sub** (and optionally **user** or **boardMember**) to the service.

---

## API Routes

Base path: **`/workspaces/:workspaceId/boards/:boardId/tasks`** (all require JWT + WorkspaceGuard + BoardGuard).

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/` | Create task (body: CreateTaskDto). |
| GET    | `/` | List tasks for board (query: FilterTasksDto). |
| GET    | `/my` | Get current user’s tasks for this board, grouped by due status (query: FilterTasksDto). |
| GET    | `/:taskId` | Get single task with assignee, createdBy, column, latest 10 comments. |
| PATCH  | `/:taskId` | Update task (body: UpdateTaskDto). |
| PATCH  | `/:taskId/move` | Move task (body: MoveTaskDto). |
| PATCH  | `/:taskId/assign` | Assign task (body: AssignTaskDto). |
| DELETE | `/:taskId` | Soft delete task. |
| POST   | `/:taskId/comments` | Add comment (body: CreateCommentDto). |
| GET    | `/:taskId/comments` | List comments for task. |
| PATCH  | `/:taskId/comments/:commentId` | Update comment (body: UpdateCommentDto; author only). |
| DELETE | `/:taskId/comments/:commentId` | Soft delete comment (author only). |

**Route order:** `GET /my` is registered **before** `GET /:taskId` so `"my"` is not interpreted as a taskId.

---

## Version Conflicts & Soft Delete

- **Optimistic locking:** Update and move operations require **expectedVersion** in the body. If **task.version !== expectedVersion**, the API throws **ConflictException** with `{ message: 'Task was updated by someone else', currentTask }` so the client can refresh and reconcile.
- **Soft delete:** Tasks and comments use **deletedAt**. All list/get operations exclude soft-deleted rows; they are never returned.

---

## Migration

**File:** `src/migrations/1730650000000-AddTaskModule.ts`

- Adds to **boards**: columns **prefix** (varchar 5, default `'B'`) and **task_count** (int, default 0); unique index on **(workspace_id, prefix)**.
- Creates enums: **tasks_type_enum**, **tasks_priority_enum**, **task_events_type_enum**.
- Creates tables: **tasks** (with FKs to boards, board_columns, workspace_members, users; indexes on assignee_id, column_id, due_date, board_id), **task_events**, **task_comments** (with FKs to tasks, users).

**Note:** Not run automatically. Apply with `pnpm run migration:run` when needed. If **synchronize** is true in TypeORM config, schema may already match; the migration is for explicit versioning. If you have existing boards in the same workspace, ensure **prefix** is unique per workspace before adding the unique index (e.g. backfill from board name).
