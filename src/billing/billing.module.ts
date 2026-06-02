import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '../tenancy/tenant.entity';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { FeatureGuard } from './feature.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  controllers: [BillingController],
  providers: [BillingService, FeatureGuard],
  exports: [BillingService],
})
export class BillingModule {}
