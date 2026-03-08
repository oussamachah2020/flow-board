import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hash } from 'bcrypt';
import { RefreshToken } from './entities/refresh.entity';
import { User } from './entities/user.entity';
import { Profile } from './entities/profile.entity';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Theme } from '../types/profile/theme.type';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const user: User | null = await this.userRepository.findOne({
      where: { email },
    });
    return user;
  }

  async findById(id: string): Promise<User | null> {
    const user: User | null = await this.userRepository.findOne({
      where: { id },
    });
    return user;
  }

  async createUser(createUserDto: RegisterDto): Promise<User> {
    const existingUser = await this.userRepository.findOneBy({
      email: createUserDto.email,
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    if (createUserDto.password !== createUserDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const hashedPassword = await hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      email: createUserDto.email,
      password: hashedPassword,
    });

    await this.userRepository.save(user);
    return user;
  }

  async updateEmailVerified(userId: string, verified: boolean): Promise<void> {
    await this.userRepository.update(
      { id: userId },
      { emailVerified: verified },
    );
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.userRepository.update(
      { id: userId },
      { password: hashedPassword },
    );
  }

  async getProfileByUserId(userId: string): Promise<Profile> {
    const profile: Profile | null = await this.profileRepository.findOne({
      where: { user: { id: userId } },
    });
    if (profile === null) {
      throw new NotFoundException('Profile not found');
    }
    profile.lastSeenAt = new Date();
    await this.profileRepository.save(profile);
    return profile;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<Profile> {
    const existing: Profile | null = await this.profileRepository.findOne({
      where: { user: { id: userId } },
    });
    let profile: Profile;
    if (existing !== null) {
      if (dto.name !== undefined) existing.name = dto.name;
      if (dto.bio !== undefined) existing.bio = dto.bio;
      if (dto.imageUrl !== undefined) existing.imageUrl = dto.imageUrl;
      if (dto.theme !== undefined) existing.theme = dto.theme;
      if (dto.emailNotifications !== undefined)
        existing.emailNotifications = dto.emailNotifications;
      if (dto.timezone !== undefined) existing.timezone = dto.timezone;
      profile = existing;
    } else {
      profile = this.profileRepository.create({
        name: dto.name ?? 'User',
        bio: dto.bio ?? '',
        imageUrl: dto.imageUrl ?? '',
        theme: dto.theme ?? Theme.LIGHT,
        emailNotifications: dto.emailNotifications ?? true,
        timezone: dto.timezone ?? 'UTC',
        user: { id: userId } as User,
      });
    }
    return this.profileRepository.save(profile);
  }
}
