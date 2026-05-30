import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheckService, TypeOrmHealthIndicator, HealthCheck } from '@nestjs/terminus';
import { Public } from '../common/public.decorator';
import Redis from 'ioredis';
import { BillingService } from '../billing/billing.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    @Inject('REDIS_CLIENT') private redis: Redis,
    private billingService: BillingService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.checkRedis(),
      () => this.checkStripe(),
    ]);
  }

  @Get('db')
  @HealthCheck()
  checkDb() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }

  @Get('redis')
  @HealthCheck()
  checkRedisEndpoint() {
    return this.health.check([
      () => this.checkRedis(),
    ]);
  }

  @Get('stripe')
  @HealthCheck()
  checkStripeEndpoint() {
    return this.health.check([
      () => this.checkStripe(),
    ]);
  }

  private async checkRedis() {
    try {
      await this.redis.ping();
      return { redis: { status: 'up' } };
    } catch (err: any) {
      throw new Error(`Redis ping failed: ${err.message}`);
    }
  }

  private async checkStripe() {
    try {
      const isHealthy = await this.billingService.checkStripeHealth();
      if (isHealthy) {
        return { stripe: { status: 'up' } };
      }
      throw new Error('Stripe is not healthy');
    } catch (err: any) {
      throw new Error(`Stripe check failed: ${err.message}`);
    }
  }
}
