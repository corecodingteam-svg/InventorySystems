import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { OrganizationsService } from './organizations.service';

class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Get('current')
  getCurrent(@CurrentUser() user: JwtPayload) {
    return this.organizationsService.getCurrent(user.organizationId);
  }

  @RequirePermissions('organization.update')
  @Patch('current')
  updateCurrent(@CurrentUser() user: JwtPayload, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.updateCurrent(user.organizationId, dto);
  }
}
