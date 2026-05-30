import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBaseTables1735774100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create tenants table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        "customDomain" VARCHAR(255) UNIQUE,
        "planTier" VARCHAR(255) NOT NULL DEFAULT 'free',
        "stripeCustomerId" VARCHAR(255),
        "stripeSubscriptionId" VARCHAR(255),
        "subscriptionStatus" VARCHAR(255) NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    // 2. Create users table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        "passwordHash" VARCHAR(255) NOT NULL,
        "refreshTokenHash" VARCHAR(255),
        "emailVerified" BOOLEAN NOT NULL DEFAULT false,
        "lastLoginAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP
      );
    `);

    // 3. Create memberships table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'member',
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        "invitedBy" UUID,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT uq_memberships_user_tenant UNIQUE (user_id, tenant_id)
      );
    `);

    // 4. Create composite index on memberships for fast user-tenant lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_memberships_user_tenant ON memberships(user_id, tenant_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_memberships_user_tenant;`);
    await queryRunner.query(`DROP TABLE IF EXISTS memberships;`);
    await queryRunner.query(`DROP TABLE IF EXISTS users;`);
    await queryRunner.query(`DROP TABLE IF EXISTS tenants;`);
  }
}
