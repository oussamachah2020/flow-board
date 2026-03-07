import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { BoardMember } from '../entities/board-member.entity';
import { RequestWithBoardMember } from '../../types/board/board-request.type';

export const CurrentBoardMember = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): BoardMember => {
    const request = ctx.switchToHttp().getRequest<RequestWithBoardMember>();
    return request.boardMember;
  },
);
