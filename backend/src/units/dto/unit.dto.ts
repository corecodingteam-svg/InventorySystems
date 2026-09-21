import { IsNumber, IsOptional, IsPositive, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  code: string;
}

export class UpdateUnitDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}

export class CreateUnitConversionDto {
  @IsUUID()
  fromUnitId: string;

  @IsUUID()
  toUnitId: string;

  @IsNumber()
  @IsPositive()
  factor: number;
}
