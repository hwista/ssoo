import Joi from 'joi';

// Environment variable validation schema
export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(4000),
  CORS_ORIGIN: Joi.string().allow('').default('http://localhost:3000,http://localhost:3001,http://localhost:3002'),

  // JWT
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  AUTH_SESSION_COOKIE_NAME: Joi.string().default('ssoo-session'),
  AUTH_SESSION_COOKIE_DOMAIN: Joi.string().allow('').default(''),
  AUTH_SESSION_COOKIE_SECURE: Joi.boolean().default(false),
  AUTH_SESSION_COOKIE_SAME_SITE: Joi.string().valid('lax', 'strict', 'none').default('lax'),

  // Database
  DATABASE_URL: Joi.string().uri().required(),
});
