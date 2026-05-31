import { AsyncLocalStorage } from 'async_hooks';
import type { EntityManager } from 'typeorm';

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  userId?: string;     // Set after auth
  manager?: EntityManager; // RLS-scoped EntityManager for the active request transaction
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Returns the RLS-scoped EntityManager bound to the current request (set by
 * RlsInterceptor inside a `SET LOCAL ROLE` + `set_config('app.current_tenant')`
 * transaction). Falls back to the provided default manager when no tenant
 * transaction is active (e.g. RLS disabled, or pre-tenant auth/resolution paths).
 */
export function getTenantManager(fallback: EntityManager): EntityManager {
  return tenantStorage.getStore()?.manager ?? fallback;
}
