import Joi from 'joi';

const INSECURE_SECRET_MARKERS = ['change-me', 'development', 'your-', 'placeholder', 'replace-'];

function isLocalhostOrigin(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
  } catch {
    return false;
  }
}

function getStringValue(config: Record<string, unknown>, key: string): string {
  const value = config[key];
  return typeof value === 'string' ? value.trim() : '';
}

function getBooleanValue(config: Record<string, unknown>, key: string): boolean {
  return config[key] === true || config[key] === 'true';
}

function hasInsecureSecretMarker(value: string): boolean {
  const normalized = value.toLowerCase();
  return INSECURE_SECRET_MARKERS.some((marker) => normalized.includes(marker));
}

function validateProductionHardening(value: unknown, helpers: Joi.CustomHelpers): unknown {
  const config = value as Record<string, unknown>;
  const isProduction = getStringValue(config, 'NODE_ENV') === 'production';
  const allowInsecureLocalDefaults = getBooleanValue(config, 'AUTH_ALLOW_INSECURE_PRODUCTION_DEFAULTS');

  if (!isProduction || allowInsecureLocalDefaults) {
    return value;
  }

  const errors: string[] = [];
  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'AUTH_CONFIG_ENCRYPTION_KEY']) {
    const secret = getStringValue(config, key);
    if (secret.length < 32 || hasInsecureSecretMarker(secret)) {
      errors.push(`${key} must be a non-placeholder secret with at least 32 characters in production.`);
    }
  }

  const sameSite = getStringValue(config, 'AUTH_SESSION_COOKIE_SAME_SITE');
  const secureCookie = getBooleanValue(config, 'AUTH_SESSION_COOKIE_SECURE');
  if (sameSite === 'none' && !secureCookie) {
    errors.push('AUTH_SESSION_COOKIE_SECURE must be true when AUTH_SESSION_COOKIE_SAME_SITE=none.');
  }

  const corsOrigins = getStringValue(config, 'CORS_ORIGIN')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const hasNonLocalOrigin = corsOrigins.some((origin) => !isLocalhostOrigin(origin));
  if (hasNonLocalOrigin && !secureCookie) {
    errors.push('AUTH_SESSION_COOKIE_SECURE must be true when production CORS_ORIGIN contains non-localhost origins.');
  }

  if (!getBooleanValue(config, 'AUTH_EMAIL_OUTBOX_WORKER_ENABLED')) {
    errors.push('AUTH_EMAIL_OUTBOX_WORKER_ENABLED must be true in production.');
  }
  for (const key of ['AUTH_EMAIL_SMTP_HOST', 'AUTH_EMAIL_SMTP_USERNAME', 'AUTH_EMAIL_FROM_ADDRESS']) {
    if (!getStringValue(config, key)) {
      errors.push(`${key} must be configured in production.`);
    }
  }
  const smtpPassword = getStringValue(config, 'AUTH_EMAIL_SMTP_PASSWORD');
  if (smtpPassword.length < 16 || hasInsecureSecretMarker(smtpPassword)) {
    errors.push('AUTH_EMAIL_SMTP_PASSWORD must be a non-placeholder secret with at least 16 characters in production.');
  }

  if (errors.length > 0) {
    return helpers.error('any.custom', { message: errors.join(' ') });
  }

  return value;
}

// Environment variable validation schema
export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(4000),
  PLATFORM_SETUP_TOKEN: Joi.string().trim().min(32).max(256).allow('').default(''),
  CORS_ORIGIN: Joi.string().allow('').default('http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://localhost:3004'),
  AUTH_PUBLIC_API_BASE_URL: Joi.string().uri().allow('').default(''),
  AUTH_TRUST_FORWARD_HEADERS: Joi.boolean().default(false),
  AUTH_ALLOW_INSECURE_PRODUCTION_DEFAULTS: Joi.boolean().default(false),

  // JWT
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  AUTH_SESSION_COOKIE_NAME: Joi.string().default('ssoo-session'),
  AUTH_SESSION_COOKIE_DOMAIN: Joi.string().allow('').default(''),
  AUTH_SESSION_COOKIE_SECURE: Joi.boolean().default(false),
  AUTH_SESSION_COOKIE_SAME_SITE: Joi.string().valid('lax', 'strict', 'none').default('lax'),
  AUTH_SESSION_IDLE_TIMEOUT_MINUTES: Joi.number().integer().min(1).max(1440).default(30),
  AUTH_MICROSOFT_OAUTH_STATE_COOKIE_NAME: Joi.string().default('ssoo-ms-oauth-state'),
  AUTH_OAUTH_STATE_SIGNING_SECRET: Joi.string().min(32).allow('').default(''),
  AUTH_CONFIG_ENCRYPTION_KEY: Joi.string().allow('').default(''),
  AUTH_DEFAULT_LOGIN_URL: Joi.string().allow('').default(''),
  AUTH_EMAIL_OUTBOX_WORKER_ENABLED: Joi.boolean().default(false),
  AUTH_EMAIL_OUTBOX_INTERVAL_MS: Joi.number().integer().min(5000).max(3600000).default(30000),
  AUTH_EMAIL_OUTBOX_BATCH_LIMIT: Joi.number().integer().min(1).max(100).default(20),
  AUTH_EMAIL_OUTBOX_RUN_ON_START: Joi.boolean().default(true),
  AUTH_EMAIL_SMTP_HOST: Joi.string().allow('').default(''),
  AUTH_EMAIL_SMTP_PORT: Joi.number().port().default(587),
  AUTH_EMAIL_SMTP_SECURE: Joi.boolean().default(false),
  AUTH_EMAIL_SMTP_USERNAME: Joi.string().allow('').default(''),
  AUTH_EMAIL_SMTP_PASSWORD: Joi.string().allow('').default(''),
  AUTH_EMAIL_FROM_ADDRESS: Joi.string().email().allow('').default(''),

  // Database
  DATABASE_URL: Joi.string().uri().required(),
}).custom(validateProductionHardening, 'production auth hardening validation')
  .messages({
    'any.custom': '{{#message}}',
  });
