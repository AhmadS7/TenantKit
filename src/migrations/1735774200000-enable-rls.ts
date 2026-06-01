import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableRls1735774200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable RLS on tenants table
    await queryRunner.query(`ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;`);

    // Policy for tenants table: tenants can only see themselves
    await queryRunner.query(`
      CREATE POLICY tenants_isolation_policy ON tenants
          FOR ALL
          USING (id = current_setting('app.current_tenant')::uuid);
    `);

    // Enable RLS on users table (global table, but still needs protection)
    await queryRunner.query(`ALTER TABLE users ENABLE ROW LEVEL SECURITY;`);

    // Users table policy: allow access when tenant context is set
    await queryRunner.query(`
      CREATE POLICY users_access_policy ON users
          FOR ALL
          USING (current_setting('app.current_tenant')::uuid IS NOT NULL);
    `);

    // Enable RLS on memberships table
    await queryRunner.query(
      `ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;`,
    );

    // Policy for memberships table: only allow access to memberships of current tenant
    await queryRunner.query(`
      CREATE POLICY memberships_tenant_isolation_policy ON memberships
          FOR ALL
          USING (tenant_id = current_setting('app.current_tenant')::uuid);
    `);

    // Create application role
    await queryRunner.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tenantkit_app') THEN
              CREATE ROLE tenantkit_app LOGIN PASSWORD 'change_this_password';
          END IF;

          ALTER ROLE tenantkit_app NOSUPERUSER;
          ALTER ROLE tenantkit_app NOBYPASSRLS;

          GRANT CONNECT ON DATABASE tenantkit TO tenantkit_app;
          GRANT USAGE ON SCHEMA public TO tenantkit_app;
      END $$;
    `);

    // Grant permissions on existing tables and sequences
    await queryRunner.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tenantkit_app;`,
    );
    await queryRunner.query(
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tenantkit_app;`,
    );

    // We also alter default privileges for tables created in the future:
    try {
      await queryRunner.query(`
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tenantkit_app;
      `);
      await queryRunner.query(`
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO tenantkit_app;
      `);
    } catch {
      // Ignore if not supported in current environment
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP POLICY IF EXISTS tenants_isolation_policy ON tenants;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS users_access_policy ON users;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS memberships_tenant_isolation_policy ON memberships;`,
    );
    await queryRunner.query(`ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(`ALTER TABLE users DISABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(
      `ALTER TABLE memberships DISABLE ROW LEVEL SECURITY;`,
    );
  }
}
