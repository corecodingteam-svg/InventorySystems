import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { CategoriesService } from './categories.service';

class CategoryDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @RequirePermissions('category.view')
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.categoriesService.list(user.organizationId);
  }

  @RequirePermissions('category.manage')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CategoryDto) {
    return this.categoriesService.create(user.organizationId, { name: dto.name, parentId: dto.parentId ?? null });
  }

  @RequirePermissions('category.manage')
  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(user.organizationId, id, dto);
  }

  @RequirePermissions('category.manage')
  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.categoriesService.remove(user.organizationId, id);
  }
}
