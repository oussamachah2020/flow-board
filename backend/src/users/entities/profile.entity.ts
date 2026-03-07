import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Theme } from '../../types/profile/theme.type';

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 52, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  bio: string;

  @Column({ type: 'text', nullable: false })
  imageUrl: string;

  @Column({ type: 'enum', enum: Theme, default: Theme.LIGHT })
  theme: Theme;

  @Column({ default: true })
  emailNotifications: boolean;

  @Column({ default: 'UTC' })
  timezone: string;

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @JoinColumn({ name: 'user_id' })
  @OneToOne(() => User, (user) => user.profile)
  user: User;
}
