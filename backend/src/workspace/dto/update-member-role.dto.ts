import { IsIn } from 'class-validator';
import { WorkspaceRole } from '../enums/workspace-role.enum';

const ALLOWED_ROLES = [WorkspaceRole.ADMIN, WorkspaceRole.MEMBER] as const;

export class UpdateMemberRoleDto {
  @IsIn(ALLOWED_ROLES, {
    message: 'Role cannot be OWNER; use ADMIN or MEMBER',
  })
  role!: (typeof ALLOWED_ROLES)[number];
}
