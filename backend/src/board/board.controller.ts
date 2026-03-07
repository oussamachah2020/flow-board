import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BoardService } from './board.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceGuard } from '../workspace/guards/workspace.guard';
import { BoardGuard } from './guards/board.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CurrentMember } from '../workspace/decorators/current-member.decorator';
import { JwtPayload } from '../types/auth';
import { WorkspaceMember } from '../workspace/entities/workspace-member.entity';
import { WorkspaceRole } from '../workspace/enums/workspace-role.enum';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { AddBoardMemberDto } from './dto/add-board-member.dto';
import { CreateColumnDto } from './dto/create-column.dto';
import { RenameColumnDto } from './dto/rename-column.dto';
import { ReorderColumnsDto } from './dto/reorder-columns.dto';

@Controller('workspaces/:workspaceId/boards')
@UseGuards(JwtAuthGuard, WorkspaceGuard)
export class BoardController {
  constructor(private readonly boardService: BoardService) {}

  @Post()
  createBoard(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBoardDto,
  ) {
    return this.boardService.createBoard(workspaceId, user.sub, dto);
  }

  @Get()
  getBoards(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.boardService.getBoards(workspaceId, user.sub);
  }

  @Get(':boardId')
  @UseGuards(BoardGuard)
  getBoard(@Param('boardId') boardId: string) {
    return this.boardService.getBoard(boardId);
  }

  @Patch(':boardId')
  @UseGuards(BoardGuard)
  updateBoard(@Param('boardId') boardId: string, @Body() dto: UpdateBoardDto) {
    return this.boardService.updateBoard(boardId, dto);
  }

  @Delete(':boardId')
  @UseGuards(BoardGuard)
  async deleteBoard(
    @Param('boardId') boardId: string,
    @CurrentMember() member: WorkspaceMember,
  ) {
    if (
      member.role !== WorkspaceRole.OWNER &&
      member.role !== WorkspaceRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only workspace owners and admins can delete a board',
      );
    }
    await this.boardService.deleteBoard(boardId);
  }

  @Post(':boardId/members')
  @UseGuards(BoardGuard)
  addBoardMember(
    @Param('boardId') boardId: string,
    @CurrentMember() member: WorkspaceMember,
    @Body() dto: AddBoardMemberDto,
  ) {
    if (
      member.role !== WorkspaceRole.OWNER &&
      member.role !== WorkspaceRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only workspace owners and admins can add board members',
      );
    }
    return this.boardService.addBoardMember(boardId, dto.workspaceMemberId);
  }

  @Delete(':boardId/members/:workspaceMemberId')
  @UseGuards(BoardGuard)
  async removeBoardMember(
    @Param('boardId') boardId: string,
    @Param('workspaceMemberId') workspaceMemberId: string,
    @CurrentMember() member: WorkspaceMember,
  ) {
    if (
      member.role !== WorkspaceRole.OWNER &&
      member.role !== WorkspaceRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only workspace owners and admins can remove board members',
      );
    }
    await this.boardService.removeBoardMember(boardId, workspaceMemberId);
  }

  @Post(':boardId/columns')
  @UseGuards(BoardGuard)
  createColumn(
    @Param('boardId') boardId: string,
    @Body() dto: CreateColumnDto,
  ) {
    return this.boardService.createColumn(boardId, dto);
  }

  @Patch(':boardId/columns/reorder')
  @UseGuards(BoardGuard)
  reorderColumns(
    @Param('boardId') boardId: string,
    @Body() dto: ReorderColumnsDto,
  ) {
    return this.boardService.reorderColumns(boardId, dto);
  }

  @Patch(':boardId/columns/:columnId')
  @UseGuards(BoardGuard)
  renameColumn(
    @Param('columnId') columnId: string,
    @Body() dto: RenameColumnDto,
  ) {
    return this.boardService.renameColumn(columnId, dto);
  }

  @Delete(':boardId/columns/:columnId')
  @UseGuards(BoardGuard)
  async deleteColumn(@Param('columnId') columnId: string) {
    await this.boardService.deleteColumn(columnId);
  }
}
