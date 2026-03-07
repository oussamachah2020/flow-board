import { ROLE } from './user.type';

export interface JwtPayload {
  sub: string;
  role: ROLE;
}
