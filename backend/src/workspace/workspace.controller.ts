import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../types/auth';
import { WorkspaceGuard } from './guards/workspace.guard';
import { CurrentMember } from './decorators/current-member.decorator';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';

@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  createWorkspace(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.workspaceService.createWorkspace(user.sub, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getMyWorkspaces(@CurrentUser() user: JwtPayload) {
    return this.workspaceService.getMyWorkspaces(user.sub);
  }

  @Post('invitations/accept')
  @UseGuards(JwtAuthGuard)
  acceptInvitation(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AcceptInvitationDto,
  ) {
    return this.workspaceService.acceptInvitation(dto.token, user.sub);
  }

  @Get(':workspaceId')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  getWorkspace(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.workspaceService.getWorkspace(workspaceId, user.sub);
  }

  @Patch(':workspaceId')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  updateWorkspace(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @CurrentMember() member: WorkspaceMember,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspaceService.updateWorkspace(
      workspaceId,
      user.sub,
      member.role,
      dto,
    );
  }

  @Delete(':workspaceId')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  async deleteWorkspace(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @CurrentMember() member: WorkspaceMember,
  ) {
    await this.workspaceService.deleteWorkspace(
      workspaceId,
      user.sub,
      member.role,
    );
  }

  @Post(':workspaceId/invite')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  inviteMember(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: JwtPayload,
    @CurrentMember() member: WorkspaceMember,
    @Body() dto: InviteMemberDto,
  ) {
    return this.workspaceService.inviteMember(
      workspaceId,
      user.sub,
      member.role,
      dto,
    );
  }

  @Delete(':workspaceId/members/:userId')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  async removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: JwtPayload,
    @CurrentMember() member: WorkspaceMember,
  ) {
    await this.workspaceService.removeMember(
      workspaceId,
      user.sub,
      member.role,
      targetUserId,
    );
  }

  @Patch(':workspaceId/members/:userId/role')
  @UseGuards(JwtAuthGuard, WorkspaceGuard)
  updateMemberRole(
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: JwtPayload,
    @CurrentMember() member: WorkspaceMember,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.workspaceService.updateMemberRole(
      workspaceId,
      user.sub,
      member.role,
      targetUserId,
      dto,
    );
  }
}
