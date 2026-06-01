import {
  Controller,
  Post,
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

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckoutSession(
    @Body('plan') plan: string,
    @Request() req: ExpressRequest,
  ) {
    const store = tenantStorage.getStore();
    const tenantId = store?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Tenant context required');
    }

    const host = req.headers.host || 'localhost';
    return this.billingService.createCheckoutSession(tenantId, plan, host);
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
