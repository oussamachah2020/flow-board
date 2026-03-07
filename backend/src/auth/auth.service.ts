import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { compare } from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from '../users/entities/refresh.entity';
import { UsersService } from '../users/users.service';
import { RegisterDto } from '../users/dto/register.dto';
import { LoginDto } from '../users/dto/login.dto';
import { TokenPair } from '../types/auth';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async register(dto: RegisterDto): Promise<TokenPair> {
    const user = await this.usersService.createUser(dto);
    const tokens = await this.issueTokenPair(user);
    return {
      ...tokens,
    };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await compare(password, user.password))) {
      return null;
    }
    return user;
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const tokens = await this.issueTokenPair(user);
    return {
      ...tokens,
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }
    const tokenHash = this.hashRefreshToken(refreshToken);
    const stored = await this.refreshTokenRepository.findOne({
      where: { token: tokenHash },
      relations: ['user'],
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    return this.rotateRefreshTokenAndIssuePair(stored);
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const tokenHash = this.hashRefreshToken(refreshToken);
      await this.refreshTokenRepository.delete({
        token: tokenHash,
        user: { id: userId },
      });
    } else {
      await this.refreshTokenRepository.delete({ user: { id: userId } });
    }
  }

  private async issueTokenPair(user: User): Promise<TokenPair> {
    const expiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRY', '15m') ?? '15m';
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, role: user.role },
      { expiresIn: expiresIn as '15m' },
    );
    const rawRefresh = randomBytes(32).toString('hex');
    const refreshExpiryDays = this.configService.get<number>(
      'REFRESH_TOKEN_EXPIRY_DAYS',
      7,
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpiryDays);
    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        token: this.hashRefreshToken(rawRefresh),
        user: { id: user.id } as User,
        expiresAt,
      }),
    );
    return {
      accessToken,
      refreshToken: rawRefresh,
    };
  }

  private async rotateRefreshTokenAndIssuePair(
    stored: RefreshToken,
  ): Promise<TokenPair> {
    const expiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRY', '15m') ?? '15m';
    const accessToken = await this.jwtService.signAsync(
      { sub: stored.user.id, role: stored.user.role },
      { expiresIn: expiresIn as '15m' },
    );
    const rawRefresh = randomBytes(32).toString('hex');
    const refreshExpiryDays = this.configService.get<number>(
      'REFRESH_TOKEN_EXPIRY_DAYS',
      7,
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshExpiryDays);
    stored.token = this.hashRefreshToken(rawRefresh);
    stored.expiresAt = expiresAt;
    await this.refreshTokenRepository.save(stored);
    return {
      accessToken,
      refreshToken: rawRefresh,
    };
  }

  private hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
