import { Module, Global, Scope } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { REQUEST } from '@nestjs/core';
import { Tenant } from './tenant.entity';
import { TenantMiddleware } from './tenant.middleware';
import { TENANT_REQUEST_KEY } from './constants';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [
    TenantMiddleware,
    {
      provide: TENANT_REQUEST_KEY,
      useFactory: (req: any) => req.tenant,
      inject: [REQUEST],
      scope: Scope.REQUEST,
    },
  ],
  exports: [TypeOrmModule, TENANT_REQUEST_KEY, TenantMiddleware],
})
export class TenantModule {}