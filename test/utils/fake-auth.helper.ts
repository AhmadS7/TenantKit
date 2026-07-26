import { JwtService } from '@nestjs/jwt';

export class FakeAuthHelper {
  private static jwtService = new JwtService({
    secret: process.env.JWT_SECRET || 'test-secret-key-12345',
    signOptions: { expiresIn: '1h' },
  });

  static generateToken(payload: {
    sub: string;
    email: string;
    roles?: string[];
    tenantId?: string;
  }): string {
    return this.jwtService.sign({
      sub: payload.sub,
      email: payload.email,
      roles: payload.roles || ['USER'],
      tenantId: payload.tenantId || 'test-tenant-id',
    });
  }

  static getAuthHeader(payload: {
    sub: string;
    email: string;
    roles?: string[];
    tenantId?: string;
  }): { Authorization: string; 'x-tenant-id': string } {
    const token = this.generateToken(payload);
    return {
      Authorization: `Bearer ${token}`,
      'x-tenant-id': payload.tenantId || 'test-tenant-id',
    };
  }
}
