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
import { compare, hash } from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from '../users/entities/refresh.entity';
import { EmailToken, EmailTokenType } from '../users/entities/email-token.entity';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from '../users/dto/register.dto';
import { LoginDto } from '../users/dto/login.dto';
import { TokenPair } from '../types/auth';
import { Theme } from '../types/profile/theme.type';

const VERIFICATION_EXPIRY_HOURS = 24;
const PASSWORD_RESET_EXPIRY_HOURS = 1;
const DEFAULT_DEV_APP_URL = 'http://localhost:5173';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(EmailToken)
    private readonly emailTokenRepository: Repository<EmailToken>,
  ) {}

  private getAppUrl(): string {
    const env = this.configService.get<string>('APP_URL');
    if (env) return env;
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    if (nodeEnv !== 'production') return DEFAULT_DEV_APP_URL;
    throw new BadRequestException(
      'Email verification is not configured (APP_URL missing). Set APP_URL in production.',
    );
  }

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const user = await this.usersService.createUser(dto);
    const appUrl = this.getAppUrl();
    const { rawToken } = await this.createEmailToken(
      user.id,
      EmailTokenType.EMAIL_VERIFICATION,
      VERIFICATION_EXPIRY_HOURS,
    );
    const verifyUrl = `${appUrl.replace(/\/$/, '')}/verify-email?token=${rawToken}`;
    const result = await this.mailService.sendVerificationEmail(
      user.email,
      verifyUrl,
    );
    if ('error' in result) {
      throw new BadRequestException(
        result.error.message ?? 'Failed to send verification email',
      );
    }
    return {
      message: 'Check your email to verify your account',
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
    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email before signing in');
    }
    const tokens = await this.issueTokenPair(user);
    return {
      ...tokens,
    };
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const emailToken = await this.emailTokenRepository.findOne({
      where: { tokenHash, type: EmailTokenType.EMAIL_VERIFICATION },
      relations: ['user'],
    });
    if (
      !emailToken ||
      emailToken.expiresAt < new Date() ||
      !emailToken.user
    ) {
      throw new BadRequestException('Invalid or expired verification link');
    }
    const user = await this.usersService.findById(emailToken.user.id);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    user.emailVerified = true;
    await this.usersService.updateEmailVerified(user.id, true);
    await this.emailTokenRepository.remove(emailToken);
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.emailVerified) {
      return;
    }
    const appUrl = this.getAppUrl();
    await this.emailTokenRepository.delete({
      user: { id: user.id },
      type: EmailTokenType.EMAIL_VERIFICATION,
    });
    const { rawToken } = await this.createEmailToken(
      user.id,
      EmailTokenType.EMAIL_VERIFICATION,
      VERIFICATION_EXPIRY_HOURS,
    );
    const verifyUrl = `${appUrl.replace(/\/$/, '')}/verify-email?token=${rawToken}`;
    const result = await this.mailService.sendVerificationEmail(
      user.email,
      verifyUrl,
    );
    if ('error' in result) {
      throw new BadRequestException(
        result.error.message ?? 'Failed to send verification email',
      );
    }
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return;
    }
    const appUrl = this.getAppUrl();
    const { rawToken } = await this.createEmailToken(
      user.id,
      EmailTokenType.PASSWORD_RESET,
      PASSWORD_RESET_EXPIRY_HOURS,
    );
    const resetUrl = `${appUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}`;
    await this.mailService.sendPasswordResetEmail(user.email, resetUrl);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const emailToken = await this.emailTokenRepository.findOne({
      where: { tokenHash, type: EmailTokenType.PASSWORD_RESET },
      relations: ['user'],
    });
    if (
      !emailToken ||
      emailToken.expiresAt < new Date() ||
      !emailToken.user
    ) {
      throw new BadRequestException('Invalid or expired reset link');
    }
    const hashedPassword = await hash(newPassword, 10);
    await this.usersService.updatePassword(emailToken.user.id, hashedPassword);
    await this.emailTokenRepository.remove(emailToken);
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

  async getMe(userId: string): Promise<{
    id: string;
    email: string;
    profile: { theme: Theme; name: string; id: string };
  }> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const profile = await this.usersService.getProfileByUserId(userId);
    return {
      id: user.id,
      email: user.email,
      profile: {
        id: profile.id,
        name: profile.name,
        theme: profile.theme,
      },
    };
  }

  async updateTheme(userId: string, theme: Theme): Promise<{ theme: Theme }> {
    const profile = await this.usersService.updateProfile(userId, { theme });
    return { theme: profile.theme };
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

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async createEmailToken(
    userId: string,
    type: EmailTokenType,
    expiryHours: number,
  ): Promise<{ rawToken: string }> {
    const rawToken = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);
    await this.emailTokenRepository.save(
      this.emailTokenRepository.create({
        tokenHash: this.hashToken(rawToken),
        user: { id: userId } as User,
        type,
        expiresAt,
      }),
    );
    return { rawToken };
  }
}
