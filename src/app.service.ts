import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership } from './memberships/membership.entity';
import { Tenant } from './tenancy/tenant.entity';
import { tenantStorage } from './tenancy/tenant-context';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(Membership)
    private membershipRepo: Repository<Membership>,
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
  ) {}

  async getDashboardSummary() {
    const store = tenantStorage.getStore();
    if (!store?.tenantId) {
      throw new ForbiddenException('No tenant context found');
    }

    // Resolve tenant details
    const tenant = await this.tenantRepo.findOne({
      where: { id: store.tenantId },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    // Resolve all memberships for the current tenant
    // Note: Due to PostgreSQL RLS and/or application filtering, this only returns active tenant data.
    const memberships = await this.membershipRepo.find({
      where: { tenantId: store.tenantId },
      relations: ['user'],
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
