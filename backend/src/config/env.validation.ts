import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  DATABASE_URL: Joi.string().required().messages({
    'any.required': 'DATABASE_URL is required',
  }),
  REDIS_URL: Joi.string().required().messages({
    'any.required': 'REDIS_URL is required',
  }),
  JWT_ACCESS_SECRET: Joi.string().required().messages({
    'any.required': 'JWT_ACCESS_SECRET is required',
  }),
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  REFRESH_TOKEN_EXPIRY_DAYS: Joi.number().integer().min(1).max(90).default(7),
  RESEND_API_KEY: Joi.string().required().messages({
    'any.required': 'RESEND_API_KEY is required',
  }),
  RESEND_FROM_EMAIL: Joi.string()
    .email()
    .default('onboarding@resend.dev')
    .description(
      'Sender address for transactional emails (use verified domain in production)',
    ),
  APP_URL: Joi.string()
    .uri({ allowRelative: false })
    .optional()
    .description(
      'Frontend app base URL for invitation links (e.g. https://app.example.com)',
    ),
});
