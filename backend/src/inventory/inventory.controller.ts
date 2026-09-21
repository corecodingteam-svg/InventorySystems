import { Body, Controller, Get, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { paginate } from '../common/pagination/list-query.dto';
import { IdempotencyInterceptor } from '../common/idempotency.interceptor';
import { InventoryService } from './inventory.service';
import {
  AdjustStockDto,
  LedgerQueryDto,
  OpeningStockDto,
  StockQueryDto,
  TransferStockDto,
} from './dto/inventory.dto';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @RequirePermissions('inventory.view')
  @Get('stock')
  async stock(@CurrentUser() user: JwtPayload, @Query() query: StockQueryDto) {
    const { rows, total } = await this.inventoryService.listBalances(user.organizationId, query);
    return paginate(rows, total, query.page, query.pageSize);
  }

  @RequirePermissions('inventory.view')
  @Get('ledger')
  async ledger(@CurrentUser() user: JwtPayload, @Query() query: LedgerQueryDto) {
    const { rows, total } = await this.inventoryService.listLedger(user.organizationId, query);
    return paginate(rows, total, query.page, query.pageSize);
  }

  @RequirePermissions('inventory.adjust')
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'Safe to retry with the same key — see docs/testing.md' })
  @UseInterceptors(IdempotencyInterceptor)
  @Post('opening-stock')
  openingStock(@CurrentUser() user: JwtPayload, @Body() dto: OpeningStockDto) {
    return this.inventoryService.postMovement(user.organizationId, user.sub, {
      productId: dto.productId,
      variantId: dto.variantId,
      warehouseId: dto.warehouseId,
      locationId: dto.locationId,
      batchId: dto.batchId,
      transactionType: 'OPENING_STOCK',
      quantityIn: dto.quantity,
      unitCost: dto.unitCost,
      referenceType: 'OPENING_STOCK',
    });
  }

  @RequirePermissions('inventory.adjust')
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'Safe to retry with the same key — see docs/testing.md' })
  @UseInterceptors(IdempotencyInterceptor)
  @Post('adjustments')
  adjust(@CurrentUser() user: JwtPayload, @Body() dto: AdjustStockDto) {
    return this.inventoryService.postMovement(user.organizationId, user.sub, {
      productId: dto.productId,
      variantId: dto.variantId,
      warehouseId: dto.warehouseId,
      locationId: dto.locationId,
      batchId: dto.batchId,
      transactionType: dto.direction === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
      quantityIn: dto.direction === 'IN' ? dto.quantity : undefined,
      quantityOut: dto.direction === 'OUT' ? dto.quantity : undefined,
      unitCost: dto.unitCost,
      notes: dto.notes,
      referenceType: 'ADJUSTMENT',
    });
  }

  @RequirePermissions('inventory.transfer')
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'Safe to retry with the same key — see docs/testing.md' })
  @UseInterceptors(IdempotencyInterceptor)
  @Post('transfers')
  transfer(@CurrentUser() user: JwtPayload, @Body() dto: TransferStockDto) {
    return this.inventoryService.transfer(user.organizationId, user.sub, {
      productId: dto.productId,
      variantId: dto.variantId,
      batchId: dto.batchId,
      fromWarehouseId: dto.fromWarehouseId,
      fromLocationId: dto.fromLocationId,
      toWarehouseId: dto.toWarehouseId,
      toLocationId: dto.toLocationId,
      quantity: dto.quantity,
      notes: dto.notes,
      referenceType: 'TRANSFER',
    });
  }
}
