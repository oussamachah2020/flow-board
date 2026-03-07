import { RequestWithWorkspaceMember } from '../workspace/workspace-request.type';
import { BoardMember } from '../../board/entities/board-member.entity';

export type RequestWithBoardMember = RequestWithWorkspaceMember & {
  boardMember: BoardMember;
};
