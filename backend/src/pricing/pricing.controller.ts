import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsUUID, Min, MinLength, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { PricingService } from './pricing.service';

class CreatePriceListDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsIn(['GENERAL', 'CUSTOMER', 'WAREHOUSE'])
  scope: 'GENERAL' | 'CUSTOMER' | 'WAREHOUSE';

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsInt()
  priority?: number;
}

class SetItemPriceDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @Min(0)
  price: number;
}

class UpdatePriceListDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}

class ResolvePriceQueryDto {
  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;
}

@ApiTags('pricing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pricing')
export class PricingController {
  constructor(private pricingService: PricingService) {}

  @RequirePermissions('pricing.view')
  @Get('price-lists')
  list(@CurrentUser() user: JwtPayload) {
    return this.pricingService.listPriceLists(user.organizationId);
  }

  @RequirePermissions('pricing.manage')
  @Post('price-lists')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePriceListDto) {
    return this.pricingService.createPriceList(user.organizationId, dto);
  }

  @RequirePermissions('pricing.manage')
  @Patch('price-lists/:id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdatePriceListDto) {
    return this.pricingService.updatePriceList(user.organizationId, id, dto);
  }

  @RequirePermissions('pricing.manage')
  @Delete('price-lists/:id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.pricingService.removePriceList(user.organizationId, id);
  }

  @RequirePermissions('pricing.view')
  @Get('price-lists/:id/items')
  listItems(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.pricingService.listItems(user.organizationId, id);
  }

  @RequirePermissions('pricing.manage')
  @Post('price-lists/:id/items')
  setItemPrice(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: SetItemPriceDto) {
    return this.pricingService.setItemPrice(user.organizationId, id, dto.productId, dto.price);
  }

  @RequirePermissions('pricing.manage')
  @Delete('price-lists/:id/items/:productId')
  removeItem(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Param('productId') productId: string) {
    return this.pricingService.removeItem(user.organizationId, id, productId);
  }

  @RequirePermissions('pricing.view')
  @Get('resolve')
  resolve(@CurrentUser() user: JwtPayload, @Query() query: ResolvePriceQueryDto) {
    return this.pricingService
      .resolvePrice(user.organizationId, query.productId, {
        customerId: query.customerId,
        warehouseId: query.warehouseId,
      })
      .then((price) => ({ price }));
  }
}
