import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [TerminusModule, BillingModule],
  controllers: [HealthController],
})
export class HealthModule {}
