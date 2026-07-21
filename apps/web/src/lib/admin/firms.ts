'use client';

import { readStore, writeStore } from './store-utils';
import { recordAuditEvent } from './audit-log';
import { DEMO_ACCOUNTS, getBalance } from '@/lib/ai-credits/wallet-store';
import { getUsers } from './users';

/**
 * Firms/Tenants reuse the same three demonstration accounts already
 * seeded for AI Credits (lib/ai-credits/wallet-store's DEMO_ACCOUNTS) as
 * their tenant identity, rather than inventing a second, disconnected
 * tenant list — a firm's AI Credit balance below is read live from that
 * same wallet store.
 */
export interface FirmDetail {
  id: string;
  name: string;
  tenantRef: string;
  primaryAdminUserId: string | null;
  status: 'Active' | 'Suspended';
  planCode: string;
  activeMatterCount: number;
  documentTemplateCount: number;
  offices: string[];
  createdAt: string;
  lastActivity: string;
}

const FIRMS_KEY = 'nchq-admin-firms-v1';

const SEED_FIRMS: FirmDetail[] = [
  { id: 'demo-tenant-advocate', name: 'Adv. Kavita Deshmukh (Solo Practice)', tenantRef: 'TEN-0001', primaryAdminUserId: 'usr-002', status: 'Active', planCode: 'PROFESSIONAL', activeMatterCount: 6, documentTemplateCount: 4, offices: ['Pune'], createdAt: '2026-01-15T09:00:00+05:30', lastActivity: '2026-07-19T18:20:00+05:30' },
  { id: 'demo-tenant-firm', name: 'Sharma & Associates (Firm)', tenantRef: 'TEN-0002', primaryAdminUserId: 'usr-003', status: 'Active', planCode: 'FIRM', activeMatterCount: 21, documentTemplateCount: 9, offices: ['Mumbai', 'Delhi'], createdAt: '2025-12-01T09:00:00+05:30', lastActivity: '2026-07-20T08:05:00+05:30' },
  { id: 'demo-tenant-starter', name: 'Adv. Neha Choudhary (Starter Trial)', tenantRef: 'TEN-0003', primaryAdminUserId: 'usr-005', status: 'Active', planCode: 'STARTER', activeMatterCount: 2, documentTemplateCount: 1, offices: ['Jaipur'], createdAt: '2026-07-11T09:00:00+05:30', lastActivity: '2026-07-17T11:00:00+05:30' },
];

export function getFirms(): FirmDetail[] {
  return readStore(FIRMS_KEY, SEED_FIRMS);
}

export function getFirm(id: string): FirmDetail | undefined {
  return getFirms().find((f) => f.id === id);
}

/** Combines the firm record with its live AI Credit balance and its real
 * (mock) user list — tenant-scoped: a firm's detail view only ever reads
 * its own account id, never another tenant's. */
export function getFirmWithUsageSummary(id: string) {
  const firm = getFirm(id);
  if (!firm) return null;
  const balance = getBalance(id);
  const users = getUsers().filter((u) => u.firmId === id);
  return { firm, balance, users };
}

function saveFirms(firms: FirmDetail[]): void {
  writeStore(FIRMS_KEY, firms);
}

export function setFirmStatus(id: string, status: 'Active' | 'Suspended', adminActor: string, reason: string): FirmDetail | null {
  const firms = getFirms();
  const idx = firms.findIndex((f) => f.id === id);
  if (idx === -1) return null;
  const previous = firms[idx];
  const updated = { ...previous, status };
  saveFirms([...firms.slice(0, idx), updated, ...firms.slice(idx + 1)]);
  recordAuditEvent({
    actor: adminActor,
    actorRole: 'PLATFORM_ADMIN',
    tenantId: id,
    target: `Firm ${previous.name}`,
    action: status === 'Suspended' ? 'Tenant suspension' : 'Tenant restoration',
    previousValue: previous.status,
    newValue: status,
    reason,
    sessionRef: null,
    result: 'SUCCESS',
  });
  return updated;
}

export function assignFirmPlan(id: string, planCode: string, adminActor: string, reason: string): FirmDetail | null {
  const firms = getFirms();
  const idx = firms.findIndex((f) => f.id === id);
  if (idx === -1) return null;
  const previous = firms[idx];
  const updated = { ...previous, planCode };
  saveFirms([...firms.slice(0, idx), updated, ...firms.slice(idx + 1)]);
  recordAuditEvent({
    actor: adminActor,
    actorRole: 'PLATFORM_ADMIN',
    tenantId: id,
    target: `Firm ${previous.name}`,
    action: 'Plan change',
    previousValue: previous.planCode,
    newValue: planCode,
    reason,
    sessionRef: null,
    result: 'SUCCESS',
  });
  return updated;
}

export { DEMO_ACCOUNTS };
