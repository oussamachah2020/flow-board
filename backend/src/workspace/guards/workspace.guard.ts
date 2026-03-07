import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { JwtPayload } from '../../types/auth';
import { RequestWithWorkspaceMember } from '../../types/workspace/workspace-request.type';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: JwtPayload }>();
    const user = request.user;
    const workspaceId = request.params?.['workspaceId'];
    const workspaceIdStr = Array.isArray(workspaceId)
      ? workspaceId[0]
      : workspaceId;

    if (!user?.sub || !workspaceIdStr) {
      throw new ForbiddenException('Workspace access denied');
    }

    const member = await this.workspaceMemberRepository.findOne({
      where: { workspaceId: workspaceIdStr, userId: user.sub },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    (request as RequestWithWorkspaceMember).workspaceMember = member;
    return true;
  }
}
