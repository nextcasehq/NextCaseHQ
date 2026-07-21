import { redirect } from 'next/navigation';

/**
 * Formerly a mock tenant-picker wedged between /login and /dashboard,
 * presenting a fake "choose your workspace" step (three hardcoded tenants,
 * a client-only cookie with no effect on real access) for every account
 * regardless of whether it actually had more than one workspace. The real
 * tenant identity is already bound server-side at login time (the tenantId
 * claim in the session JWT, see api/auth/session/route.ts), so this page
 * had no real function. Kept only as a redirect for any existing
 * bookmarks/links, per the single-login-entry-point milestone.
 */
export default function OrganizationPage() {
  redirect('/dashboard');
}
