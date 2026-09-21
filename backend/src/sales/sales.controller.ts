import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { SalesService } from './sales.service';
import {
  CreateDispatchDto,
  CreateSalesOrderDto,
  CreateSalesReturnDto,
  SalesOrderListQueryDto,
} from './dto/sales.dto';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class SalesController {
  constructor(private salesService: SalesService) {}

  @RequirePermissions('sales.view')
  @Get('sales-orders')
  list(@CurrentUser() user: JwtPayload, @Query() query: SalesOrderListQueryDto) {
    return this.salesService.listSalesOrders(user.organizationId, query);
  }

  @RequirePermissions('sales.view')
  @Get('sales-orders/:id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.salesService.findSalesOrder(user.organizationId, id);
  }

  @RequirePermissions('sales.create')
  @Post('sales-orders')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSalesOrderDto) {
    return this.salesService.createSalesOrder(user.organizationId, user.sub, dto);
  }

  @RequirePermissions('sales.approve')
  @Post('sales-orders/:id/confirm')
  confirm(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.salesService.confirmSalesOrder(user.organizationId, user.sub, id);
  }

  @RequirePermissions('sales.approve')
  @Post('sales-orders/:id/cancel')
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.salesService.cancelSalesOrder(user.organizationId, id);
  }

  @RequirePermissions('sales.dispatch')
  @Post('sales-orders/:id/dispatches')
  dispatch(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateDispatchDto,
  ) {
    return this.salesService.createDispatch(user.organizationId, user.sub, id, dto);
  }

  @RequirePermissions('sales.return')
  @Post('sales-returns')
  createReturn(@CurrentUser() user: JwtPayload, @Body() dto: CreateSalesReturnDto) {
    return this.salesService.createSalesReturn(user.organizationId, user.sub, dto);
  }
}
