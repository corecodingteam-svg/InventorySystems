import { Body, Controller, Get, Param, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { IdempotencyInterceptor } from '../common/idempotency.interceptor';
import { PosService } from './pos.service';
import { CloseSessionDto, CreatePosSaleDto, CreateRegisterDto, OpenSessionDto } from './dto/pos.dto';

@ApiTags('pos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pos')
export class PosController {
  constructor(private posService: PosService) {}

  @RequirePermissions('pos.manage')
  @Get('registers')
  listRegisters(@CurrentUser() user: JwtPayload) {
    return this.posService.listRegisters(user.organizationId);
  }

  @RequirePermissions('pos.manage')
  @Post('registers')
  createRegister(@CurrentUser() user: JwtPayload, @Body() dto: CreateRegisterDto) {
    return this.posService.createRegister(user.organizationId, dto);
  }

  @RequirePermissions('pos.operate')
  @Post('sessions/open')
  openSession(@CurrentUser() user: JwtPayload, @Body() dto: OpenSessionDto) {
    return this.posService.openSession(user.organizationId, user.sub, dto);
  }

  @RequirePermissions('pos.operate')
  @Get('sessions/:id')
  findSession(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.posService.findSession(user.organizationId, id);
  }

  @RequirePermissions('pos.operate')
  @Post('sessions/:id/close')
  closeSession(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: CloseSessionDto) {
    return this.posService.closeSession(user.organizationId, user.sub, id, dto);
  }

  @RequirePermissions('pos.operate')
  @Get('sessions/:id/sales')
  listSales(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.posService.listSales(user.organizationId, id);
  }

  @RequirePermissions('pos.operate')
  @ApiHeader({ name: 'Idempotency-Key', required: false, description: 'Safe to retry with the same key if the connection drops mid-sale' })
  @UseInterceptors(IdempotencyInterceptor)
  @Post('sessions/:id/sales')
  createSale(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreatePosSaleDto,
  ) {
    return this.posService.createSale(user.organizationId, user.sub, id, dto);
  }

  @RequirePermissions('pos.operate')
  @Get('sales/:id')
  findSale(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.posService.findSale(user.organizationId, id);
  }

  @RequirePermissions('pos.manage')
  @Post('sales/:id/void')
  voidSale(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.posService.voidSale(user.organizationId, user.sub, id);
  }
}
