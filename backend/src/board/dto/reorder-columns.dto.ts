import { IsArray, IsNumber, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ColumnOrderItemDto {
  @IsUUID()
  id!: string;

  @IsNumber()
  order!: number;
}

export class ReorderColumnsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ColumnOrderItemDto)
  columns!: ColumnOrderItemDto[];
}
