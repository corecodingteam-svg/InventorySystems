import { Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { toCsv } from '../common/csv';
import { ReportsService } from './reports.service';
import { ReorderForecastQueryDto, ReportDateRangeDto, StockValuationQueryDto } from './dto/reports.dto';

function respond(res: Response, rows: Record<string, unknown>[] | unknown, filename: string, format?: 'csv') {
  if (format === 'csv' && Array.isArray(rows)) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(toCsv(rows));
    return;
  }
  res.json(rows);
}

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @RequirePermissions('inventory.view')
  @Get('dashboard')
  dashboard(@CurrentUser() user: JwtPayload) {
    return this.reportsService.dashboardSummary(user.organizationId);
  }

  @RequirePermissions('inventory.view')
  @Get('inventory/low-stock')
  async lowStock(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportDateRangeDto,
    @Res() res: Response,
  ) {
    const rows = await this.reportsService.lowStockReport(user.organizationId);
    respond(res, rows, 'low-stock.csv', query.format);
  }

  @RequirePermissions('inventory.view')
  @Post('inventory/low-stock/notify')
  notifyLowStock(@CurrentUser() user: JwtPayload) {
    return this.reportsService.notifyLowStock(user.organizationId);
  }

  @RequirePermissions('inventory.view')
  @Get('inventory/reorder-forecast')
  async reorderForecast(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReorderForecastQueryDto,
    @Res() res: Response,
  ) {
    const rows = await this.reportsService.reorderForecast(user.organizationId, query);
    respond(res, rows, 'reorder-forecast.csv', query.format);
  }

  @RequirePermissions('inventory.view')
  @Get('inventory/stock-valuation')
  async stockValuation(
    @CurrentUser() user: JwtPayload,
    @Query() query: StockValuationQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.reportsService.stockValuation(user.organizationId, query);
    if (query.format === 'csv') {
      respond(res, result.data, 'stock-valuation.csv', 'csv');
      return;
    }
    res.json(result);
  }

  @RequirePermissions('sales.view')
  @Get('sales/by-product')
  async salesByProduct(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportDateRangeDto,
    @Res() res: Response,
  ) {
    const rows = await this.reportsService.salesByProduct(user.organizationId, query.dateFrom, query.dateTo);
    respond(res, rows, 'sales-by-product.csv', query.format);
  }

  @RequirePermissions('sales.view')
  @Get('sales/by-customer')
  async salesByCustomer(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportDateRangeDto,
    @Res() res: Response,
  ) {
    const rows = await this.reportsService.salesByCustomer(user.organizationId, query.dateFrom, query.dateTo);
    respond(res, rows, 'sales-by-customer.csv', query.format);
  }

  @RequirePermissions('purchase.view')
  @Get('purchases/by-supplier')
  async purchasesBySupplier(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportDateRangeDto,
    @Res() res: Response,
  ) {
    const rows = await this.reportsService.purchasesBySupplier(user.organizationId, query.dateFrom, query.dateTo);
    respond(res, rows, 'purchases-by-supplier.csv', query.format);
  }

  @RequirePermissions('inventory.view')
  @Get('warehouse/activity')
  async warehouseActivity(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReportDateRangeDto,
    @Res() res: Response,
  ) {
    const rows = await this.reportsService.warehouseActivity(user.organizationId, query.dateFrom, query.dateTo);
    respond(res, rows, 'warehouse-activity.csv', query.format);
  }
}
