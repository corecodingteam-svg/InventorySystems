import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { UnitsService } from './units.service';
import { CreateUnitConversionDto, CreateUnitDto, UpdateUnitDto } from './dto/unit.dto';

@ApiTags('units')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('units')
export class UnitsController {
  constructor(private unitsService: UnitsService) {}

  @RequirePermissions('unit.view')
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.unitsService.list(user.organizationId);
  }

  @RequirePermissions('unit.manage')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateUnitDto) {
    return this.unitsService.create(user.organizationId, dto);
  }

  @RequirePermissions('unit.manage')
  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.unitsService.update(user.organizationId, id, dto);
  }

  @RequirePermissions('unit.manage')
  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.unitsService.remove(user.organizationId, id);
  }

  @RequirePermissions('unit.view')
  @Get('conversions/all')
  listConversions(@CurrentUser() user: JwtPayload) {
    return this.unitsService.listConversions(user.organizationId);
  }

  @RequirePermissions('unit.manage')
  @Post('conversions')
  createConversion(@CurrentUser() user: JwtPayload, @Body() dto: CreateUnitConversionDto) {
    return this.unitsService.createConversion(user.organizationId, dto);
  }
}
