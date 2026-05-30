import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokens1735774500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL UNIQUE,
        is_revoked BOOLEAN NOT NULL DEFAULT false,
        is_used BOOLEAN NOT NULL DEFAULT false,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
    `);

    // Grant permissions on new table to cortex_app
    try {
      await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON refresh_tokens TO cortex_app;`);
    } catch (e) {
      // Ignore if role permissions not fully set up in this test session
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_refresh_tokens_hash;`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens;`);
  }
}
