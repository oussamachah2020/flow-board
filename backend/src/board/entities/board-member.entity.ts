import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Board } from './board.entity';
import { WorkspaceMember } from '../../workspace/entities/workspace-member.entity';

@Entity('board_members')
@Unique(['boardId', 'workspaceMemberId'])
export class BoardMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'board_id' })
  boardId!: string;

  @ManyToOne(() => Board, (board) => board.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'board_id' })
  board!: Board;

  @Column({ type: 'uuid', name: 'workspace_member_id' })
  workspaceMemberId!: string;

  @ManyToOne(() => WorkspaceMember)
  @JoinColumn({ name: 'workspace_member_id' })
  workspaceMember!: WorkspaceMember;

  @CreateDateColumn({ name: 'added_at' })
  addedAt!: Date;
}
