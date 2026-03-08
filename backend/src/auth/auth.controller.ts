import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from '../users/dto/register.dto';
import { LoginDto } from '../users/dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateThemeDto } from './dto/update-theme.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtPayload } from '../types/auth';
import { REFRESH_TOKEN_COOKIE } from './auth.constants';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getRefreshTokenExpiryDays(): number {
    // ConfigService.get is typed; eslint may not resolve @nestjs/config in all environments
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const value: unknown = this.configService.get<number>(
      'REFRESH_TOKEN_EXPIRY_DAYS',
    );
    return typeof value === 'number' && Number.isInteger(value) ? value : 7;
  }

  private isProduction(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const value: unknown = this.configService.get<string>('NODE_ENV');
    return value === 'production';
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    const days = this.getRefreshTokenExpiryDays();
    const isProduction = this.isProduction();
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: days * 24 * 60 * 60 * 1000,
      path: '/',
      secure: isProduction,
    });
  }

  private clearRefreshTokenCookie(res: Response): void {
    const isProduction = this.isProduction();
    res.clearCookie(REFRESH_TOKEN_COOKIE, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
    });
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    this.setRefreshTokenCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request & { cookies?: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken: string | undefined = req.cookies?.[
      REFRESH_TOKEN_COOKIE
    ] as string | undefined;
    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refresh(refreshToken ?? '');
    this.setRefreshTokenCookie(res, newRefreshToken);
    return { accessToken };
  }

  @Post('verify-email')
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
    return {};
  }

  @Post('resend-verification')
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.authService.resendVerification(dto.email);
    return {};
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return {};
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
    return {};
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: JwtPayload) {
    return this.authService.getMe(user.sub);
  }

  @Patch('me/theme')
  @UseGuards(JwtAuthGuard)
  updateTheme(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateThemeDto,
  ) {
    return this.authService.updateTheme(user.sub, dto.theme);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Req() req: Request & { cookies?: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken: string | undefined = req.cookies?.[
      REFRESH_TOKEN_COOKIE
    ] as string | undefined;
    await this.authService.logout(user.sub, refreshToken);
    this.clearRefreshTokenCookie(res);
    return {};
  }
}
