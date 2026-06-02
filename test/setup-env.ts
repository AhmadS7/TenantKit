/**
 * Jest global setup (runs before each test file, before modules are imported).
 *
 * ConfigModule now validates env at boot with a Joi schema that has no
 * fallbacks for the required secrets (JWT_SECRET, DB_*). The test suites do not
 * load a `.env` file, so we seed safe defaults here. `??=` keeps any value the
 * CI environment already provides.
 */
process.env.NODE_ENV ??= 'test';
process.env.JWT_SECRET ??=
  'test_jwt_secret_at_least_32_characters_long_0123456789';
process.env.DB_HOST ??= 'localhost';
process.env.DB_PORT ??= '5432';
process.env.DB_USERNAME ??= 'postgres';
process.env.DB_PASSWORD ??= 'postgres';
process.env.DB_DATABASE ??= 'tenantkit';
process.env.REDIS_HOST ??= 'localhost';
process.env.REDIS_PORT ??= '6379';
