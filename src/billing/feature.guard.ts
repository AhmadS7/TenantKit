import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from '../tenancy/tenant.entity';
import { tenantStorage } from '../tenancy/tenant-context';
import { REQUIRE_FEATURE_KEY } from './require-feature.decorator';
import { Feature, planHasFeature } from './features.config';

/**
 * Gates routes annotated with `@RequireFeature(...)` by checking the active
 * tenant's plan tier against the entitlement matrix in features.config.
 *
 * Runs before the RLS interceptor's transaction is established, so it reads the
 * tenant through the privileged repository rather than the request-scoped
 * RLS manager.
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Feature | undefined>(
      REQUIRE_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) {
      return true;
    }

    const store = tenantStorage.getStore();
    if (!store?.tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }

    const tenant = await this.tenantRepo.findOne({
      where: { id: store.tenantId },
    });
    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    if (!planHasFeature(tenant.planTier, required)) {
      throw new ForbiddenException(
        `Your current plan (${tenant.planTier}) does not include the "${required}" feature. Please upgrade to access it.`,
      );
    }

    return true;
  }
}
