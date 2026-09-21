import { IsEmail, IsIn, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { ListQueryDto } from '../../common/pagination/list-query.dto';

export class CreateCustomerDto {
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
  @IsNumber()
  @Min(0)
  creditLimit?: number;
}

export class UpdateCustomerDto {
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
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}

export class CustomerListQueryDto extends ListQueryDto {
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
