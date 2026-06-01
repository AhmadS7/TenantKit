import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexes1735774300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Indexes on foreign keys for fast joins
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_memberships_tenant_id ON memberships(tenant_id);`,
    );

    // Index on role for access checks
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_memberships_role ON memberships(role);`,
    );

    // Indexes on createdAt fields for default sorting
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_tenants_created_at ON tenants("createdAt");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_users_created_at ON users("createdAt");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_memberships_created_at ON memberships("createdAt");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_memberships_created_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_created_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tenants_created_at;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_memberships_role;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_memberships_tenant_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_memberships_user_id;`);
  }
}
