import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { BoardService } from './board.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BoardGuard } from './guards/board.guard';

/**
 * Global board routes (no workspaceId in path).
 * Used when the client only has boardId (e.g. from /boards/:boardId).
 */
@Controller('boards')
@UseGuards(JwtAuthGuard)
export class BoardsController {
  constructor(private readonly boardService: BoardService) {}

  @Get(':boardId')
  @UseGuards(BoardGuard)
  getBoard(@Param('boardId') boardId: string) {
    return this.boardService.getBoard(boardId);
  }
}