import { IsNumber, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class MoveTaskDto {
  @IsUUID()
  columnId!: string;

  @IsNumber()
  @Type(() => Number)
  order!: number;

  @IsNumber()
  @Type(() => Number)
  expectedVersion!: number;
}
