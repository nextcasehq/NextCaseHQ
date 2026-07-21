'use client';

import { readStore, writeStore, genId } from './store-utils';
import { recordAuditEvent } from './audit-log';

export type UserStatus = 'Active' | 'Invited' | 'Suspended' | 'Disabled' | 'Trial';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  primaryRole: string;
  firmId: string | null;
  firmName: string | null;
  status: UserStatus;
  planCode: string | null;
  aiCreditUsageStatus: 'Normal' | 'Low' | 'Suspended';
  lastLogin: string | null;
  createdAt: string;
}

const USERS_KEY = 'nchq-admin-users-v1';

const SEED_USERS: AdminUser[] = [
  { id: 'usr-001', name: 'Platform Admin Owner', email: 'owner@nextcasehq.com', primaryRole: 'PLATFORM_ADMIN', firmId: null, firmName: 'NextCaseHQ Platform Ops', status: 'Active', planCode: null, aiCreditUsageStatus: 'Normal', lastLogin: '2026-07-20T09:00:00+05:30', createdAt: '2025-11-01T09:00:00+05:30' },
  { id: 'usr-002', name: 'Adv. Kavita Deshmukh', email: 'kavita@deshmukh-law.in', primaryRole: 'ADVOCATE', firmId: 'demo-tenant-advocate', firmName: 'Adv. Kavita Deshmukh (Solo Practice)', status: 'Active', planCode: 'PROFESSIONAL', aiCreditUsageStatus: 'Normal', lastLogin: '2026-07-19T18:20:00+05:30', createdAt: '2026-01-15T09:00:00+05:30' },
  { id: 'usr-003', name: 'Adv. Rohit Agarwal', email: 'rohit@sharma-associates.in', primaryRole: 'FIRM_ADMIN', firmId: 'demo-tenant-firm', firmName: 'Sharma & Associates (Firm)', status: 'Active', planCode: 'FIRM', aiCreditUsageStatus: 'Normal', lastLogin: '2026-07-20T08:05:00+05:30', createdAt: '2025-12-01T09:00:00+05:30' },
  { id: 'usr-004', name: 'Adv. Priya Nair', email: 'priya@sharma-associates.in', primaryRole: 'FIRM_STAFF', firmId: 'demo-tenant-firm', firmName: 'Sharma & Associates (Firm)', status: 'Active', planCode: 'FIRM', aiCreditUsageStatus: 'Normal', lastLogin: '2026-07-18T14:00:00+05:30', createdAt: '2026-02-10T09:00:00+05:30' },
  { id: 'usr-005', name: 'Adv. Neha Choudhary', email: 'neha.choudhary@gmail.com', primaryRole: 'ADVOCATE', firmId: 'demo-tenant-starter', firmName: 'Adv. Neha Choudhary (Starter Trial)', status: 'Trial', planCode: 'STARTER', aiCreditUsageStatus: 'Low', lastLogin: '2026-07-17T11:00:00+05:30', createdAt: '2026-07-11T09:00:00+05:30' },
  { id: 'usr-006', name: 'Sunita Rao', email: 'sunita.rao@example.com', primaryRole: 'LITIGANT', firmId: null, firmName: null, status: 'Invited', planCode: null, aiCreditUsageStatus: 'Normal', lastLogin: null, createdAt: '2026-07-19T09:00:00+05:30' },
  { id: 'usr-007', name: 'Suspended Test Account', email: 'suspended@example.com', primaryRole: 'ADVOCATE', firmId: null, firmName: null, status: 'Suspended', planCode: 'STARTER', aiCreditUsageStatus: 'Suspended', lastLogin: '2026-06-01T09:00:00+05:30', createdAt: '2026-03-01T09:00:00+05:30' },
];

export function getUsers(): AdminUser[] {
  return readStore(USERS_KEY, SEED_USERS);
}

function saveUsers(users: AdminUser[]): void {
  writeStore(USERS_KEY, users);
}

function updateUser(id: string, patch: Partial<AdminUser>): AdminUser | null {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  const updated = { ...users[idx], ...patch };
  const next = [...users.slice(0, idx), updated, ...users.slice(idx + 1)];
  saveUsers(next);
  return updated;
}

export function setUserStatus(id: string, status: UserStatus, adminActor: string, reason: string): AdminUser | null {
  const users = getUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return null;
  const updated = updateUser(id, { status });
  recordAuditEvent({
    actor: adminActor,
    actorRole: 'PLATFORM_ADMIN',
    tenantId: user.firmId,
    target: `User ${user.email}`,
    action: status === 'Suspended' ? 'User suspension' : status === 'Active' ? 'User restoration' : `User status changed to ${status}`,
    previousValue: user.status,
    newValue: status,
    reason,
    sessionRef: null,
    result: 'SUCCESS',
  });
  return updated;
}

export function assignUserRole(id: string, roleKey: string, adminActor: string, reason: string): AdminUser | null {
  const users = getUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return null;
  const updated = updateUser(id, { primaryRole: roleKey });
  recordAuditEvent({
    actor: adminActor,
    actorRole: 'PLATFORM_ADMIN',
    tenantId: user.firmId,
    target: `User ${user.email}`,
    action: 'Role change',
    previousValue: user.primaryRole,
    newValue: roleKey,
    reason,
    sessionRef: null,
    result: 'SUCCESS',
  });
  return updated;
}

export function assignUserFirm(id: string, firmId: string | null, firmName: string | null, adminActor: string, reason: string): AdminUser | null {
  const users = getUsers();
  const user = users.find((u) => u.id === id);
  if (!user) return null;
  const updated = updateUser(id, { firmId, firmName });
  recordAuditEvent({
    actor: adminActor,
    actorRole: 'PLATFORM_ADMIN',
    tenantId: firmId,
    target: `User ${user.email}`,
    action: 'Firm assignment changed',
    previousValue: user.firmName,
    newValue: firmName,
    reason,
    sessionRef: null,
    result: 'SUCCESS',
  });
  return updated;
}

export { genId };
