import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { Comment } from './entities/comment.entity';
import { Board } from '../board/entities/board.entity';
import { BoardColumn } from '../board/entities/board-column.entity';
import { BoardMember } from '../board/entities/board-member.entity';
import { WorkspaceMember } from '../workspace/entities/workspace-member.entity';
import { TaskEventType } from './enums/task-event-type.enum';
import { TaskType } from './enums/task-type.enum';
import { TaskPriority } from './enums/task-priority.enum';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { MoveTaskDto } from './dto/move-task.dto';
import { FilterTasksDto } from './dto/filter-tasks.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { TaskEventsService } from './events.service';

@Injectable()
export class TaskService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
    @InjectRepository(BoardColumn)
    private readonly columnRepository: Repository<BoardColumn>,
    @InjectRepository(BoardMember)
    private readonly boardMemberRepository: Repository<BoardMember>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    private readonly eventsService: TaskEventsService,
  ) {}

  async createTask(
    boardId: string,
    userId: string,
    dto: CreateTaskDto,
  ): Promise<Task> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const column = await queryRunner.manager.findOne(BoardColumn, {
        where: { id: dto.columnId, boardId },
      });
      if (!column) {
        throw new NotFoundException('Column not found');
      }
      await queryRunner.manager.increment(
        Board,
        { id: boardId },
        'taskCount',
        1,
      );
      const updatedBoard = await queryRunner.manager.findOneOrFail(Board, {
        where: { id: boardId },
      });
      const code = `${updatedBoard.prefix}-${String(updatedBoard.taskCount).padStart(3, '0')}`;

      const maxOrderResult = await queryRunner.manager
        .createQueryBuilder(Task, 't')
        .select('MAX(t.order)', 'maxOrder')
        .where('t.column_id = :columnId', { columnId: dto.columnId })
        .andWhere('t.deleted_at IS NULL')
        .getRawOne<{ maxOrder: string | null }>();
      const nextOrder = Number(maxOrderResult?.maxOrder ?? -1) + 1;

      const task = queryRunner.manager.create(Task, {
        boardId,
        columnId: dto.columnId,
        createdById: userId,
        code,
        title: dto.title,
        description: dto.description ?? null,
        type: dto.type ?? TaskType.TASK,
        priority: dto.priority ?? TaskPriority.MEDIUM,
        dueDate: dto.dueDate ?? null,
        order: nextOrder,
        assigneeId: dto.assigneeId ?? null,
      });
      const saved = await queryRunner.manager.save(Task, task);
      await queryRunner.commitTransaction();

      const taskWithRelations = await this.taskRepository.findOneOrFail({
        where: { id: saved.id },
        relations: ['column', 'createdBy', 'assignee'],
      });
      await this.eventsService.record(
        TaskEventType.CREATED,
        taskWithRelations,
        userId,
      );
      return taskWithRelations;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getTasks(boardId: string, filters: FilterTasksDto): Promise<Task[]> {
    const qb = this.taskRepository
      .createQueryBuilder('task')
      .where('task.board_id = :boardId', { boardId })
      .andWhere('task.deleted_at IS NULL');

    if (filters.assigneeId) {
      qb.andWhere('task.assignee_id = :assigneeId', {
        assigneeId: filters.assigneeId,
      });
    }
    if (filters.priority?.length) {
      qb.andWhere('task.priority IN (:...priority)', {
        priority: filters.priority,
      });
    }
    if (filters.type?.length) {
      qb.andWhere('task.type IN (:...type)', { type: filters.type });
    }
    if (filters.dueDateFrom) {
      qb.andWhere('task.due_date >= :dueDateFrom', {
        dueDateFrom: filters.dueDateFrom,
      });
    }
    if (filters.dueDateTo) {
      qb.andWhere('task.due_date <= :dueDateTo', {
        dueDateTo: filters.dueDateTo,
      });
    }
    if (filters.columnId?.length) {
      qb.andWhere('task.column_id IN (:...columnId)', {
        columnId: filters.columnId,
      });
    }
    if (filters.search) {
      qb.andWhere(
        '(task.title ILIKE :search OR task.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }
    if (filters.overdue === true) {
      qb.andWhere('task.due_date < NOW()');
    }

    qb.orderBy('task.column_id', 'ASC').addOrderBy('task.order', 'ASC');

    return qb.getMany();
  }

  async getTask(taskId: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, deletedAt: null as unknown as Date },
      relations: [
        'assignee',
        'assignee.user',
        'assignee.user.profile',
        'createdBy',
        'createdBy.profile',
        'column',
      ],
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    const comments = await this.commentRepository.find({
      where: { taskId, deletedAt: null as unknown as Date },
      relations: ['author', 'author.profile'],
      order: { createdAt: 'DESC' },
      take: 10,
    });
    comments.reverse();
    (task as Task & { comments?: Comment[] }).comments = comments;
    return task;
  }

  async updateTask(
    taskId: string,
    userId: string,
    dto: UpdateTaskDto,
  ): Promise<Task> {
    const { expectedVersion, ...rest } = dto;
    const task = await this.taskRepository.findOne({
      where: { id: taskId, deletedAt: null as unknown as Date },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    if (task.version !== expectedVersion) {
      throw new ConflictException({
        message: 'Task was updated by someone else',
        currentTask: task,
      });
    }

    const changed: Record<string, unknown> = {};
    if (rest.title !== undefined) {
      changed.title = rest.title;
      task.title = rest.title;
    }
    if (rest.description !== undefined) {
      changed.description = rest.description;
      task.description = rest.description;
    }
    if (rest.type !== undefined) {
      changed.type = rest.type;
      task.type = rest.type;
    }
    if (rest.priority !== undefined) {
      changed.priority = rest.priority;
      task.priority = rest.priority;
    }
    if (rest.dueDate !== undefined) {
      changed.dueDate = rest.dueDate;
      task.dueDate = rest.dueDate;
    }
    if (rest.assigneeId !== undefined) {
      changed.assigneeId = rest.assigneeId;
      task.assigneeId = rest.assigneeId;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      task.version += 1;
      await queryRunner.manager.save(Task, task);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    await this.eventsService.record(
      TaskEventType.UPDATED,
      task,
      userId,
      changed,
    );
    return this.getTask(taskId);
  }

  async moveTask(
    taskId: string,
    userId: string,
    dto: MoveTaskDto,
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, deletedAt: null as unknown as Date },
      relations: ['column'],
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    if (task.version !== dto.expectedVersion) {
      throw new ConflictException({
        message: 'Task was updated by someone else',
        currentTask: task,
      });
    }
    const fromColumnId = task.columnId;
    const fromOrder = task.order;

    const column = await this.columnRepository.findOne({
      where: { id: dto.columnId, boardId: task.boardId },
    });
    if (!column) {
      throw new NotFoundException('Column not found');
    }

    const newVersion = task.version + 1;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await queryRunner.manager.update(
        Task,
        { id: taskId },
        {
          columnId: dto.columnId,
          order: dto.order,
          version: newVersion,
        },
      );
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    await this.eventsService.record(TaskEventType.MOVED, task, userId, {
      fromColumnId,
      toColumnId: dto.columnId,
      fromOrder,
      toOrder: dto.order,
    });
    return this.getTask(taskId);
  }

  async deleteTask(taskId: string, userId: string): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, deletedAt: null as unknown as Date },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    task.deletedAt = new Date();
    await this.taskRepository.save(task);
    await this.eventsService.record(TaskEventType.DELETED, task, userId);
  }

  async assignTask(
    taskId: string,
    workspaceMemberId: string,
    userId: string,
  ): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, deletedAt: null as unknown as Date },
      relations: ['board'],
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    const workspaceMember = await this.workspaceMemberRepository.findOne({
      where: { id: workspaceMemberId },
      relations: ['user', 'user.profile'],
    });
    if (!workspaceMember) {
      throw new NotFoundException('Workspace member not found');
    }
    if (workspaceMember.workspaceId !== task.board.workspaceId) {
      throw new ForbiddenException(
        "Workspace member does not belong to this board's workspace",
      );
    }
    task.assigneeId = workspaceMemberId;
    task.version += 1;
    await this.taskRepository.save(task);
    const assigneeName =
      workspaceMember.user?.profile?.name ??
      workspaceMember.user?.email ??
      'Unknown';
    await this.eventsService.record(TaskEventType.ASSIGNED, task, userId, {
      assigneeId: workspaceMemberId,
      assigneeName,
    });
    return this.getTask(taskId);
  }

  async getMyTasks(
    userId: string,
    filters?: FilterTasksDto,
  ): Promise<{
    overdue: Task[];
    dueToday: Task[];
    dueThisWeek: Task[];
    noDueDate: Task[];
  }> {
    const qb = this.taskRepository
      .createQueryBuilder('task')
      .innerJoin('task.assignee', 'assigneeWm')
      .innerJoin(BoardMember, 'bm', 'bm.board_id = task.board_id')
      .innerJoin('bm.workspaceMember', 'boardWm')
      .where('assigneeWm.user_id = :userId', { userId })
      .andWhere('boardWm.user_id = :userId', { userId })
      .andWhere('task.deleted_at IS NULL');

    if (filters?.assigneeId) {
      qb.andWhere('task.assignee_id = :assigneeId', {
        assigneeId: filters.assigneeId,
      });
    }
    if (filters?.priority?.length) {
      qb.andWhere('task.priority IN (:...priority)', {
        priority: filters.priority,
      });
    }
    if (filters?.type?.length) {
      qb.andWhere('task.type IN (:...type)', { type: filters.type });
    }
    if (filters?.dueDateFrom) {
      qb.andWhere('task.due_date >= :dueDateFrom', {
        dueDateFrom: filters.dueDateFrom,
      });
    }
    if (filters?.dueDateTo) {
      qb.andWhere('task.due_date <= :dueDateTo', {
        dueDateTo: filters.dueDateTo,
      });
    }
    if (filters?.columnId?.length) {
      qb.andWhere('task.column_id IN (:...columnId)', {
        columnId: filters.columnId,
      });
    }
    if (filters?.search) {
      qb.andWhere(
        '(task.title ILIKE :search OR task.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }
    if (filters?.overdue === true) {
      qb.andWhere('task.due_date < NOW()');
    }

    const tasks = await qb.getMany();

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const endOfToday = new Date(
      startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1,
    );
    const endOfWeek = new Date(
      startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000,
    );

    const overdue: Task[] = [];
    const dueToday: Task[] = [];
    const dueThisWeek: Task[] = [];
    const noDueDate: Task[] = [];

    for (const t of tasks) {
      if (!t.dueDate) {
        noDueDate.push(t);
      } else {
        const d = new Date(t.dueDate);
        if (d < startOfToday) overdue.push(t);
        else if (d <= endOfToday) dueToday.push(t);
        else if (d <= endOfWeek) dueThisWeek.push(t);
        else noDueDate.push(t);
      }
    }

    return { overdue, dueToday, dueThisWeek, noDueDate };
  }

  async addComment(
    taskId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<Comment> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, deletedAt: null as unknown as Date },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    const comment = this.commentRepository.create({
      taskId,
      authorId: userId,
      content: dto.content,
    });
    const saved = await this.commentRepository.save(comment);
    await this.eventsService.record(TaskEventType.COMMENTED, task, userId, {
      commentId: saved.id,
      preview: dto.content.substring(0, 100),
    });
    return saved;
  }

  async updateComment(
    commentId: string,
    userId: string,
    dto: UpdateCommentDto,
  ): Promise<Comment> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, deletedAt: null as unknown as Date },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }
    comment.content = dto.content;
    return this.commentRepository.save(comment);
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.commentRepository.findOne({
      where: { id: commentId, deletedAt: null as unknown as Date },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }
    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    comment.deletedAt = new Date();
    await this.commentRepository.save(comment);
  }

  async getComments(taskId: string): Promise<Comment[]> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, deletedAt: null as unknown as Date },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return this.commentRepository.find({
      where: { taskId, deletedAt: null as unknown as Date },
      relations: ['author', 'author.profile'],
      order: { createdAt: 'ASC' },
    });
  }
}
