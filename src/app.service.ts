import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Membership } from './memberships/membership.entity';
import { Tenant } from './tenancy/tenant.entity';
import { tenantStorage, getTenantManager } from './tenancy/tenant-context';

@Injectable()
export class AppService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getDashboardSummary() {
    const store = tenantStorage.getStore();
    if (!store?.tenantId) {
      throw new ForbiddenException('No tenant context found');
    }

    // Run through the RLS-scoped manager so PostgreSQL Row-Level Security
    // enforces tenant isolation on top of the application-level filter.
    const manager = getTenantManager(this.dataSource.manager);
    const tenantRepo = manager.getRepository(Tenant);
    const membershipRepo = manager.getRepository(Membership);

    // Resolve tenant details
    const tenant = await tenantRepo.findOne({
      where: { id: store.tenantId },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    // Resolve all memberships for the current tenant.
    // RLS restricts these rows to tenant_id = current_tenant_id(); the explicit
    // where clause is defense-in-depth at the application layer.
    const memberships = await membershipRepo.find({
      where: { tenantId: store.tenantId },
      relations: { user: true },
    });

    const members = memberships.map((m) => ({
      membershipId: m.id,
      userId: m.userId,
      email: m.user.email,
      role: m.role,
      status: m.status,
      joinedAt: m.createdAt,
    }));

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        customDomain: tenant.customDomain,
        planTier: tenant.planTier,
        subscriptionStatus: tenant.subscriptionStatus,
      },
      memberCount: members.length,
      members,
    };
  }
}
