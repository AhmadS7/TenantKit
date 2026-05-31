import {
  CallHandler,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Observable, from, lastValueFrom } from 'rxjs';
import { tenantStorage } from '../../tenancy/tenant-context';

/**
 * Enforces PostgreSQL Row-Level Security for tenant-scoped requests.
 *
 * For every request that carries a resolved tenant context, the handler is run
 * inside a dedicated transaction where we:
 *   1. SET LOCAL ROLE to a non-superuser role (so RLS policies actually apply —
 *      the pooled connection authenticates as a superuser/owner which bypasses RLS),
 *   2. set_config('app.current_tenant'/'app.current_user', ..., is_local => true)
 *      so the policy predicates resolve to the active tenant/user.
 *
 * The transaction's EntityManager is published on the AsyncLocalStorage store so
 * tenant-scoped services run their queries through it (see getTenantManager).
 * SET LOCAL / is_local settings are scoped to the transaction and auto-reset on
 * COMMIT/ROLLBACK, so nothing leaks back into the shared connection pool.
 *
 * Pre-tenant paths (auth, tenant resolution, webhooks, health) have no tenant
 * context and are skipped — they keep running on the privileged pooled
 * connection, which is required to look up tenants/users before isolation applies.
 */
@Injectable()
export class RlsInterceptor implements NestInterceptor {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async intercept(_context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const store = tenantStorage.getStore();

    // Skip when there is no tenant context (auth/resolution/webhook/health
    // paths) or when RLS is not active for this environment. RLS requires the
    // migrated `tenantkit_app` role + policies, so it is disabled by default in
    // `development` (which boots the schema via TypeORM `synchronize`, not
    // migrations). Override either way with RLS_ENABLED=true|false.
    if (!store?.tenantId || !this.isRlsEnabled()) {
      return next.handle();
    }

    const role = this.resolveTenantRole();
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.query(`SELECT set_config('app.current_tenant', $1, true)`, [store.tenantId]);
      if (store.userId) {
        await queryRunner.query(`SELECT set_config('app.current_user', $1, true)`, [store.userId]);
      }
      // Identifier cannot be parameterized; resolveTenantRole validates the value.
      await queryRunner.query(`SET LOCAL ROLE "${role}"`);
      store.manager = queryRunner.manager;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      store.manager = undefined;
      throw err;
    }

    return from(
      (async () => {
        try {
          const result = await lastValueFrom(next.handle());
          await queryRunner.commitTransaction();
          return result;
        } catch (err) {
          await queryRunner.rollbackTransaction();
          throw err;
        } finally {
          store.manager = undefined;
          await queryRunner.release();
        }
      })(),
    );
  }

  private isRlsEnabled(): boolean {
    const flag = process.env.RLS_ENABLED;
    if (flag === 'true') return true;
    if (flag === 'false') return false;
    return process.env.NODE_ENV !== 'development';
  }

  private resolveTenantRole(): string {
    const role = process.env.DB_TENANT_ROLE || 'tenantkit_app';
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(role)) {
      throw new InternalServerErrorException('Invalid DB_TENANT_ROLE configuration');
    }
    return role;
  }
}
