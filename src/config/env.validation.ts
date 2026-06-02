import * as Joi from 'joi';

/**
 * Validates process environment at boot. Required vars have no fallbacks, so a
 * misconfigured deployment fails fast instead of silently shipping insecure
 * placeholders (the previous `fallback_secret` / `change_this_password` risk).
 *
 * Optional integration vars (Stripe, SMTP) are left optional on purpose: the
 * app degrades to mock/dev mode when they are absent, matching the existing
 * Stripe "Mock Sandbox Mode" and Redis fallback behaviour.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // Auth — required, no fallback.
  JWT_SECRET: Joi.string().min(32).required(),

  // Database — required (synchronize/migrations both depend on a real DB).
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_DATABASE: Joi.string().required(),

  // Password for the least-privileged RLS role (tenantkit_app). Required in
  // production so the role is never left on a known placeholder password.
  TENANT_DB_APP_PASSWORD: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.string().default('change_this_password'),
  }),

  // Redis — used by cache, BullMQ queue and the throttler store.
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),

  // Frontend origin used to build links in transactional emails.
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3001'),

  // CORS — comma-separated list of additional allowed origins (B4).
  CORS_ORIGINS: Joi.string().allow('').optional(),

  // Stripe — optional. Absent/placeholder => Mock Sandbox Mode.
  STRIPE_API_KEY: Joi.string().optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
  STRIPE_PRO_PRICE_ID: Joi.string().optional(),
  STRIPE_ENT_PRICE_ID: Joi.string().optional(),

  // SMTP — optional. Absent SMTP_HOST => dev mail mode (logs emails).
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  SMTP_FROM: Joi.string().default('TenantKit <no-reply@tenantkit.app>'),
});
