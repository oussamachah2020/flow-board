import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Board } from './entities/board.entity';
import { BoardMember } from './entities/board-member.entity';
import { BoardColumn } from './entities/board-column.entity';
import { Task } from '../task/entities/task.entity';
import { WorkspaceMember } from '../workspace/entities/workspace-member.entity';
import { WorkspaceRole } from '../workspace/enums/workspace-role.enum';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { CreateColumnDto } from './dto/create-column.dto';
import { RenameColumnDto } from './dto/rename-column.dto';
import { ReorderColumnsDto } from './dto/reorder-columns.dto';

@Injectable()
export class BoardService {
  private readonly logger = new Logger(BoardService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
    @InjectRepository(BoardMember)
    private readonly boardMemberRepository: Repository<BoardMember>,
    @InjectRepository(BoardColumn)
    private readonly columnRepository: Repository<BoardColumn>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
  ) {}

  private generateBoardPrefix(name: string): string {
    const words = name.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'B';
    if (words.length === 1 && words[0].length >= 3) {
      return words[0].slice(0, 3).toUpperCase().slice(0, 5);
    }
    return words
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 5);
  }

  async createBoard(
    workspaceId: string,
    userId: string,
    dto: CreateBoardDto,
  ): Promise<Board> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const basePrefix = this.generateBoardPrefix(dto.name);
      let prefix = basePrefix;
      let suffix = 0;
      while (
        await queryRunner.manager.findOne(Board, {
          where: { workspaceId, prefix },
        })
      ) {
        const next = `${basePrefix.slice(0, 4)}${++suffix}`.slice(0, 5);
        prefix = next;
      }
      const board = queryRunner.manager.create(Board, {
        workspaceId,
        createdById: userId,
        name: dto.name,
        prefix,
        taskCount: 0,
        description: dto.description ?? null,
      });
      const savedBoard = await queryRunner.manager.save(Board, board);

      const workspaceMember = await queryRunner.manager.findOne(
        WorkspaceMember,
        {
          where: { workspaceId, userId },
        },
      );
      if (!workspaceMember) {
        throw new ForbiddenException('You are not a member of this workspace');
      }

      const boardMember = queryRunner.manager.create(BoardMember, {
        boardId: savedBoard.id,
        workspaceMemberId: workspaceMember.id,
      });
      await queryRunner.manager.save(BoardMember, boardMember);

      await queryRunner.commitTransaction();
      return this.getBoard(savedBoard.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getBoards(
    workspaceId: string,
    userId: string,
  ): Promise<(Board & { memberCount: number; columnCount: number })[]> {
    const boardMembers = await this.boardMemberRepository.find({
      where: { workspaceMember: { userId, workspaceId } },
      select: ['boardId'],
    });
    const boardIds = [...new Set(boardMembers.map((bm) => bm.boardId))];
    if (boardIds.length === 0) {
      return [];
    }
    const boards = await this.boardRepository.find({
      where: { id: In(boardIds) },
      relations: ['members', 'columns'],
    });
    return boards.map((b) => ({
      ...b,
      memberCount: b.members.length,
      columnCount: b.columns.length,
    })) as (Board & { memberCount: number; columnCount: number })[];
  }

  async getBoard(boardId: string): Promise<Board> {
    const board = await this.boardRepository.findOne({
      where: { id: boardId },
      relations: [
        'columns',
        'members',
        'members.workspaceMember',
        'members.workspaceMember.user',
        'members.workspaceMember.user.profile',
      ],
      order: { columns: { order: 'ASC' } },
    });
    if (!board) {
      throw new NotFoundException('Board not found');
    }
    return this.stripPasswordFromBoard(board);
  }

  async updateBoard(boardId: string, dto: UpdateBoardDto): Promise<Board> {
    const board = await this.boardRepository.findOneOrFail({
      where: { id: boardId },
    });
    if (dto.name != null) board.name = dto.name;
    if (dto.description !== undefined) board.description = dto.description;
    await this.boardRepository.save(board);
    return this.getBoard(boardId);
  }

  async deleteBoard(boardId: string): Promise<void> {
    const board = await this.boardRepository.findOne({
      where: { id: boardId },
    });
    if (!board) {
      throw new NotFoundException('Board not found');
    }
    await this.boardRepository.remove(board);
  }

  async addBoardMember(
    boardId: string,
    workspaceMemberId: string,
  ): Promise<BoardMember> {
    const existing = await this.boardMemberRepository.findOne({
      where: { boardId, workspaceMemberId },
    });
    if (existing) {
      throw new BadRequestException('Member is already on this board');
    }
    const workspaceMember = await this.workspaceMemberRepository.findOne({
      where: { id: workspaceMemberId },
    });
    if (!workspaceMember) {
      throw new NotFoundException('Workspace member not found');
    }
    const board = await this.boardRepository.findOne({
      where: { id: boardId },
    });
    if (!board) {
      throw new NotFoundException('Board not found');
    }
    if (workspaceMember.workspaceId !== board.workspaceId) {
      throw new BadRequestException(
        "Workspace member does not belong to this board's workspace",
      );
    }
    const boardMember = this.boardMemberRepository.create({
      boardId,
      workspaceMemberId,
    });
    return this.boardMemberRepository.save(boardMember);
  }

  async removeBoardMember(
    boardId: string,
    workspaceMemberId: string,
  ): Promise<void> {
    const boardMember = await this.boardMemberRepository.findOne({
      where: { boardId, workspaceMemberId },
    });
    if (!boardMember) {
      throw new NotFoundException('Board member not found');
    }
    await this.boardMemberRepository.remove(boardMember);
  }

  async createColumn(
    boardId: string,
    dto: CreateColumnDto,
  ): Promise<BoardColumn> {
    const maxOrderResult = await this.columnRepository
      .createQueryBuilder('c')
      .select('MAX(c.order)', 'maxOrder')
      .where('c.board_id = :boardId', { boardId })
      .getRawOne<{ maxOrder: number | null }>();
    const nextOrder = (maxOrderResult?.maxOrder ?? -1) + 1;
    const column = this.columnRepository.create({
      boardId,
      name: dto.name,
      order: nextOrder,
    });
    return this.columnRepository.save(column);
  }

  async renameColumn(
    columnId: string,
    dto: RenameColumnDto,
  ): Promise<BoardColumn> {
    const column = await this.columnRepository.findOneOrFail({
      where: { id: columnId },
    });
    column.name = dto.name;
    return this.columnRepository.save(column);
  }

  async reorderColumns(
    boardId: string,
    dto: ReorderColumnsDto,
  ): Promise<BoardColumn[]> {
    const columnIds = dto.columns.map((c) => c.id);
    const columnsInBoard = await this.columnRepository.find({
      where: { boardId },
      select: ['id'],
    });
    const idsInBoard = new Set(columnsInBoard.map((c) => c.id));
    const invalidIds = columnIds.filter((id) => !idsInBoard.has(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Column ids do not belong to this board: ${invalidIds.join(', ')}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      for (const { id, order } of dto.columns) {
        await queryRunner.manager.update(BoardColumn, { id }, { order });
      }
      await queryRunner.commitTransaction();
      return this.columnRepository.find({
        where: { boardId },
        order: { order: 'ASC' },
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteColumn(columnId: string): Promise<void> {
    const taskCount = await this.taskRepository.count({
      where: { columnId },
    });
    if (taskCount > 0) {
      throw new BadRequestException(
        'Move or delete tasks before deleting this column',
      );
    }
    const column = await this.columnRepository.findOne({
      where: { id: columnId },
    });
    if (!column) {
      throw new NotFoundException('Column not found');
    }
    await this.columnRepository.remove(column);
  }

  private stripPasswordFromBoard(board: Board): Board {
    if (board.members) {
      for (const m of board.members) {
        if (m.workspaceMember?.user && 'password' in m.workspaceMember.user) {
          delete (m.workspaceMember.user as unknown as Record<string, unknown>)
            .password;
        }
      }
    }
    return board;
  }
}
