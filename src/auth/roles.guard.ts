import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership, MembershipRole } from '../memberships/membership.entity';
import { tenantStorage } from '../tenancy/tenant-context';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(Membership)
    private membershipRepo: Repository<Membership>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<MembershipRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    const tenantContext = tenantStorage.getStore();
    if (!tenantContext?.tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }

    const membership = await this.membershipRepo.findOne({
      where: {
        userId: user.id,
        tenantId: tenantContext.tenantId,
      },
    });

    if (!membership) {
      throw new ForbiddenException('User is not a member of this tenant');
    }

    const hasRole = requiredRoles.includes(membership.role);
    if (!hasRole) {
      throw new ForbiddenException('User does not have the required role');
    }

    return true;
  }
}
