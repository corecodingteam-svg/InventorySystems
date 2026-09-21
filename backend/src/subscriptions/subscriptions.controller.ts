import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { SubscriptionsService } from './subscriptions.service';

class UpdateSubscriptionDto {
  @IsIn(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'])
  plan: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  seats?: number;
}

@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('subscription')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @RequirePermissions('subscription.manage')
  @Get()
  getCurrent(@CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.getCurrent(user.organizationId);
  }

  @RequirePermissions('subscription.manage')
  @Patch()
  update(@CurrentUser() user: JwtPayload, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptionsService.updatePlan(user.organizationId, dto.plan, dto.seats);
  }
}
