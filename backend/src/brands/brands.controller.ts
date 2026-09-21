import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { BrandsService } from './brands.service';

class BrandDto {
  @IsString()
  @MinLength(1)
  name: string;
}

@ApiTags('brands')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('brands')
export class BrandsController {
  constructor(private brandsService: BrandsService) {}

  @RequirePermissions('brand.view')
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.brandsService.list(user.organizationId);
  }

  @RequirePermissions('brand.manage')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: BrandDto) {
    return this.brandsService.create(user.organizationId, dto.name);
  }

  @RequirePermissions('brand.manage')
  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: BrandDto) {
    return this.brandsService.update(user.organizationId, id, dto.name);
  }

  @RequirePermissions('brand.manage')
  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.brandsService.remove(user.organizationId, id);
  }
}
