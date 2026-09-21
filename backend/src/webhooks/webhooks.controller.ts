import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString, IsUrl, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { WebhooksService } from './webhooks.service';

class CreateWebhookDto {
  @IsUrl({ require_tld: false })
  url: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  eventTypes: string[];
}

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private webhooksService: WebhooksService) {}

  @RequirePermissions('webhook.manage')
  @Get('subscriptions')
  list(@CurrentUser() user: JwtPayload) {
    return this.webhooksService.listSubscriptions(user.organizationId);
  }

  @RequirePermissions('webhook.manage')
  @Post('subscriptions')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateWebhookDto) {
    return this.webhooksService.createSubscription(user.organizationId, dto);
  }

  @RequirePermissions('webhook.manage')
  @Delete('subscriptions/:id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.webhooksService.removeSubscription(user.organizationId, id);
  }

  @RequirePermissions('webhook.manage')
  @Get('subscriptions/:id/deliveries')
  deliveries(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.webhooksService.listDeliveries(user.organizationId, id);
  }
}
