import {
  Controller,
  Post,
  Get,
  Body,
  Request,
  Headers,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../common/public.decorator';
import { tenantStorage } from '../tenancy/tenant-context';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { FeatureGuard } from './feature.guard';
import { RequireFeature } from './require-feature.decorator';
import { Feature, featuresForPlan } from './features.config';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  private requireTenantId(): string {
    const tenantId = tenantStorage.getStore()?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context required');
    }
    return tenantId;
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @Body() dto: CreateCheckoutDto,
    @Request() req: ExpressRequest,
  ) {
    const tenantId = this.requireTenantId();
    const host = req.headers.host || 'localhost';
    return this.billingService.createCheckoutSession(tenantId, dto.plan, host);
  }

  /** Lists the features unlocked by the current tenant's plan. */
  @Get('features')
  @UseGuards(JwtAuthGuard)
  async listFeatures() {
    const tenantId = this.requireTenantId();
    const plan = await this.billingService.getTenantPlan(tenantId);
    return { plan, features: featuresForPlan(plan) };
  }

  /** Example plan-gated resource: only plans with Advanced Analytics may read it. */
  @Get('analytics')
  @UseGuards(JwtAuthGuard, FeatureGuard)
  @RequireFeature(Feature.AdvancedAnalytics)
  async analytics() {
    const tenantId = this.requireTenantId();
    return this.billingService.getAnalyticsSummary(tenantId);
  }

  @Post('webhook')
  @Public()
  async handleWebhook(
    @Request() req: ExpressRequest,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody ? req.rawBody.toString('utf-8') : '';
    await this.billingService.handleWebhook(rawBody, signature);
    return { received: true };
  }
}
