import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard, seconds } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantModule } from './tenancy/tenant.module';
import { TenantMiddleware } from './tenancy/tenant.middleware';
import { TenantGuard } from './tenancy/tenant.guard';
import { RlsInterceptor } from './common/interceptors/rls.interceptor';
import { User } from './users/user.entity';
import { Membership } from './memberships/membership.entity';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { RedisModule } from './redis/redis.module';
import { BillingModule } from './billing/billing.module';
import { MailModule } from './mail/mail.module';
import { QueueModule } from './queue/queue.module';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { allowUnknown: true, abortEarly: false },
    }),
    // Async factory so the connection is built from the *validated* config
    // (ConfigService) rather than reading raw process.env at module-eval time,
    // which would run before ConfigModule applies validation and Joi defaults.
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('DB_HOST'),
        port: config.getOrThrow<number>('DB_PORT'),
        username: config.getOrThrow<string>('DB_USERNAME'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        database: config.getOrThrow<string>('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: config.get<string>('NODE_ENV') === 'development',
        migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
        migrationsRun: config.get<string>('NODE_ENV') !== 'development',
        extra: {
          max: 20,
          idleTimeoutMillis: 30000,
        },
      }),
    }),
    // Rate limiting. Backed by Redis in non-test environments so limits are
    // shared across instances; skipped entirely under test to keep the e2e
    // suite deterministic and Redis-independent.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isTest = config.get<string>('NODE_ENV') === 'test';
        return {
          throttlers: [{ name: 'default', ttl: seconds(60), limit: 120 }],
          skipIf: () => isTest,
          storage: isTest
            ? undefined
            : new ThrottlerStorageRedisService(
                new Redis({
                  host: config.get<string>('REDIS_HOST', 'localhost'),
                  port: config.get<number>('REDIS_PORT', 6379),
                  maxRetriesPerRequest: null,
                  lazyConnect: true,
                }),
              ),
        };
      },
    }),
    TenantModule,
    AuthModule,
    HealthModule,
    RedisModule,
    QueueModule,
    MailModule,
    BillingModule,
    TypeOrmModule.forFeature([User, Membership]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Rate-limit first, before the tenant/RLS machinery does any work.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RlsInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        'auth/register',
        'auth/login',
        'auth/refresh',
        'auth/logout',
        'auth/request-password-reset',
        'auth/reset-password',
        'auth/change-password',
        'v1/auth/register',
        'v1/auth/login',
        'v1/auth/refresh',
        'v1/auth/logout',
        'v1/auth/request-password-reset',
        'v1/auth/reset-password',
        'v1/auth/change-password',
        'billing/webhook',
        'v1/billing/webhook',
        'health',
        'health/(.*)',
        'v1/health',
        'v1/health/(.*)',
      )
      .forRoutes('*');
  }
}
