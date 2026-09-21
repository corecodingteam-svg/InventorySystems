import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class ReportDateRangeDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsIn(['csv'])
  format?: 'csv';
}

export class StockValuationQueryDto {
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsIn(['csv'])
  format?: 'csv';

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

export class ReorderForecastQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  windowDays: number = 30;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  leadTimeDays: number = 7;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  safetyStockDays: number = 3;

  @IsOptional()
  @IsIn(['csv'])
  format?: 'csv';
}
