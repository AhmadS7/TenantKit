import { Repository, FindManyOptions, FindOneOptions, ObjectLiteral } from 'typeorm';
import { tenantStorage } from '../tenancy/tenant-context';
import { ForbiddenException } from '@nestjs/common';

export class TenantAwareRepository<T extends ObjectLiteral> extends Repository<T> {
  private getTenantFilter(): Record<string, any> {
    const ctx = tenantStorage.getStore();
    if (!ctx?.tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    return { tenantId: ctx.tenantId };
  }

  async find(options?: FindManyOptions<T>): Promise<T[]> {
    // Skip tenant filter if entity doesn't have tenantId (e.g., users table)
    if (!this.metadata.columns.some(c => c.propertyName === 'tenantId')) {
      return super.find(options);
    }
    return super.find({
      ...options,
      where: this.mergeWhere(options?.where, this.getTenantFilter()),
    });
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    if (!this.metadata.columns.some(c => c.propertyName === 'tenantId')) {
      return super.findOne(options);
    }
    return super.findOne({
      ...options,
      where: this.mergeWhere(options.where, this.getTenantFilter()),
    });
  }

  async findOneOrFail(options: FindOneOptions<T>): Promise<T> {
    const result = await this.findOne(options);
    if (!result) throw new ForbiddenException('Resource not found in tenant');
    return result;
  }

  private mergeWhere(original: any, tenantFilter: any): any {
    if (!original) return tenantFilter;
    if (typeof original === 'string') return original;
    if (Array.isArray(original)) {
      return original.map(item => ({ ...item, ...tenantFilter }));
    }
    return { ...original, ...tenantFilter };
  }
}
