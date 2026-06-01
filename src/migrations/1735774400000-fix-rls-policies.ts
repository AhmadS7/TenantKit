import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixRlsPolicies1735774400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create safe helper function for tenant context
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid AS $$
      BEGIN
          RETURN NULLIF(current_setting('app.current_tenant', true), '')::uuid;
      EXCEPTION WHEN OTHERS THEN
          RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 2. Create safe helper function for user context
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION current_user_id() RETURNS uuid AS $$
      BEGIN
          RETURN NULLIF(current_setting('app.current_user', true), '')::uuid;
      EXCEPTION WHEN OTHERS THEN
          RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 3. Ensure RLS is enabled
    await queryRunner.query(`ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;`);
    await queryRunner.query(
      `ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;`,
    );
    await queryRunner.query(`ALTER TABLE users ENABLE ROW LEVEL SECURITY;`);

    // 4. Drop broken policies if they exist (old names and new names to avoid conflicts)
    await queryRunner.query(
      `DROP POLICY IF EXISTS users_access_policy ON users;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS tenants_access_policy ON tenants;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS memberships_access_policy ON memberships;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS tenants_isolation_policy ON tenants;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS memberships_tenant_isolation_policy ON memberships;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS users_isolation_policy ON users;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS tenant_isolation ON tenants;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS membership_isolation ON memberships;`,
    );
    await queryRunner.query(`DROP POLICY IF EXISTS user_isolation ON users;`);

    // 5. Create Tenants isolation policy: see only your own
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON tenants
      FOR ALL
      USING (id = current_tenant_id());
    `);

    // 6. Create Memberships isolation policy: see only rows in current tenant
    await queryRunner.query(`
      CREATE POLICY membership_isolation ON memberships
      FOR ALL
      USING (tenant_id = current_tenant_id());
    `);

    // 7. Create Users isolation policy: see yourself + users linked via memberships in current tenant
    await queryRunner.query(`
      CREATE POLICY user_isolation ON users
      FOR ALL
      USING (
          id = current_user_id()
          OR EXISTS (
              SELECT 1 FROM memberships m
              WHERE m.user_id = users.id
              AND m.tenant_id = current_tenant_id()
          )
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the new policies
    await queryRunner.query(
      `DROP POLICY IF EXISTS tenant_isolation ON tenants;`,
    );
    await queryRunner.query(
      `DROP POLICY IF EXISTS membership_isolation ON memberships;`,
    );
    await queryRunner.query(`DROP POLICY IF EXISTS user_isolation ON users;`);

    // Re-create the original (broken) policies for rollback purposes
    await queryRunner.query(`
      CREATE POLICY tenants_isolation_policy ON tenants
          FOR ALL
          USING (id = current_setting('app.current_tenant')::uuid);
    `);

    await queryRunner.query(`
      CREATE POLICY users_access_policy ON users
          FOR ALL
          USING (current_setting('app.current_tenant')::uuid IS NOT NULL);
    `);

    await queryRunner.query(`
      CREATE POLICY memberships_tenant_isolation_policy ON memberships
          FOR ALL
          USING (tenant_id = current_setting('app.current_tenant')::uuid);
    `);

    // Drop context functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS current_user_id();`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS current_tenant_id();`);
  }
}
