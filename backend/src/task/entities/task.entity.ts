import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Board } from '../../board/entities/board.entity';
import { BoardColumn } from '../../board/entities/board-column.entity';
import { WorkspaceMember } from '../../workspace/entities/workspace-member.entity';
import { User } from '../../users/entities/user.entity';
import { TaskType } from '../enums/task-type.enum';
import { TaskPriority } from '../enums/task-priority.enum';
import { TaskEvent } from './task-event.entity';
import { Comment } from './comment.entity';

@Entity('tasks')
@Index(['assigneeId'])
@Index(['columnId'])
@Index(['dueDate'])
@Index(['boardId'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'board_id' })
  boardId!: string;

  @ManyToOne(() => Board)
  @JoinColumn({ name: 'board_id' })
  board!: Board;

  @Column({ type: 'uuid', name: 'column_id' })
  columnId!: string;

  @ManyToOne(() => BoardColumn, (col) => col.tasks)
  @JoinColumn({ name: 'column_id' })
  column!: BoardColumn;

  @Column({ type: 'uuid', name: 'assignee_id', nullable: true })
  assigneeId!: string | null;

  @ManyToOne(() => WorkspaceMember)
  @JoinColumn({ name: 'assignee_id' })
  assignee!: WorkspaceMember | null;

  @Column({ type: 'uuid', name: 'created_by_id' })
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  createdBy!: User;

  @Column({ type: 'varchar', length: 255, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description: string | null = null;

  @Column({
    type: 'enum',
    enum: TaskType,
    default: TaskType.TASK,
  })
  type!: TaskType;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority!: TaskPriority;

  @Column({ type: 'timestamp', name: 'due_date', nullable: true })
  dueDate: Date | null = null;

  @Column({ type: 'int', default: 0 })
  order!: number;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;

  @OneToMany(() => TaskEvent, (event) => event.task)
  events!: TaskEvent[];

  @OneToMany(() => Comment, (comment) => comment.task)
  comments!: Comment[];
}
