import { Controller, Get, Inject } from '@nestjs/common';
import { HealthCheckService, TypeOrmHealthIndicator, HealthCheck } from '@nestjs/terminus';
import Redis from 'ioredis';
import { BillingService } from '../billing/billing.service';

// terminus 11 no longer re-exports HealthIndicatorResult from the package root,
// so we mirror its shape: a keyed entry whose status is the literal up or down.
type IndicatorResult = Record<string, { status: 'up' | 'down' } & Record<string, unknown>>;

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    @Inject('REDIS_CLIENT')
    private redis: Redis,
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
    return this.health.check([() => this.db.pingCheck('database')]);
  }

  @Get('redis')
  @HealthCheck()
  checkRedisHealth() {
    return this.health.check([() => this.checkRedis()]);
  }

  @Get('stripe')
  @HealthCheck()
  checkStripeHealth() {
    return this.health.check([() => this.checkStripe()]);
  }

  private async checkRedis(): Promise<IndicatorResult> {
    let isHealthy = false;
    try {
      await this.redis.ping();
      isHealthy = true;
    } catch (err) {
      isHealthy = false;
    }
    const status: 'up' | 'down' = isHealthy ? 'up' : 'down';
    return { redis: { status } };
  }

  private async checkStripe(): Promise<IndicatorResult> {
    let isHealthy = false;
    try {
      isHealthy = await this.billingService.checkStripeHealth();
    } catch (err) {
      isHealthy = false;
    }
    const status: 'up' | 'down' = isHealthy ? 'up' : 'down';
    return { stripe: { status } };
  }
}
