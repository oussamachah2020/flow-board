import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Workspace } from './workspace.entity';
import { User } from '../../users/entities/user.entity';
import { InvitationStatus } from '../enums/invitation-status.enum';

@Entity('workspace_invitations')
export class WorkspaceInvitation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId!: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.invitations)
  @JoinColumn({ name: 'workspace_id' })
  workspace!: Workspace;

  @Column({ type: 'uuid', name: 'invited_by_id' })
  invitedById!: string;

  @ManyToOne(() => User, 'workspaceInvitationsSent')
  @JoinColumn({ name: 'invited_by_id' })
  invitedBy!: User;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  token!: string;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status!: InvitationStatus;

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
