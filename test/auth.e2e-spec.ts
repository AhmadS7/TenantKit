import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('REDIS_CLIENT')
      .useValue({
        ping: async () => 'PONG',
        quit: async () => {},
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
    await dataSource.query('TRUNCATE TABLE refresh_tokens, memberships, users, tenants CASCADE;');
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

      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('owner@tenantkit.app');
      expect(res.body.tenant).toBeDefined();
      expect(res.body.tenant.slug).toBe('acme');
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

      expect(loginRes.body.accessToken).toBeDefined();
      expect(loginRes.body.refreshToken).toBeDefined();

      const firstRefreshToken = loginRes.body.refreshToken;

      // 2. Refresh (rotates token)
      const refreshRes1 = await request(app.getHttpServer())
        .post('/v1/auth/refresh')
        .send({ refreshToken: firstRefreshToken })
        .expect(200);

      expect(refreshRes1.body.accessToken).toBeDefined();
      expect(refreshRes1.body.refreshToken).toBeDefined();
      expect(refreshRes1.body.refreshToken).not.toBe(firstRefreshToken);

      const secondRefreshToken = refreshRes1.body.refreshToken;

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

      const refreshToken = loginRes.body.refreshToken;

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

    it('should generate a reset token and successfully update password', async () => {
      // 1. Request password reset
      const reqRes = await request(app.getHttpServer())
        .post('/v1/auth/request-password-reset')
        .send({ email: 'recover@tenantkit.app' })
        .expect(200);

      expect(reqRes.body.resetToken).toBeDefined();
      const resetToken = reqRes.body.resetToken;

      // 2. Perform reset password
      await request(app.getHttpServer())
        .post('/v1/auth/reset-password')
        .send({
          token: resetToken,
          password: 'newsecurepassword',
        })
        .expect(200);

      // 3. Verify old password no longer logs in
      await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'recover@tenantkit.app',
          password: 'oldpassword',
        })
        .expect(401);

      // 4. Verify new password successfully logs in
      const newLoginRes = await request(app.getHttpServer())
        .post('/v1/auth/login')
        .send({
          email: 'recover@tenantkit.app',
          password: 'newsecurepassword',
        })
        .expect(200);

      expect(newLoginRes.body.accessToken).toBeDefined();
    });
  });
});
