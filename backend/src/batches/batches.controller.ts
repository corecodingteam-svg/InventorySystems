import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { BatchesService } from './batches.service';

class CreateBatchDto {
  @IsUUID()
  productId: string;

  @IsString()
  @MinLength(1)
  batchNumber: string;

  @IsOptional()
  @IsDateString()
  manufactureDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

class BatchQueryDto {
  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  expiringBeforeDays?: number;

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

@ApiTags('batches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('batches')
export class BatchesController {
  constructor(private batchesService: BatchesService) {}

  @RequirePermissions('batch.view')
  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: BatchQueryDto) {
    return this.batchesService.list(user.organizationId, query);
  }

  @RequirePermissions('batch.manage')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateBatchDto) {
    return this.batchesService.create(user.organizationId, dto);
  }
}
