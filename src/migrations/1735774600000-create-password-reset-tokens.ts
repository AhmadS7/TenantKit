import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasswordResetTokens1735774600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL UNIQUE,
        used_at TIMESTAMP NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
    `);

    // Grant permissions on new table to tenantkit_app (least-privileged RLS role).
    try {
      await queryRunner.query(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON password_reset_tokens TO tenantkit_app;`,
      );
    } catch {
      // Ignore if role permissions not fully set up in this test session.
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_password_reset_tokens_hash;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS password_reset_tokens;`);
  }
}
