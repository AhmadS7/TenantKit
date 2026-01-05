import { TenantMiddleware } from '../tenancy/tenant.middleware';
import { Tenant } from '../tenancy/tenant.entity';
import { DataSource, Repository } from 'typeorm';

describe('TenantMiddleware', () => {
  let middleware: TenantMiddleware;
  let mockDataSource: jest.Mocked<DataSource>;
  let mockTenantRepository: jest.Mocked<Repository<Tenant>>;

  beforeEach(() => {
    mockTenantRepository = {
      findOne: jest.fn(),
    } as any;

    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockTenantRepository),
      query: jest.fn(),
    } as any;

    middleware = new TenantMiddleware(mockDataSource);
  });

  describe('extractSubdomain', () => {
    it('should extract subdomain from localhost development format', () => {
      expect(middleware['extractSubdomain']('test.localhost:3000')).toBe('test');
      expect(middleware['extractSubdomain']('tenant.localhost')).toBe('tenant');
    });

    it('should extract subdomain from production format', () => {
      expect(middleware['extractSubdomain']('tenant.example.com')).toBe('tenant');
      expect(middleware['extractSubdomain']('sub.domain.com')).toBe('sub');
    });

    it('should return null for invalid hosts', () => {
      expect(middleware['extractSubdomain']('localhost')).toBeNull();
      expect(middleware['extractSubdomain']('example.com')).toBeNull();
      expect(middleware['extractSubdomain']('')).toBeNull();
      expect(middleware['extractSubdomain'](undefined as any)).toBeNull();
    });
  });

  describe('middleware functionality', () => {
    it('should call next() when tenant is found and set database session', async () => {
      const mockTenant: Tenant = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Tenant',
        subdomain: 'test',
        region: 'us-east' as any,
        plan: 'free' as any,
        createdAt: new Date(),
      };

      mockTenantRepository.findOne.mockResolvedValue(mockTenant);

      const mockReq = {
        headers: { host: 'test.localhost:3000' },
      };
      const mockRes = {};
      const mockNext = jest.fn();

      await middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockTenantRepository.findOne).toHaveBeenCalledWith({
        where: { subdomain: 'test' },
      });
      expect(mockDataSource.query).toHaveBeenCalledWith(
        `SET LOCAL app.current_tenant = '${mockTenant.id}'`
      );
      expect((mockReq as any).tenant).toBe(mockTenant);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should throw NotFoundException when tenant not found', async () => {
      mockTenantRepository.findOne.mockResolvedValue(null);

      const mockReq = {
        headers: { host: 'nonexistent.localhost:3000' },
      };
      const mockRes = {};
      const mockNext = jest.fn();

      await middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toContain('Tenant not found');
      expect(mockNext.mock.calls[0][0].status).toBe(404);
    });

    it('should throw NotFoundException when no subdomain provided', async () => {
      const mockReq = {
        headers: { host: 'localhost:3000' },
      };
      const mockRes = {};
      const mockNext = jest.fn();

      await middleware.use(mockReq as any, mockRes as any, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(mockNext.mock.calls[0][0].message).toContain('No subdomain provided');
      expect(mockNext.mock.calls[0][0].status).toBe(404);
    });
  });
});