import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { DataSource, Repository } from 'typeorm';
import { Tenant } from './tenant.entity';

export interface TenantRequest extends Request {
  tenant: Tenant;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private tenantRepository: Repository<Tenant>;

  constructor(private dataSource: DataSource) {
    this.tenantRepository = this.dataSource.getRepository(Tenant);
  }

  async use(req: TenantRequest, res: Response, next: NextFunction) {
    try {
      const subdomain = this.extractSubdomain(req.headers.host || '');

      if (!subdomain) {
        throw new NotFoundException('No subdomain provided');
      }

      const tenant = await this.tenantRepository.findOne({
        where: { subdomain },
      });

      if (!tenant) {
        throw new NotFoundException(`Tenant not found for subdomain: ${subdomain}`);
      }

      // Set the tenant context in the database session
      await this.dataSource.query(`SET LOCAL app.current_tenant = '${tenant.id}'`);

      // Attach tenant to request
      req.tenant = tenant;

      next();
    } catch (error) {
      next(error);
    }
  }

  private extractSubdomain(host: string): string | null {
    if (!host || host.trim() === '') return null;

    // Remove port if present
    const hostWithoutPort = host.split(':')[0];

    // Handle localhost development cases
    if (hostWithoutPort === 'localhost' || hostWithoutPort.endsWith('.localhost')) {
      // For localhost, expect format: subdomain.localhost or subdomain.localhost:port
      const parts = hostWithoutPort.split('.');
      if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
        return parts[0];
      }
    }

    // For production domains, assume format: subdomain.domain.com
    const parts = hostWithoutPort.split('.');
    if (parts.length >= 3) {
      // Return the first part as subdomain (e.g., 'tenant' from 'tenant.example.com')
      return parts[0];
    }

    // If we can't determine a subdomain, return null
    return null;
  }
}