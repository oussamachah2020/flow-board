import { IsEnum } from 'class-validator';
import { Theme } from '../../types/profile/theme.type';

export class UpdateThemeDto {
  @IsEnum(Theme)
  theme: Theme;
}
