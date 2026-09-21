import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, SupplierListQueryDto, UpdateSupplierDto } from './dto/supplier.dto';

@ApiTags('suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @RequirePermissions('supplier.view')
  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: SupplierListQueryDto) {
    return this.suppliersService.list(user.organizationId, query);
  }

  @RequirePermissions('supplier.view')
  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.suppliersService.findOne(user.organizationId, id);
  }

  @RequirePermissions('supplier.manage')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSupplierDto) {
    return this.suppliersService.create(user.organizationId, dto);
  }

  @RequirePermissions('supplier.manage')
  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.suppliersService.update(user.organizationId, id, dto);
  }
}
