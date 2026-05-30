import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let jwtService: JwtService;

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
    jwtService = app.get(JwtService);
  });

  beforeEach(async () => {
    // Clear and seed test tenant database state
    await dataSource.query('TRUNCATE TABLE memberships, users, tenants, refresh_tokens CASCADE;');
    await dataSource.query(`
      INSERT INTO tenants (id, slug, name, "customDomain", "planTier", "subscriptionStatus")
      VALUES ('123e4567-e89b-12d3-a456-426614174000', 'test-tenant', 'Test Tenant', 'client.com', 'free', 'active');
    `);
    await dataSource.query(`
      INSERT INTO users (id, email, "passwordHash", "emailVerified")
      VALUES ('223e4567-e89b-12d3-a456-426614174000', 'user@test.com', 'hashedpassword', true);
    `);
    await dataSource.query(`
      INSERT INTO memberships (id, user_id, tenant_id, role, status)
      VALUES ('323e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174000', '123e4567-e89b-12d3-a456-426614174000', 'owner', 'active');
    `);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('/v1/dashboard/summary (GET) - Success with valid subdomain and auth', () => {
    const token = jwtService.sign({ sub: '223e4567-e89b-12d3-a456-426614174000', email: 'user@test.com' });
    return request(app.getHttpServer())
      .get('/v1/dashboard/summary')
      .set('Host', 'test-tenant.localhost')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .then((res) => {
        expect(res.body.tenant.name).toBe('Test Tenant');
        expect(res.body.memberCount).toBe(1);
        expect(res.body.members[0].email).toBe('user@test.com');
      });
  });

  it('/v1/dashboard/summary (GET) - Success with valid custom domain and auth', () => {
    const token = jwtService.sign({ sub: '223e4567-e89b-12d3-a456-426614174000', email: 'user@test.com' });
    return request(app.getHttpServer())
      .get('/v1/dashboard/summary')
      .set('Host', 'client.com')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .then((res) => {
        expect(res.body.tenant.name).toBe('Test Tenant');
      });
  });

  it('/v1/dashboard/summary (GET) - Failure 404 with missing tenant context', () => {
    const token = jwtService.sign({ sub: '223e4567-e89b-12d3-a456-426614174000', email: 'user@test.com' });
    return request(app.getHttpServer())
      .get('/v1/dashboard/summary')
      .set('Host', 'localhost')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('/v1/dashboard/summary (GET) - Failure 401 with missing authorization', () => {
    return request(app.getHttpServer())
      .get('/v1/dashboard/summary')
      .set('Host', 'test-tenant.localhost')
      .expect(401);
  });

  describe('Health Check endpoints', () => {
    it('/v1/health (GET) - Success overall app health check', () => {
      return request(app.getHttpServer())
        .get('/v1/health')
        .expect(200)
        .then((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.info.database.status).toBe('up');
          expect(res.body.info.redis.status).toBe('up');
          expect(res.body.info.stripe.status).toBe('up');
        });
    });

    it('/v1/health/db (GET) - Success DB health check', () => {
      return request(app.getHttpServer())
        .get('/v1/health/db')
        .expect(200)
        .then((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.info.database.status).toBe('up');
        });
    });

    it('/v1/health/redis (GET) - Success Redis health check', () => {
      return request(app.getHttpServer())
        .get('/v1/health/redis')
        .expect(200)
        .then((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.info.redis.status).toBe('up');
        });
    });

    it('/v1/health/stripe (GET) - Success Stripe health check', () => {
      return request(app.getHttpServer())
        .get('/v1/health/stripe')
        .expect(200)
        .then((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.info.stripe.status).toBe('up');
        });
    });
  });
});
