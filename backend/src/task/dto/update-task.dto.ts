import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskType } from '../enums/task-type.enum';
import { TaskPriority } from '../enums/task-priority.enum';

export class UpdateTaskDto {
  @IsNumber()
  @Type(() => Number)
  expectedVersion!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  type?: TaskType;

  @IsOptional()
  priority?: TaskPriority;

  @IsOptional()
  dueDate?: Date | null;

  @IsOptional()
  assigneeId?: string | null;
}
