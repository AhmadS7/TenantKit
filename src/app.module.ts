import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantModule } from './tenancy/tenant.module';
import { TenantMiddleware } from './tenancy/tenant.middleware';
import { TenantGuard } from './tenancy/tenant.guard';
import { User } from './users/user.entity';
import { Membership } from './memberships/membership.entity';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { RedisModule } from './redis/redis.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_DATABASE || 'cortex',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV === 'development',
      migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
      migrationsRun: process.env.NODE_ENV !== 'development',
      extra: {
        max: 20,
        idleTimeoutMillis: 30000,
      },
    }),
    TenantModule,
    AuthModule,
    HealthModule,
    RedisModule,
    BillingModule,
    TypeOrmModule.forFeature([User, Membership]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
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
        'v1/auth/register',
        'v1/auth/login',
        'v1/auth/refresh',
        'v1/auth/logout',
        'v1/auth/request-password-reset',
        'v1/auth/reset-password',
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
