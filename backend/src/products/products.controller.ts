import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  CreateVariantDto,
  ProductListQueryDto,
  UpdateProductDto,
} from './dto/product.dto';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @RequirePermissions('product.view')
  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ProductListQueryDto) {
    return this.productsService.list(user.organizationId, query);
  }

  @RequirePermissions('product.view')
  @Get('barcode/:code')
  findByBarcode(@CurrentUser() user: JwtPayload, @Param('code') code: string) {
    return this.productsService.findByBarcode(user.organizationId, code);
  }

  @RequirePermissions('product.view')
  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.productsService.findOne(user.organizationId, id);
  }

  @RequirePermissions('product.create')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.organizationId, dto);
  }

  @RequirePermissions('product.update')
  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(user.organizationId, id, dto);
  }

  @RequirePermissions('product.delete')
  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.productsService.remove(user.organizationId, id);
  }

  @RequirePermissions('product.view')
  @Get(':id/variants')
  listVariants(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.productsService.listVariants(user.organizationId, id);
  }

  @RequirePermissions('product.update')
  @Post(':id/variants')
  createVariant(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.productsService.createVariant(user.organizationId, id, dto);
  }
}
