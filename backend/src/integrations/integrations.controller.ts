import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsObject, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { IntegrationsService } from './integrations.service';

class CreateIntegrationDto {
  @IsString()
  @MinLength(1)
  provider: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsObject()
  config: Record<string, unknown>;
}

@ApiTags('integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private integrationsService: IntegrationsService) {}

  @RequirePermissions('integration.manage')
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.integrationsService.list(user.organizationId);
  }

  @RequirePermissions('integration.manage')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateIntegrationDto) {
    return this.integrationsService.create(user.organizationId, dto);
  }

  @RequirePermissions('integration.manage')
  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.integrationsService.remove(user.organizationId, id);
  }
}
