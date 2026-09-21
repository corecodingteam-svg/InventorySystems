import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { SerialNumbersService } from './serial-numbers.service';

class CreateSerialDto {
  @IsUUID()
  productId: string;

  @IsString()
  @MinLength(1)
  serialNumber: string;
}

class SerialQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize: number = 25;
}

@ApiTags('serial-numbers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('serial-numbers')
export class SerialNumbersController {
  constructor(private serialNumbersService: SerialNumbersService) {}

  @RequirePermissions('serial.view')
  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: SerialQueryDto) {
    return this.serialNumbersService.list(user.organizationId, query);
  }

  @RequirePermissions('serial.manage')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSerialDto) {
    return this.serialNumbersService.create(user.organizationId, dto.productId, dto.serialNumber);
  }

  @RequirePermissions('serial.view')
  @Get(':id/history')
  history(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.serialNumbersService.history(user.organizationId, id);
  }
}
