import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskPriority } from '../enums/task-priority.enum';
import { TaskType } from '../enums/task-type.enum';

export class FilterTasksDto {
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(TaskPriority, { each: true })
  priority?: TaskPriority[];

  @IsOptional()
  @IsArray()
  @IsEnum(TaskType, { each: true })
  type?: TaskType[];

  @IsOptional()
  dueDateFrom?: Date;

  @IsOptional()
  dueDateTo?: Date;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  columnId?: string[];

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  overdue?: boolean;
}
