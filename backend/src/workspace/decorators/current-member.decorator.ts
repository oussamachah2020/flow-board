import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { RequestWithWorkspaceMember } from '../../types/workspace/workspace-request.type';

export const CurrentMember = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WorkspaceMember => {
    const request = ctx.switchToHttp().getRequest<RequestWithWorkspaceMember>();
    return request.workspaceMember;
  },
);
