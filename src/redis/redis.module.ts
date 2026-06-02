import {
  Module,
  Global,
  Logger,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  imports: [
    CacheModule.register({
      ttl: 60 * 1000, // 60 seconds default TTL
      max: 100, // maximum 100 items in memory
    }),
  ],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('RedisClient');
        const host = config.get<string>('REDIS_HOST', 'localhost');
        const port = config.get<number>('REDIS_PORT', 6379);

        // Setup lazyConnect and timeout settings to allow local tests to run without active Redis instance
        const client = new Redis({
          host,
          port,
          lazyConnect: true,
          maxRetriesPerRequest: null,
          connectTimeout: 2000,
        });

        client.on('error', (err) => {
          logger.warn(
            `Redis connection failed (caching will run in fallback mode): ${err.message}`,
          );
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
    } catch {
      // Ignore errors during quit
    }
  }
}
