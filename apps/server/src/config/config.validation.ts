import Joi from 'joi';

const INSECURE_SECRET_MARKERS = ['change-me', 'development', 'your-', 'placeholder'];

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

  if (errors.length > 0) {
    return helpers.error('any.custom', { message: errors.join(' ') });
  }

  return value;
}

// Environment variable validation schema
export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(4000),
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
  AUTH_MICROSOFT_OAUTH_STATE_COOKIE_NAME: Joi.string().default('ssoo-ms-oauth-state'),
  AUTH_OAUTH_STATE_SIGNING_SECRET: Joi.string().min(32).allow('').default(''),
  AUTH_CONFIG_ENCRYPTION_KEY: Joi.string().allow('').default(''),
  AUTH_DEFAULT_LOGIN_URL: Joi.string().allow('').default(''),

  // Database
  DATABASE_URL: Joi.string().uri().required(),
}).custom(validateProductionHardening, 'production auth hardening validation')
  .messages({
    'any.custom': '{{#message}}',
  });
