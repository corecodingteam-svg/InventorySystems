import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { CustomFieldsService } from './custom-fields.service';
import {
  CreateCustomFieldDefinitionDto,
  SetCustomFieldValuesDto,
  UpdateCustomFieldDefinitionDto,
} from './dto/custom-field.dto';

class EntityTypeQueryDto {
  @IsString()
  @MinLength(1)
  entityType: string;
}

@ApiTags('custom-fields')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('custom-fields')
export class CustomFieldsController {
  constructor(private customFieldsService: CustomFieldsService) {}

  @RequirePermissions('custom_field.view')
  @Get('definitions')
  listDefinitions(@CurrentUser() user: JwtPayload, @Query() query: EntityTypeQueryDto) {
    return this.customFieldsService.listDefinitions(user.organizationId, query.entityType);
  }

  @RequirePermissions('custom_field.manage')
  @Post('definitions')
  createDefinition(@CurrentUser() user: JwtPayload, @Body() dto: CreateCustomFieldDefinitionDto) {
    return this.customFieldsService.createDefinition(user.organizationId, dto);
  }

  @RequirePermissions('custom_field.manage')
  @Patch('definitions/:id')
  updateDefinition(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCustomFieldDefinitionDto,
  ) {
    return this.customFieldsService.updateDefinition(user.organizationId, id, dto);
  }

  @RequirePermissions('custom_field.manage')
  @Delete('definitions/:id')
  removeDefinition(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.customFieldsService.removeDefinition(user.organizationId, id);
  }

  @RequirePermissions('custom_field.view')
  @Get('values/:entityType/:entityId')
  getValues(
    @CurrentUser() user: JwtPayload,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.customFieldsService.getValues(user.organizationId, entityType, entityId);
  }

  @RequirePermissions('custom_field.manage')
  @Post('values/:entityType')
  setValues(
    @CurrentUser() user: JwtPayload,
    @Param('entityType') entityType: string,
    @Body() dto: SetCustomFieldValuesDto,
  ) {
    return this.customFieldsService.setValues(user.organizationId, entityType, dto);
  }
}
