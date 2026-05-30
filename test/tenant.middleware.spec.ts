import { TenantMiddleware } from '../src/tenancy/tenant.middleware';
import { Tenant } from '../src/tenancy/tenant.entity';
import { Repository } from 'typeorm';
import { tenantStorage } from '../src/tenancy/tenant-context';
import { NotFoundException } from '@nestjs/common';

describe('TenantMiddleware', () => {
  let middleware: TenantMiddleware;
  let mockTenantRepository: jest.Mocked<Repository<Tenant>>;

  beforeEach(() => {
    mockTenantRepository = {
      findOne: jest.fn(),
    } as any;

    middleware = new TenantMiddleware(mockTenantRepository);
  });

  describe('resolveTenant & middleware functionality', () => {
    it('should resolve tenant via custom domain', async () => {
      const mockTenant: Tenant = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Custom Domain Tenant',
        slug: 'custom-tenant',
        customDomain: 'client.com',
        planTier: 'free',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTenantRepository.findOne.mockImplementation(async (options: any) => {
        if (options?.where?.customDomain === 'client.com') {
          return mockTenant;
        }
        return null;
      });

      const mockReq = {
        headers: { host: 'client.com' },
      };
      const mockRes = {};
      const mockNext = jest.fn();

      const runSpy = jest.spyOn(tenantStorage, 'run');

      await middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockTenantRepository.findOne).toHaveBeenCalledWith({
        where: { customDomain: 'client.com' },
      });
      expect(runSpy).toHaveBeenCalledWith(
        {
          tenantId: mockTenant.id,
          tenantSlug: mockTenant.slug,
          tenantName: mockTenant.name,
        },
        expect.any(Function),
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should resolve tenant via subdomain slug', async () => {
      const mockTenant: Tenant = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Subdomain Tenant',
        slug: 'my-tenant',
        customDomain: null,
        planTier: 'free',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTenantRepository.findOne.mockImplementation(async (options: any) => {
        if (options?.where?.slug === 'my-tenant') {
          return mockTenant;
        }
        return null;
      });

      const mockReq = {
        headers: { host: 'my-tenant.tenantkit.app' },
      };
      const mockRes = {};
      const mockNext = jest.fn();

      const runSpy = jest.spyOn(tenantStorage, 'run');

      await middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockTenantRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'my-tenant' },
      });
      expect(runSpy).toHaveBeenCalledWith(
        {
          tenantId: mockTenant.id,
          tenantSlug: mockTenant.slug,
          tenantName: mockTenant.name,
        },
        expect.any(Function),
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should resolve tenant via localhost dev subdomain', async () => {
      const mockTenant: Tenant = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Dev Tenant',
        slug: 'dev-tenant',
        customDomain: null,
        planTier: 'free',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTenantRepository.findOne.mockImplementation(async (options: any) => {
        if (options?.where?.slug === 'dev-tenant') {
          return mockTenant;
        }
        return null;
      });

      const mockReq = {
        headers: { host: 'dev-tenant.localhost:3000' },
      };
      const mockRes = {};
      const mockNext = jest.fn();

      await middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockTenantRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'dev-tenant' },
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw NotFoundException when tenant is not found', async () => {
      mockTenantRepository.findOne.mockResolvedValue(null);

      const mockReq = {
        headers: { host: 'unknown.localhost' },
      };
      const mockRes = {};
      const mockNext = jest.fn();

      await middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundException));
    });
  });
});