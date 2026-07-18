/**
 * Next.js's official startup hook (stable since Next 15) — register()
 * runs once per runtime when the server starts, before any request is
 * handled. Used here purely to fail fast on insecure production secrets;
 * see lib/security/env-validation.ts for what's actually checked.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateStartupEnv } = await import('@/lib/security/env-validation');
    validateStartupEnv();
  }
}
