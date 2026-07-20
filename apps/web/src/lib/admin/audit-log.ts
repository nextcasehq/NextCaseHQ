'use client';

import { readStore, writeStore, genId } from './store-utils';

/**
 * Append-only administrative audit log — every privileged mutation across
 * every Admin Panel section (users, firms, roles, commercialization,
 * templates, legal search, eCourts, notifications, integrations, feature
 * flags, security, settings, notices) records exactly one event here.
 * There is no delete/edit function exported — corrections are new events,
 * never rewrites of history, matching every other append-only ledger in
 * this codebase (WalletTransactionRecord, AiUsageEvent).
 */
export interface AuditEvent {
  id: string;
  actor: string;
  actorRole: string;
  tenantId: string | null;
  target: string;
  action: string;
  previousValue: string | null;
  newValue: string | null;
  reason: string;
  timestamp: string;
  sessionRef: string | null;
  result: 'SUCCESS' | 'FAILURE';
}

const AUDIT_KEY = 'nchq-admin-audit-log-v1';

const SEED_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'audit-seed-001',
    actor: 'Platform Admin',
    actorRole: 'PLATFORM_ADMIN',
    tenantId: null,
    target: 'System',
    action: 'Admin login',
    previousValue: null,
    newValue: null,
    reason: 'Routine sign-in.',
    timestamp: '2026-07-18T09:00:00+05:30',
    sessionRef: 'session-seed-001',
    result: 'SUCCESS',
  },
  {
    id: 'audit-seed-002',
    actor: 'Platform Admin',
    actorRole: 'PLATFORM_ADMIN',
    tenantId: 'demo-tenant-advocate',
    target: 'Credit Balance — demo-tenant-advocate',
    action: 'Manual admin adjustment',
    previousValue: '825',
    newValue: '650',
    reason: 'Demonstration balance adjustment for prototype validation.',
    timestamp: '2026-07-18T09:00:00+05:30',
    sessionRef: 'session-seed-001',
    result: 'SUCCESS',
  },
];

export function getAuditLog(): AuditEvent[] {
  return readStore(AUDIT_KEY, SEED_AUDIT_EVENTS);
}

export function recordAuditEvent(input: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
  const event: AuditEvent = { id: genId('audit'), timestamp: new Date().toISOString(), ...input };
  const log = getAuditLog();
  writeStore(AUDIT_KEY, [event, ...log]);
  return event;
}
