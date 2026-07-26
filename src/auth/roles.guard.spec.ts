import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RolesGuard } from './roles.guard';
import { Membership, MembershipRole } from '../memberships/membership.entity';
import { tenantStorage } from '../tenancy/tenant-context';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;
  let membershipRepo: any;

  beforeEach(async () => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;

    membershipRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: Reflector, useValue: reflector },
        { provide: getRepositoryToken(Membership), useValue: membershipRepo },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
  });

  const createMockContext = (request: any): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as any;

  it('allows access if no required roles are defined', async () => {
    reflector.getAllAndOverride.mockReturnValue(null);
    const context = createMockContext({});

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('throws ForbiddenException if user is missing from request', async () => {
    reflector.getAllAndOverride.mockReturnValue([MembershipRole.ADMIN]);
    const context = createMockContext({ user: null });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws ForbiddenException if tenant context is missing', async () => {
    reflector.getAllAndOverride.mockReturnValue([MembershipRole.ADMIN]);
    const context = createMockContext({ user: { id: 'u1' } });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows access when user has valid tenant membership role', async () => {
    reflector.getAllAndOverride.mockReturnValue([
      MembershipRole.ADMIN,
      MembershipRole.OWNER,
    ]);
    membershipRepo.findOne.mockResolvedValue({ role: MembershipRole.OWNER });

    const context = createMockContext({ user: { id: 'u1' } });

    await tenantStorage.run(
      {
        tenantId: 'tenant-123',
        tenantSlug: 'test-tenant',
        tenantName: 'Test Tenant',
      },
      async () => {
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      },
    );
  });

  it('throws ForbiddenException when user membership lacks required role', async () => {
    reflector.getAllAndOverride.mockReturnValue([MembershipRole.ADMIN]);
    membershipRepo.findOne.mockResolvedValue({ role: MembershipRole.MEMBER });

    const context = createMockContext({ user: { id: 'u1' } });

    await tenantStorage.run(
      {
        tenantId: 'tenant-123',
        tenantSlug: 'test-tenant',
        tenantName: 'Test Tenant',
      },
      async () => {
        await expect(guard.canActivate(context)).rejects.toThrow(
          ForbiddenException,
        );
      },
    );
  });
});
