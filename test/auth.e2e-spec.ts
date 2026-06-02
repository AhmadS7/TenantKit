import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

interface AuthResponseBody {
  user?: { email?: string };
  tenant?: { slug?: string };
  accessToken?: string;
  refreshToken?: string;
  resetToken?: string;
}

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('REDIS_CLIENT')
      .useValue({
        ping: () => Promise.resolve('PONG'),
        quit: () => Promise.resolve(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    await app.init();

    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    // Clear test tables before each test case
    await dataSource.query(
      'TRUNCATE TABLE password_reset_tokens, refresh_tokens, memberships, users, tenants CASCADE;',
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('/v1/auth/register (POST)', () => {
    it('should successfully register user, tenant, and owner membership', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'owner@tenantkit.app',
          password: 'securepassword',
          tenantName: 'Acme Corp',
          tenantSlug: 'acme',
        })
        .expect(201);

      const body = res.body as AuthResponseBody;
      expect(body.user).toBeDefined();
      expect(body.user?.email).toBe('owner@tenantkit.app');
      expect(body.tenant).toBeDefined();
      expect(body.tenant?.slug).toBe('acme');
    });

    it('should block registration with duplicate email', async () => {
      // First registration
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'dup@tenantkit.app',
          password: 'securepassword',
          tenantName: 'Acme 1',
          tenantSlug: 'acme1',
        })
        .expect(201);

      // Second registration with duplicate email
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'dup@tenantkit.app',
          password: 'differentpassword',
          tenantName: 'Acme 2',
          tenantSlug: 'acme2',
        })
        .expect(409);
    });

    it('should block registration with duplicate tenant slug', async () => {
      // First registration
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'first@tenantkit.app',
          password: 'securepassword',
          tenantName: 'Acme Corp',
          tenantSlug: 'acme-dup',
        })
        .expect(201);

      // Second registration with same tenant slug
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'second@tenantkit.app',
          password: 'securepassword',
          tenantName: 'Acme Copy',
          tenantSlug: 'acme-dup',
        })
        .expect(409);
    });
  });

  describe('/v1/auth/login & /v1/auth/refresh & /v1/auth/logout (POST)', () => {
    beforeEach(async () => {
      // Seed user and tenant
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'user@tenantkit.app',
          password: 'loginpassword',
          tenantName: 'Workspace A',
          tenantSlug: 'work-a',
        })
        .expect(201);
    });

    it('should authenticate user and rotate refresh tokens correctly', async () => {
      // 1. Login
      const loginRes = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'user@tenantkit.app',
          password: 'loginpassword',
        })
        .expect(200);

      const loginBody = loginRes.body as AuthResponseBody;
      expect(loginBody.accessToken).toBeDefined();
      expect(loginBody.refreshToken).toBeDefined();

      const firstRefreshToken = loginBody.refreshToken;

      // 2. Refresh (rotates token)
      const refreshRes1 = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken: firstRefreshToken })
        .expect(200);

      const refreshBody1 = refreshRes1.body as AuthResponseBody;
      expect(refreshBody1.accessToken).toBeDefined();
      expect(refreshBody1.refreshToken).toBeDefined();
      expect(refreshBody1.refreshToken).not.toBe(firstRefreshToken);

      const secondRefreshToken = refreshBody1.refreshToken;

      // 3. Reusing the first refresh token should fail (Reuse Detection)
      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken: firstRefreshToken })
        .expect(401);

      // 4. Using the second refresh token now should ALSO fail because reuse detection revoked all sessions
      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken: secondRefreshToken })
        .expect(401);
    });

    it('should allow logout to revoke session', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'user@tenantkit.app',
          password: 'loginpassword',
        })
        .expect(200);

      const refreshToken = (loginRes.body as AuthResponseBody).refreshToken;

      // Logout
      await request(app.getHttpServer())
        .post('/v1/auth/logout')
        .send({ refreshToken })
        .expect(200);

      // Refreshing with revoked token should fail
      await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('Password Recovery flow', () => {
    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/v1/auth/register')
        .send({
          email: 'recover@tenantkit.app',
          password: 'oldpassword',
          tenantName: 'Recovery Workspace',
          tenantSlug: 'recovery',
        })
        .expect(201);
    });

    it('should issue a single-use DB-backed reset token and update the password', async () => {
      // 1. Request password reset. Outside production the raw token is echoed
      //    back so the e2e flow can exercise the reset without reading email.
      const reqRes = await request(app.getHttpServer())
        .post('/v1/auth/request-password-reset')
        .send({ email: 'recover@tenantkit.app' })
        .expect(200);

      const reqBody = reqRes.body as AuthResponseBody;
      expect(reqBody.resetToken).toBeDefined();
      const resetToken = reqBody.resetToken;

      // The token is persisted (hashed) — exactly one outstanding row.
      const rows = await dataSource.query<Array<{ used_at: Date | null }>>(
        'SELECT used_at FROM password_reset_tokens;',
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].used_at).toBeNull();

      // 2. Perform reset password
      await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({
          token: resetToken,
          password: 'newsecurepassword',
        })
        .expect(200);

      // 3. Reusing the same token must fail (single use)
      await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({
          token: resetToken,
          password: 'anothernewpassword',
        })
        .expect(401);

      // 4. Verify old password no longer logs in
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'recover@tenantkit.app',
          password: 'oldpassword',
        })
        .expect(401);

      // 5. Verify new password successfully logs in
      const newLoginRes = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'recover@tenantkit.app',
          password: 'newsecurepassword',
        })
        .expect(200);

      expect((newLoginRes.body as AuthResponseBody).accessToken).toBeDefined();
    });

    it('should not reveal whether an email is registered', async () => {
      const res = await request(app.getHttpServer())
        .post('/v1/auth/request-password-reset')
        .send({ email: 'nobody@tenantkit.app' })
        .expect(200);

      // Unknown email: same shape, no token, and no row persisted.
      const body = res.body as AuthResponseBody & { success?: boolean };
      expect(body.success).toBe(true);
      expect(body.resetToken).toBeUndefined();

      const rows = await dataSource.query<unknown[]>(
        'SELECT id FROM password_reset_tokens;',
      );
      expect(rows).toHaveLength(0);
    });
  });
});
