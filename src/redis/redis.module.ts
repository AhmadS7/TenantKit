import { Module, Global, Logger, OnModuleDestroy, Inject } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import Redis from 'ioredis';

@Global()
@Module({
  imports: [
    CacheModule.register({
      ttl: 60 * 1000, // 60 seconds default TTL
      max: 100,      // maximum 100 items in memory
    }),
  ],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        const logger = new Logger('RedisClient');
        const host = process.env.REDIS_HOST || 'localhost';
        const port = parseInt(process.env.REDIS_PORT || '6379', 10);
        
        // Setup lazyConnect and timeout settings to allow local tests to run without active Redis instance
        const client = new Redis({
          host,
          port,
          lazyConnect: true,
          maxRetriesPerRequest: null,
          connectTimeout: 2000,
        });

        client.on('error', (err) => {
          logger.warn(`Redis connection failed (caching will run in fallback mode): ${err.message}`);
        });

        return client;
      },
    },
  ],
  exports: [CacheModule, 'REDIS_CLIENT'],
})
export class RedisModule implements OnModuleDestroy {
  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
  ) {}

  async onModuleDestroy() {
    try {
      await this.redis.quit();
    } catch (err: any) {
      // Ignore errors during quit
    }
  }
}
