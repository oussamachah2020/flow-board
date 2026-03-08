import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Profile } from './profile.entity';
import { RefreshToken } from './refresh.entity';
import { ROLE } from 'src/types/auth/user.type';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  password: string;

  @Column({ type: 'enum', enum: ROLE, default: ROLE.MEMEBER })
  role: ROLE;

  @Column({ type: 'boolean', default: false, name: 'email_verified' })
  emailVerified: boolean;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];

  @OneToOne(() => Profile, (profile) => profile.user)
  profile: Profile;

  @OneToMany('Workspace', 'owner')
  ownedWorkspaces?: import('../../workspace/entities/workspace.entity').Workspace[];

  @OneToMany('WorkspaceMember', 'user')
  workspaceMemberships?: import('../../workspace/entities/workspace-member.entity').WorkspaceMember[];

  @OneToMany('WorkspaceInvitation', 'invitedBy')
  workspaceInvitationsSent?: import('../../workspace/entities/workspace-invitation.entity').WorkspaceInvitation[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
