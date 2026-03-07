import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { BoardMember } from '../entities/board-member.entity';
import { JwtPayload } from '../../types/auth';
import { RequestWithBoardMember } from '../../types/board/board-request.type';

@Injectable()
export class BoardGuard implements CanActivate {
  constructor(
    @InjectRepository(BoardMember)
    private readonly boardMemberRepository: Repository<BoardMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;
    const boardId = request.params?.['boardId'];
    const boardIdStr = Array.isArray(boardId) ? boardId[0] : boardId;

    if (!user?.sub || !boardIdStr) {
      throw new ForbiddenException('Board access denied');
    }

    const boardMember = await this.boardMemberRepository.findOne({
      where: {
        boardId: boardIdStr,
        workspaceMember: { userId: user.sub },
      },
      relations: ['workspaceMember'],
    });

    if (!boardMember) {
      throw new ForbiddenException('You are not a member of this board');
    }

    (request as RequestWithBoardMember).boardMember = boardMember;
    return true;
  }
}
