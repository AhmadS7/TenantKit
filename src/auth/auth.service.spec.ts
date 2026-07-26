import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { ConflictException } from '@nestjs/common';

jest.mock('bcryptjs', () => ({
  compare: jest
    .fn()
    .mockImplementation((pass) => Promise.resolve(pass === 'password123')),
  hash: jest.fn().mockImplementation(() => Promise.resolve('hashedpassword')),
}));

import { AuthService } from './auth.service';
import { User } from '../users/user.entity';
import { Tenant } from '../tenancy/tenant.entity';
import { Membership } from '../memberships/membership.entity';
import { RefreshToken } from './refresh-token.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { EmailQueueService } from '../queue/email-queue.service';
import { UserFactory } from '../../test/utils/factories';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: any;
  let tenantRepo: any;
  let membershipRepo: any;
  let refreshTokenRepo: any;
  let passwordResetTokenRepo: any;
  let jwtService: any;
  let emailQueue: any;

  const mockUser = UserFactory.create({
    id: 'user-uuid-1',
    email: 'test@example.com',
    passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
  });

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };
    tenantRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };
    membershipRepo = {
      save: jest.fn(),
      create: jest.fn(),
    };
    refreshTokenRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    passwordResetTokenRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('mocked-access-token'),
    };
    emailQueue = {
      enqueuePasswordReset: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Tenant), useValue: tenantRepo },
        { provide: getRepositoryToken(Membership), useValue: membershipRepo },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: refreshTokenRepo,
        },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: passwordResetTokenRepo,
        },
        { provide: JwtService, useValue: jwtService },
        { provide: EmailQueueService, useValue: emailQueue },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3000') },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn().mockImplementation((cb) =>
              cb({
                create: jest.fn((EntityClass, dto) => ({
                  ...dto,
                  id: 'tx-id-123',
                })),
                save: jest.fn((EntityClass, entity) => Promise.resolve(entity)),
                update: jest.fn().mockResolvedValue({ affected: 1 }),
              }),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('returns user without passwordHash if credentials are valid', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );
      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('returns null if user is not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const result = await service.validateUser(
        'unknown@example.com',
        'password123',
      );
      expect(result).toBeNull();
    });

    it('returns null if password does not match', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser(
        'test@example.com',
        'wrongpassword',
      );
      expect(result).toBeNull();
    });
  });

  describe('register', () => {
    it('throws ConflictException if email is already registered', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123',
          tenantName: 'My Org',
          tenantSlug: 'my-org',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException if tenant slug already exists', async () => {
      userRepo.findOne.mockResolvedValue(null);
      tenantRepo.findOne.mockResolvedValue({ id: 't1', slug: 'my-org' });

      await expect(
        service.register({
          email: 'new@example.com',
          password: 'password123',
          tenantName: 'My Org',
          tenantSlug: 'my-org',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates user, tenant, and membership atomically', async () => {
      userRepo.findOne.mockResolvedValue(null);
      tenantRepo.findOne.mockResolvedValue(null);

      const result = await service.register({
        email: 'new@example.com',
        password: 'password123',
        tenantName: 'New Org',
        tenantSlug: 'new-org',
      });

      expect(result).toBeDefined();
      expect(result.user.email).toBe('new@example.com');
      expect(result.tenant.slug).toBe('new-org');
    });
  });

  describe('login', () => {
    it('generates access and refresh tokens for valid auth user', async () => {
      refreshTokenRepo.create.mockReturnValue({ id: 'rt-1' });
      refreshTokenRepo.save.mockResolvedValue({ id: 'rt-1' });

      const result = await service.login({
        id: 'user-uuid-1',
        email: 'test@example.com',
      });

      expect(result.accessToken).toBe('mocked-access-token');
      expect(result.refreshToken).toBeDefined();
      expect(refreshTokenRepo.save).toHaveBeenCalled();
    });
  });
});
