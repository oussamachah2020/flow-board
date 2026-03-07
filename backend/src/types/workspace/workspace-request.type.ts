import { Request } from 'express';
import { JwtPayload } from '../auth';
import { WorkspaceMember } from '../../workspace/entities/workspace-member.entity';

export type RequestWithWorkspaceMember = Request & {
  user: JwtPayload;
  workspaceMember: WorkspaceMember;
};
