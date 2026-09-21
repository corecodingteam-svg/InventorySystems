import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { PurchasingService } from './purchasing.service';
import {
  CreateGoodsReceiptDto,
  CreatePurchaseOrderDto,
  CreatePurchaseReturnDto,
  PurchaseOrderListQueryDto,
} from './dto/purchasing.dto';

@ApiTags('purchasing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class PurchasingController {
  constructor(private purchasingService: PurchasingService) {}

  @RequirePermissions('purchase.view')
  @Get('purchase-orders')
  list(@CurrentUser() user: JwtPayload, @Query() query: PurchaseOrderListQueryDto) {
    return this.purchasingService.listPurchaseOrders(user.organizationId, query);
  }

  @RequirePermissions('purchase.view')
  @Get('purchase-orders/:id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.purchasingService.findPurchaseOrder(user.organizationId, id);
  }

  @RequirePermissions('purchase.create')
  @Post('purchase-orders')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePurchaseOrderDto) {
    return this.purchasingService.createPurchaseOrder(user.organizationId, user.sub, dto);
  }

  @RequirePermissions('purchase.create')
  @Post('purchase-orders/:id/submit')
  submit(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.purchasingService.submitForApproval(user.organizationId, id);
  }

  @RequirePermissions('purchase.approve')
  @Post('purchase-orders/:id/approve')
  approve(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.purchasingService.approvePurchaseOrder(user.organizationId, user.sub, id);
  }

  @RequirePermissions('purchase.approve')
  @Post('purchase-orders/:id/cancel')
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.purchasingService.cancelPurchaseOrder(user.organizationId, id);
  }

  @RequirePermissions('purchase.receive')
  @Post('purchase-orders/:id/goods-receipts')
  receive(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateGoodsReceiptDto,
  ) {
    return this.purchasingService.createGoodsReceipt(user.organizationId, user.sub, id, dto);
  }

  @RequirePermissions('purchase.return')
  @Post('purchase-returns')
  createReturn(@CurrentUser() user: JwtPayload, @Body() dto: CreatePurchaseReturnDto) {
    return this.purchasingService.createPurchaseReturn(user.organizationId, user.sub, dto);
  }
}
