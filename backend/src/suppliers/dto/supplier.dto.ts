import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { ListQueryDto } from '../../common/pagination/list-query.dto';

export class CreateSupplierDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  code: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;
}

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}

export class SupplierListQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
