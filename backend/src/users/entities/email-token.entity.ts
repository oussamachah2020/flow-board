import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum EmailTokenType {
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
}

@Entity('email_tokens')
export class EmailToken {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, nullable: false })
  tokenHash: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: EmailTokenType,
    nullable: false,
  })
  type: EmailTokenType;

  @Column({ type: 'timestamp', nullable: false })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
