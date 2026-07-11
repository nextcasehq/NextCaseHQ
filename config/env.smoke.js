const { z } = require('zod');

/**
 * Production Environment Variable Schema (JS for smoke testing)
 */
const envSchema = z.object({
  DNS: z.string().url(),
  SSL_PATH: z.string().min(1),
  OAUTH_URL: z.string().url(),
  DB_SESSION_URL: z.string().url(),
  NODE_ENV: z.enum(['production', 'staging']),
});

function validateEnv(config) {
  return envSchema.parse(config);
}

module.exports = { envSchema, validateEnv };
