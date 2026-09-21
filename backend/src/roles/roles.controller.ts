import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsArray, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { RolesService } from './roles.service';

class CreateRoleDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsArray()
  permissionCodes: string[] = [];
}

class UpdateRolePermissionsDto {
  @IsArray()
  permissionCodes: string[];
}

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @RequirePermissions('role.view')
  @Get('permissions')
  listPermissions() {
    return this.rolesService.listPermissions();
  }

  @RequirePermissions('role.view')
  @Get('roles')
  listRoles(@CurrentUser() user: JwtPayload) {
    return this.rolesService.listRoles(user.organizationId);
  }

  @RequirePermissions('role.create')
  @Post('roles')
  createRole(@CurrentUser() user: JwtPayload, @Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(user.organizationId, dto);
  }

  @RequirePermissions('role.update')
  @Patch('roles/:id/permissions')
  updatePermissions(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.rolesService.updateRolePermissions(
      user.organizationId,
      id,
      dto.permissionCodes,
    );
  }
}
