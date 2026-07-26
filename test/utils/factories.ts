import { User } from '../../src/users/user.entity';

export const DEFAULT_MOCK_PASSWORD_HASH =
  '$2a$10$abcdefghijklmnopqrstuvwxyz123456';

export class UserFactory {
  private static idCounter = 1;

  static create(overrides: Partial<User> = {}): User {
    const user = new User();
    user.id =
      overrides.id ??
      `11111111-2222-3333-4444-${String(UserFactory.idCounter++).padStart(12, '0')}`;
    user.email = overrides.email ?? `user${Date.now()}@example.com`;
    user.passwordHash = overrides.passwordHash ?? DEFAULT_MOCK_PASSWORD_HASH;
    user.refreshTokenHash = overrides.refreshTokenHash ?? null;
    user.emailVerified = overrides.emailVerified ?? true;
    user.lastLoginAt = overrides.lastLoginAt ?? new Date();
    user.createdAt = overrides.createdAt ?? new Date();
    user.updatedAt = overrides.updatedAt ?? new Date();
    user.deletedAt = overrides.deletedAt ?? null;
    return user;
  }

  static createMany(count: number, overrides: Partial<User> = {}): User[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

export class TenantFactory {
  static create(
    overrides: Partial<{ id: string; name: string; slug: string }> = {},
  ) {
    return {
      id: overrides.id ?? 'tenant-uuid-1234',
      name: overrides.name ?? 'Test Tenant Org',
      slug: overrides.slug ?? 'test-tenant',
      createdAt: new Date(),
    };
  }
}

export class AuthPayloadFactory {
  static create(
    overrides: Partial<{
      sub: string;
      email: string;
      roles: string[];
      tenantId?: string;
    }> = {},
  ) {
    return {
      sub: overrides.sub ?? '11111111-2222-3333-4444-000000000001',
      email: overrides.email ?? 'admin@tenantkit.com',
      roles: overrides.roles ?? ['ADMIN'],
      tenantId: overrides.tenantId ?? 'tenant-uuid-1234',
    };
  }
}
