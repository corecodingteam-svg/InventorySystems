import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { TaxService } from './tax.service';

class TaxCategoryDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  code: string;
}

class TaxRateDto {
  @IsUUID()
  taxCategoryId: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsNumber()
  @Min(0)
  ratePercent: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

class TaxCategoryQueryDto {
  @IsUUID()
  taxCategoryId: string;
}

class UpdateTaxCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  code?: string;
}

@ApiTags('tax')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tax')
export class TaxController {
  constructor(private taxService: TaxService) {}

  @RequirePermissions('tax.view')
  @Get('categories')
  listCategories(@CurrentUser() user: JwtPayload) {
    return this.taxService.listCategories(user.organizationId);
  }

  @RequirePermissions('tax.manage')
  @Post('categories')
  createCategory(@CurrentUser() user: JwtPayload, @Body() dto: TaxCategoryDto) {
    return this.taxService.createCategory(user.organizationId, dto.name, dto.code);
  }

  @RequirePermissions('tax.manage')
  @Patch('categories/:id')
  updateCategory(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateTaxCategoryDto) {
    return this.taxService.updateCategory(user.organizationId, id, dto);
  }

  @RequirePermissions('tax.manage')
  @Delete('categories/:id')
  removeCategory(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.taxService.removeCategory(user.organizationId, id);
  }

  @RequirePermissions('tax.view')
  @Get('rates')
  listRates(@CurrentUser() user: JwtPayload, @Query() query: TaxCategoryQueryDto) {
    return this.taxService.listRates(user.organizationId, query.taxCategoryId);
  }

  @RequirePermissions('tax.manage')
  @Post('rates')
  createRate(@CurrentUser() user: JwtPayload, @Body() dto: TaxRateDto) {
    return this.taxService.createRate(user.organizationId, dto);
  }

  @RequirePermissions('tax.manage')
  @Delete('rates/:id')
  removeRate(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.taxService.removeRate(user.organizationId, id);
  }
}
