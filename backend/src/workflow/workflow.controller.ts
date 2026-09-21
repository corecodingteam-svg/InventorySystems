import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtPayload } from '../auth/jwt.strategy';
import { WorkflowService } from './workflow.service';

class CreatePurchaseApprovalRuleDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsNumber()
  @Min(0)
  minAmount: number;

  @IsOptional()
  @IsString()
  requiredPermission?: string;
}

@ApiTags('workflow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('workflow/purchase-approval-rules')
export class WorkflowController {
  constructor(private workflowService: WorkflowService) {}

  @RequirePermissions('workflow.manage')
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.workflowService.listPurchaseApprovalRules(user.organizationId);
  }

  @RequirePermissions('workflow.manage')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePurchaseApprovalRuleDto) {
    return this.workflowService.createPurchaseApprovalRule(user.organizationId, {
      name: dto.name,
      minAmount: dto.minAmount,
      requiredPermission: dto.requiredPermission ?? 'purchase.approve',
    });
  }

  @RequirePermissions('workflow.manage')
  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.workflowService.removePurchaseApprovalRule(user.organizationId, id);
  }
}
