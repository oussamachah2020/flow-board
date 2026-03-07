import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Board } from './board.entity';
import { Task } from '../../task/entities/task.entity';

@Entity('board_columns')
export class BoardColumn {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'board_id' })
  boardId!: string;

  @ManyToOne(() => Board, (board) => board.columns, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'board_id' })
  board!: Board;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'int', default: 0 })
  order!: number;

  @OneToMany(() => Task, (task) => task.column)
  tasks!: Task[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
