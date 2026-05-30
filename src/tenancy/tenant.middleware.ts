import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request, Response, NextFunction } from 'express';
import { Tenant } from './tenant.entity';
import { tenantStorage } from './tenant-context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(Tenant)
    private tenantRepo: Repository<Tenant>,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      const host = req.headers.host?.toLowerCase().split(':')[0] || '';
      
      const tenant = await this.resolveTenant(host);
      if (!tenant) {
        throw new NotFoundException(`Tenant not found for host: ${host}`);
      }

      tenantStorage.run(
        { tenantId: tenant.id, tenantSlug: tenant.slug, tenantName: tenant.name },
        () => next()
      );
    } catch (error) {
      next(error);
    }
  }

  private async resolveTenant(host: string): Promise<Tenant | null> {
    // 1. Custom domain lookup
    const byDomain = await this.tenantRepo.findOne({ 
      where: { customDomain: host } 
    });
    if (byDomain) return byDomain;

    // 2. Subdomain extraction: slug.cortex.app or slug.localhost
    const parts = host.split('.');
    if (parts.length >= 3) {
      const slug = parts[0];
      return this.tenantRepo.findOne({ where: { slug } });
    }

    // 3. localhost dev: tenant.localhost
    if (parts.length === 2 && parts[1] === 'localhost') {
      return this.tenantRepo.findOne({ where: { slug: parts[0] } });
    }

    return null;
  }
}