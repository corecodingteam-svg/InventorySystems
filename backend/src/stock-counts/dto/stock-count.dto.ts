import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateStockCountDto {
  @IsUUID()
  warehouseId: string;

  @IsOptional()
  @IsIn(['FULL', 'CYCLE'])
  countType?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Omit to auto-populate one line per product currently stocked in this warehouse. */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  productIds?: string[];
}

export class SubmitCountLineDto {
  @IsUUID()
  lineId: string;

  @IsNumber()
  @Min(0)
  countedQuantity: number;
}

export class SubmitStockCountDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SubmitCountLineDto)
  lines: SubmitCountLineDto[];
}

export class StockCountListQueryDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize: number = 25;
}
