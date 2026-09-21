import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { ListQueryDto } from '../common/pagination/list-query.dto';
import { WarehousesService } from './warehouses.service';

class WarehouseDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  code: string;
}

class UpdateWarehouseDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}

class LocationDto {
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  code: string;

  @IsOptional()
  @IsIn(['ZONE', 'RACK', 'SHELF', 'BIN', 'RECEIVING', 'DISPATCH', 'RETURNS', 'DAMAGED', 'QUARANTINE'])
  locationType?: string;
}

@ApiTags('warehouses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('warehouses')
export class WarehousesController {
  constructor(private warehousesService: WarehousesService) {}

  @RequirePermissions('warehouse.view')
  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ListQueryDto) {
    return this.warehousesService.list(user.organizationId, query);
  }

  @RequirePermissions('warehouse.view')
  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.warehousesService.findOne(user.organizationId, id);
  }

  @RequirePermissions('warehouse.manage')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: WarehouseDto) {
    return this.warehousesService.create(user.organizationId, dto);
  }

  @RequirePermissions('warehouse.manage')
  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    return this.warehousesService.update(user.organizationId, id, dto);
  }

  @RequirePermissions('warehouse.view')
  @Get(':id/locations')
  listLocations(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.warehousesService.listLocations(user.organizationId, id);
  }

  @RequirePermissions('warehouse.manage')
  @Post(':id/locations')
  createLocation(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: LocationDto,
  ) {
    return this.warehousesService.createLocation(user.organizationId, { warehouseId: id, ...dto });
  }
}
