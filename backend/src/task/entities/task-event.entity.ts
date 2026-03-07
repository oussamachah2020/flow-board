import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Task } from './task.entity';
import { User } from '../../users/entities/user.entity';
import { TaskEventType } from '../enums/task-event-type.enum';

@Entity('task_events')
export class TaskEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'task_id' })
  taskId!: string;

  @ManyToOne(() => Task, (task) => task.events)
  @JoinColumn({ name: 'task_id' })
  task!: Task;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({
    type: 'enum',
    enum: TaskEventType,
  })
  type!: TaskEventType;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null = null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
