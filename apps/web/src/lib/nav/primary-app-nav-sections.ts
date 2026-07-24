/**
 * The one cross-module nav row shared by every authenticated-shell layout
 * (Case Diary, Matter Register/Workspace, Draft Builder). Lives in its own
 * plain (non-'use client') module so it can be imported both by the real
 * nav components (PrimaryAppNav.tsx, PrimaryAppNavMobile.tsx) and by server
 * code (the /system/runtime diagnostics page) — a 'use client' module's
 * exports aren't readable as plain values from a server component, even
 * for non-component data, so this had to move out rather than stay
 * defined inside PrimaryAppNav.tsx itself.
 */
export const PRIMARY_APP_NAV_SECTIONS = [
  { key: 'cases', label: 'Case Diary', href: '/cases' },
  { key: 'matters', label: 'Matter Register', href: '/matters' },
  { key: 'draft-builder', label: 'Draft Builder', href: '/dashboard/draft-builder' },
] as const;

export type PrimaryAppNavSection = (typeof PRIMARY_APP_NAV_SECTIONS)[number]['key'];
