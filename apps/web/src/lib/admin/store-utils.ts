'use client';

/**
 * Shared local/session persistence helpers for every Admin Panel domain
 * module (users, firms, roles, templates, legal-search config, eCourts
 * config, notifications, integrations, feature flags, system settings,
 * operational notices, audit log). One implementation, reused everywhere,
 * so mock persistence isn't duplicated across a dozen files.
 *
 * "Demonstration administration — configuration is not yet
 * production-persistent." A future milestone would swap these for real
 * server-backed tables/API routes without changing the calling code's
 * shape (every module already returns/accepts plain typed objects).
 */

export function readStore<T>(key: string, seed: T): T {
  if (typeof window === 'undefined') return seed;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
}

export function writeStore<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local storage unavailable — the prototype simply won't persist across reloads.
  }
}

export function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const DEMO_ADMINISTRATION_NOTICE = 'Demonstration administration — configuration is not yet production-persistent.';
