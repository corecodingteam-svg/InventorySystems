import { Body, Controller, Get, Param, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { IdempotencyInterceptor } from '../common/idempotency.interceptor';
import { StockCountsService } from './stock-counts.service';
import { CreateStockCountDto, StockCountListQueryDto, SubmitStockCountDto } from './dto/stock-count.dto';

@ApiTags('stock-counts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('stock-counts')
export class StockCountsController {
  constructor(private stockCountsService: StockCountsService) {}

  @RequirePermissions('inventory.count')
  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: StockCountListQueryDto) {
    return this.stockCountsService.list(user.organizationId, query);
  }

  @RequirePermissions('inventory.count')
  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.stockCountsService.findOne(user.organizationId, id);
  }

  @RequirePermissions('inventory.count')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateStockCountDto) {
    return this.stockCountsService.create(user.organizationId, user.sub, dto);
  }

  @RequirePermissions('inventory.count')
  @Post(':id/start')
  start(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.stockCountsService.start(user.organizationId, id);
  }

  @RequirePermissions('inventory.count')
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  @UseInterceptors(IdempotencyInterceptor)
  @Post(':id/submit')
  submit(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: SubmitStockCountDto) {
    return this.stockCountsService.submit(user.organizationId, user.sub, id, dto);
  }

  @RequirePermissions('inventory.adjust')
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  @UseInterceptors(IdempotencyInterceptor)
  @Post(':id/approve')
  approve(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.stockCountsService.approve(user.organizationId, user.sub, id);
  }

  @RequirePermissions('inventory.count')
  @Post(':id/cancel')
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.stockCountsService.cancel(user.organizationId, id);
  }
}
