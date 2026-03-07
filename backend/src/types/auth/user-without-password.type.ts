import { User } from '../../users/entities/user.entity';

export type UserWithoutPassword = Omit<User, 'password'>;
