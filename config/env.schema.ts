import { z } from 'zod';

/**
 * Production Environment Variable Schema
 * Strictly defines and validates all production-required variables.
 * Final production bindings applied for India MVP release.
 */
export const envSchema = z.object({
  DNS: z.string().url().default('https://app.nextcase.in'),
  SSL_PATH: z.string().min(1).default('/etc/ssl/certs/nextcase.crt'),
  OAUTH_URL: z.string().url().default('https://auth.nextcase.in'),
  DB_SESSION_URL: z.string().url().default('postgres://production-db.nextcase.internal:5432/nextcase_hq'),
  NODE_ENV: z.enum(['production', 'staging']).default('production'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: unknown): Env {
  return envSchema.parse(config);
}
