/**
 * Next.js's official startup hook (stable since Next 15) — register()
 * runs once per runtime when the server starts, before any request is
 * handled. Used here to fail fast on insecure production secrets (see
 * lib/security/env-validation.ts) and on a database missing a table this
 * build's code depends on (see lib/db/schema-check.ts) — both catch a
 * misconfigured/unmigrated production environment at boot instead of as
 * a confusing per-request failure once real traffic arrives.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateStartupEnv } = await import('@/lib/security/env-validation');
    validateStartupEnv();

    const { validateStartupSchema } = await import('@/lib/db/schema-check');
    await validateStartupSchema();
  }
}
