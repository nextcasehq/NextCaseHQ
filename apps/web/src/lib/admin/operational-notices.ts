'use client';

import { readStore, writeStore, genId } from './store-utils';
import { recordAuditEvent } from './audit-log';

export type NoticeSeverity = 'Info' | 'Warning' | 'Critical';
export type NoticeType = 'Maintenance' | 'Service interruption' | 'Feature preview' | 'Security' | 'Billing' | 'Integration outage';

export interface OperationalNotice {
  id: string;
  title: string;
  message: string;
  type: NoticeType;
  severity: NoticeSeverity;
  audience: 'All users' | 'Admins only' | 'Specific plan';
  startTime: string;
  endTime: string | null;
  dismissible: boolean;
  active: boolean;
}

const NOTICES_KEY = 'nchq-admin-operational-notices-v1';

const SEED_NOTICES: OperationalNotice[] = [
  { id: 'notice-001', title: 'Scheduled Maintenance', message: 'Brief maintenance window planned for early Sunday morning IST.', type: 'Maintenance', severity: 'Info', audience: 'All users', startTime: '2026-07-27T02:00:00+05:30', endTime: '2026-07-27T04:00:00+05:30', dismissible: true, active: true },
];

export function getOperationalNotices(): OperationalNotice[] {
  return readStore(NOTICES_KEY, SEED_NOTICES);
}

export function saveOperationalNotice(notice: Omit<OperationalNotice, 'id'> & { id?: string }, adminActor: string): OperationalNotice {
  const notices = getOperationalNotices();
  const id = notice.id || genId('notice');
  const full: OperationalNotice = { ...notice, id };
  const idx = notices.findIndex((n) => n.id === id);
  const updated = idx >= 0 ? [...notices.slice(0, idx), full, ...notices.slice(idx + 1)] : [full, ...notices];
  writeStore(NOTICES_KEY, updated);
  recordAuditEvent({
    actor: adminActor, actorRole: 'PLATFORM_ADMIN', tenantId: null,
    target: `Operational Notice ${full.title}`, action: idx >= 0 ? 'Notice updated' : 'Notice created',
    previousValue: null, newValue: full.message, reason: 'Admin update', sessionRef: null, result: 'SUCCESS',
  });
  return full;
}

export function setNoticeActive(id: string, active: boolean, adminActor: string): void {
  const notices = getOperationalNotices();
  const idx = notices.findIndex((n) => n.id === id);
  if (idx === -1) return;
  const previous = notices[idx];
  const updated = { ...previous, active };
  writeStore(NOTICES_KEY, [...notices.slice(0, idx), updated, ...notices.slice(idx + 1)]);
  recordAuditEvent({
    actor: adminActor, actorRole: 'PLATFORM_ADMIN', tenantId: null,
    target: `Operational Notice ${previous.title}`, action: active ? 'Notice activated' : 'Notice deactivated',
    previousValue: String(previous.active), newValue: String(active), reason: 'Admin toggle', sessionRef: null, result: 'SUCCESS',
  });
}
