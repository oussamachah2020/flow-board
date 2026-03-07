import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Workspace } from './entities/workspace.entity';
import { WorkspaceMember } from './entities/workspace-member.entity';
import { WorkspaceInvitation } from './entities/workspace-invitation.entity';
import { WorkspaceRole } from './enums/workspace-role.enum';
import { InvitationStatus } from './enums/invitation-status.enum';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';

const INVITATION_EXPIRY_DAYS = 7;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function stripPasswordFromWorkspace(workspace: Workspace): Workspace {
  if (workspace.owner && 'password' in workspace.owner) {
    delete (workspace.owner as unknown as Record<string, unknown>).password;
  }
  if (workspace.members) {
    for (const m of workspace.members) {
      if (m.user && 'password' in m.user) {
        delete (m.user as unknown as Record<string, unknown>).password;
      }
    }
  }
  return workspace;
}

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
    @InjectRepository(WorkspaceInvitation)
    private readonly invitationRepository: Repository<WorkspaceInvitation>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async createWorkspace(
    userId: string,
    dto: CreateWorkspaceDto,
  ): Promise<Workspace> {
    const baseSlug = slugify(dto.name);
    let slug = baseSlug;
    let suffix = 0;
    while (await this.workspaceRepository.findOneBy({ slug })) {
      slug = `${baseSlug}-${++suffix}`;
    }

    const workspace = this.workspaceRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      slug,
      ownerId: userId,
    });
    const saved = await this.workspaceRepository.save(workspace);

    const member = this.workspaceMemberRepository.create({
      workspaceId: saved.id,
      userId,
      role: WorkspaceRole.OWNER,
    });
    await this.workspaceMemberRepository.save(member);

    const withRelations = await this.workspaceRepository.findOneOrFail({
      where: { id: saved.id },
      relations: ['members', 'owner'],
    });
    return stripPasswordFromWorkspace(withRelations);
  }

  async getMyWorkspaces(userId: string): Promise<Workspace[]> {
    const memberships = await this.workspaceMemberRepository.find({
      where: { userId },
      relations: ['workspace'],
    });
    return memberships.map((m) => m.workspace);
  }

  async getWorkspace(workspaceId: string, userId: string): Promise<Workspace> {
    const member = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId },
    });
    if (!member) {
      throw new ForbiddenException('You are not a member of this workspace');
    }
    const withRelations = await this.workspaceRepository.findOneOrFail({
      where: { id: workspaceId },
      relations: ['members', 'members.user', 'owner'],
    });
    return stripPasswordFromWorkspace(withRelations);
  }

  async updateWorkspace(
    workspaceId: string,
    userId: string,
    memberRole: WorkspaceRole,
    dto: UpdateWorkspaceDto,
  ): Promise<Workspace> {
    if (
      memberRole !== WorkspaceRole.OWNER &&
      memberRole !== WorkspaceRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Only owners and admins can update the workspace',
      );
    }
    const workspace = await this.workspaceRepository.findOneOrFail({
      where: { id: workspaceId },
    });
    if (dto.name != null) workspace.name = dto.name;
    if (dto.description !== undefined) workspace.description = dto.description;
    await this.workspaceRepository.save(workspace);
    return this.getWorkspace(workspaceId, userId);
  }

  async deleteWorkspace(
    workspaceId: string,
    userId: string,
    memberRole: WorkspaceRole,
  ): Promise<void> {
    if (memberRole !== WorkspaceRole.OWNER) {
      throw new ForbiddenException('Only the owner can delete the workspace');
    }
    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId, ownerId: userId },
    });
    if (!workspace) {
      throw new ForbiddenException('Only the owner can delete the workspace');
    }
    await this.workspaceMemberRepository.delete({ workspaceId });
    await this.invitationRepository.delete({ workspaceId });
    await this.workspaceRepository.remove(workspace);
  }

  async inviteMember(
    workspaceId: string,
    userId: string,
    memberRole: WorkspaceRole,
    dto: InviteMemberDto,
  ): Promise<WorkspaceInvitation> {
    if (
      memberRole !== WorkspaceRole.OWNER &&
      memberRole !== WorkspaceRole.ADMIN
    ) {
      throw new ForbiddenException('Only owners and admins can invite members');
    }

    const workspace = await this.workspaceRepository.findOneOrFail({
      where: { id: workspaceId },
    });

    const invitedUser = await this.usersService.findByEmail(dto.email);
    if (invitedUser) {
      const existingMember = await this.workspaceMemberRepository.findOne({
        where: { workspaceId, userId: invitedUser.id },
      });
      if (existingMember) {
        throw new BadRequestException('User is already a member');
      }
    }
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);
    const invitation = this.invitationRepository.create({
      workspaceId,
      invitedById: userId,
      email: dto.email,
      token,
      status: InvitationStatus.PENDING,
      expiresAt,
    });
    const saved = await this.invitationRepository.save(invitation);

    let inviterName = 'A team member';
    try {
      const profile = await this.usersService.getProfileByUserId(userId);
      if (profile?.name) inviterName = profile.name;
    } catch {
      // use default inviterName
    }

    const appUrl = this.configService.get<string>('APP_URL');
    const invitationUrl = appUrl
      ? `${appUrl.replace(/\/$/, '')}/invite?token=${token}`
      : `https://placeholder/invite?token=${token}`;
    if (!appUrl) {
      this.logger.warn(
        'APP_URL not set; set it in env so invitation emails contain a valid link',
      );
    }

    const result = await this.mailService.sendWorkspaceInvitation(
      dto.email,
      inviterName,
      workspace.name,
      invitationUrl,
    );
    if ('error' in result) {
      this.logger.warn(
        `Failed to send workspace invitation email to ${dto.email}: ${result.error.message}`,
      );
    }

    return saved;
  }

  async acceptInvitation(token: string, userId: string): Promise<Workspace> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['workspace'],
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Invitation is no longer valid');
    }
    if (new Date() > invitation.expiresAt) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      throw new BadRequestException('Invitation has expired');
    }
    const user = await this.usersService.findById(userId);
    if (!user || user.email !== invitation.email) {
      throw new ForbiddenException(
        'This invitation was sent to a different email',
      );
    }
    const existing = await this.workspaceMemberRepository.findOne({
      where: { workspaceId: invitation.workspaceId, userId },
    });
    if (existing) {
      throw new BadRequestException(
        'You are already a member of this workspace',
      );
    }
    const member = this.workspaceMemberRepository.create({
      workspaceId: invitation.workspaceId,
      userId,
      role: WorkspaceRole.MEMBER,
    });
    await this.workspaceMemberRepository.save(member);
    invitation.status = InvitationStatus.ACCEPTED;
    await this.invitationRepository.save(invitation);
    return this.getWorkspace(invitation.workspaceId, userId);
  }

  async removeMember(
    workspaceId: string,
    userId: string,
    memberRole: WorkspaceRole,
    targetUserId: string,
  ): Promise<void> {
    if (
      memberRole !== WorkspaceRole.OWNER &&
      memberRole !== WorkspaceRole.ADMIN
    ) {
      throw new ForbiddenException('Only owners and admins can remove members');
    }
    const target = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId: targetUserId },
    });
    if (!target) {
      throw new NotFoundException('Member not found');
    }
    if (target.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Cannot remove the workspace owner');
    }
    if (
      memberRole === WorkspaceRole.ADMIN &&
      target.role === WorkspaceRole.ADMIN
    ) {
      throw new ForbiddenException('Admins cannot remove other admins');
    }
    await this.workspaceMemberRepository.remove(target);
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    memberRole: WorkspaceRole,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
  ): Promise<WorkspaceMember> {
    if (memberRole !== WorkspaceRole.OWNER) {
      throw new ForbiddenException('Only the owner can update member roles');
    }
    const target = await this.workspaceMemberRepository.findOne({
      where: { workspaceId, userId: targetUserId },
    });
    if (!target) {
      throw new NotFoundException('Member not found');
    }
    if (target.role === WorkspaceRole.OWNER) {
      throw new ForbiddenException('Cannot change the owner role');
    }
    target.role = dto.role;
    await this.workspaceMemberRepository.save(target);
    return target;
  }
}
