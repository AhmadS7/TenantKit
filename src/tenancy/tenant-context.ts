import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  userId?: string;     // Set after auth
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();
