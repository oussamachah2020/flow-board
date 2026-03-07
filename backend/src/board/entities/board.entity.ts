import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Workspace } from '../../workspace/entities/workspace.entity';
import { User } from '../../users/entities/user.entity';
import { BoardMember } from './board-member.entity';
import { BoardColumn } from './board-column.entity';

@Entity('boards')
@Unique(['workspaceId', 'prefix'])
export class Board {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'workspace_id' })
  workspaceId!: string;

  @ManyToOne(() => Workspace)
  @JoinColumn({ name: 'workspace_id' })
  workspace!: Workspace;

  @Column({ type: 'uuid', name: 'created_by_id' })
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 5, default: 'B' })
  prefix!: string;

  @Column({ type: 'int', name: 'task_count', default: 0 })
  taskCount!: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null = null;

  @OneToMany(() => BoardMember, (member) => member.board)
  members!: BoardMember[];

  @OneToMany(() => BoardColumn, (col) => col.board)
  columns!: BoardColumn[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
