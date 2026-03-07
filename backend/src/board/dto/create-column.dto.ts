import { IsString, MaxLength } from 'class-validator';

export class CreateColumnDto {
  @IsString()
  @MaxLength(255)
  name!: string;
}
