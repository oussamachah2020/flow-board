import { IsString, MaxLength } from 'class-validator';

export class RenameColumnDto {
  @IsString()
  @MaxLength(255)
  name!: string;
}
