import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';

describe('BillingController (e2e)', () => {
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
    await dataSource.query('TRUNCATE TABLE memberships, users, tenants, refresh_tokens CASCADE;');
    await dataSource.query(`
      INSERT INTO tenants (id, slug, name, "customDomain", "planTier", "subscriptionStatus")
      VALUES ('123e4567-e89b-12d3-a456-426614174000', 'billing-tenant', 'Billing Tenant', null, 'free', 'active');
    `);
    await dataSource.query(`
      INSERT INTO users (id, email, "passwordHash", "emailVerified")
      VALUES ('223e4567-e89b-12d3-a456-426614174000', 'billing@test.com', 'hashedpassword', true);
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

  it('/v1/billing/checkout (POST) - Success creating mock checkout session', () => {
    const token = jwtService.sign({ sub: '223e4567-e89b-12d3-a456-426614174000', email: 'billing@test.com' });
    return request(app.getHttpServer())
      .post('/v1/billing/checkout')
      .set('Host', 'billing-tenant.localhost')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan: 'pro' })
      .expect(201)
      .then((res) => {
        expect(res.body.url).toContain('checkout_success=true');
      });
  });

  it('/v1/billing/checkout (POST) - Failure 401 unauthenticated', () => {
    return request(app.getHttpServer())
      .post('/v1/billing/checkout')
      .set('Host', 'billing-tenant.localhost')
      .send({ plan: 'pro' })
      .expect(401);
  });

  it('/v1/billing/webhook (POST) - Success with mocked endpoint response', () => {
    // Unprotected central webhook endpoint
    return request(app.getHttpServer())
      .post('/v1/billing/webhook')
      .set('stripe-signature', 'mock-sig')
      .send({ id: 'evt_123', type: 'charge.succeeded' })
      .expect(201)
      .expect({ received: true });
  });
});
