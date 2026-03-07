import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { TaskType } from '../enums/task-type.enum';
import { TaskPriority } from '../enums/task-priority.enum';

export class CreateTaskDto {
  @IsUUID()
  columnId!: string;

  @IsString()
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @IsOptional()
  dueDate?: Date;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
