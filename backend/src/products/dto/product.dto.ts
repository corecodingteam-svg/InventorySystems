import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { ListQueryDto } from '../../common/pagination/list-query.dto';

const PRODUCT_TYPES = [
  'PHYSICAL',
  'SERVICE',
  'DIGITAL',
  'BUNDLE',
  'KIT',
  'RAW_MATERIAL',
  'FINISHED_GOOD',
  'SEMI_FINISHED',
  'CONSUMABLE',
  'ASSET',
  'SPARE_PART',
];

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  sku: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsUUID()
  baseUnitId: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsIn(PRODUCT_TYPES)
  productType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @IsOptional()
  @IsBoolean()
  trackBatches?: boolean;

  @IsOptional()
  @IsBoolean()
  trackSerials?: boolean;

  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderPoint?: number;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @IsOptional()
  @IsBoolean()
  trackBatches?: boolean;

  @IsOptional()
  @IsBoolean()
  trackSerials?: boolean;

  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  reorderPoint?: number;

  @IsOptional()
  @IsIn(['active', 'inactive', 'discontinued'])
  status?: string;
}

export class ProductListQueryDto extends ListQueryDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsOptional()
  @IsIn(['active', 'inactive', 'discontinued'])
  status?: string;
}

export class CreateVariantDto {
  @IsString()
  @MinLength(1)
  sku: string;

  @IsObject()
  attributes: Record<string, string>;

  @IsOptional()
  @IsString()
  barcode?: string;
}
