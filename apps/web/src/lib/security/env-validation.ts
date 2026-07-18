/**
 * Fails fast at startup if production is about to run on a known-insecure
 * default. Every secret in this app (JWT_SECRET, WEBHOOK_SIGNING_SECRET,
 * ADMIN_ACCESS_TOKEN) has a hardcoded fallback for local dev ergonomics —
 * fine when nobody outside the team can reach the process, dangerous if a
 * real deployment silently inherits it. This only enforces in
 * NODE_ENV=production; dev/test keep working with the fallbacks
 * unchanged, matching how every other secret in this codebase already
 * behaves.
 */

export const INSECURE_JWT_SECRET_PLACEHOLDER = 'nchq-secret-placeholder';
export const INSECURE_WEBHOOK_SECRET_PLACEHOLDER = 'nchq-webhook-secret-placeholder';
export const INSECURE_ADMIN_TOKEN_PLACEHOLDER = 'nchq-admin-secret-key-2026';
export const INSECURE_ADMIN_SESSION_SECRET_PLACEHOLDER = 'nchq-admin-session-secret-placeholder';

export interface EnvValidationIssue {
  variable: string;
  message: string;
}

export function collectStartupEnvIssues(env: NodeJS.ProcessEnv = process.env): EnvValidationIssue[] {
  const issues: EnvValidationIssue[] = [];

  if (env.NODE_ENV !== 'production') {
    return issues;
  }

  if (!env.DATABASE_URL) {
    issues.push({ variable: 'DATABASE_URL', message: 'DATABASE_URL is required in production.' });
  }

  if (!env.JWT_SECRET || env.JWT_SECRET === INSECURE_JWT_SECRET_PLACEHOLDER) {
    issues.push({
      variable: 'JWT_SECRET',
      message: 'JWT_SECRET must be set to a real secret in production (missing or using the known insecure default).',
    });
  }

  if (!env.WEBHOOK_SIGNING_SECRET || env.WEBHOOK_SIGNING_SECRET === INSECURE_WEBHOOK_SECRET_PLACEHOLDER) {
    issues.push({
      variable: 'WEBHOOK_SIGNING_SECRET',
      message: 'WEBHOOK_SIGNING_SECRET must be set to a real secret in production (missing or using the known insecure default).',
    });
  }

  if (!env.ADMIN_ACCESS_TOKEN || env.ADMIN_ACCESS_TOKEN === INSECURE_ADMIN_TOKEN_PLACEHOLDER) {
    issues.push({
      variable: 'ADMIN_ACCESS_TOKEN',
      message: 'ADMIN_ACCESS_TOKEN must be set to a real secret in production (missing or using the known insecure default).',
    });
  }

  if (!env.ADMIN_SESSION_SECRET || env.ADMIN_SESSION_SECRET === INSECURE_ADMIN_SESSION_SECRET_PLACEHOLDER) {
    issues.push({
      variable: 'ADMIN_SESSION_SECRET',
      message: 'ADMIN_SESSION_SECRET must be set to a real secret in production (missing or using the known insecure default).',
    });
  }

  return issues;
}

export function validateStartupEnv(env: NodeJS.ProcessEnv = process.env): void {
  const issues = collectStartupEnvIssues(env);
  if (issues.length > 0) {
    const details = issues.map((issue) => `  - ${issue.variable}: ${issue.message}`).join('\n');
    throw new Error(`Startup environment validation failed:\n${details}`);
  }
}
