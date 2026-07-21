'use client';

import { readStore, writeStore } from './store-utils';
import { recordAuditEvent } from './audit-log';

export interface NotificationTypeConfig {
  key: string;
  displayName: string;
  enabled: boolean;
  inAppDelivery: boolean;
  emailDelivery: boolean;
  defaultLeadTimeDays: number | null;
  repeatBehaviour: string;
  userOptOutAllowed: boolean;
  tenantOverrideAllowed: boolean;
  severity: 'Low' | 'Medium' | 'High';
}

const NOTIFICATIONS_KEY = 'nchq-admin-notification-types-v1';

const SEED_TYPES: NotificationTypeConfig[] = [
  { key: 'upcoming_hearing', displayName: 'Upcoming Hearing', enabled: true, inAppDelivery: true, emailDelivery: false, defaultLeadTimeDays: 7, repeatBehaviour: 'Once at lead time, once on hearing day', userOptOutAllowed: false, tenantOverrideAllowed: true, severity: 'Medium' },
  { key: 'urgent_deadline', displayName: 'Urgent Deadline', enabled: true, inAppDelivery: true, emailDelivery: false, defaultLeadTimeDays: 2, repeatBehaviour: 'Daily until resolved', userOptOutAllowed: false, tenantOverrideAllowed: false, severity: 'High' },
  { key: 'incomplete_hearing_update', displayName: 'Incomplete Hearing Update', enabled: true, inAppDelivery: true, emailDelivery: false, defaultLeadTimeDays: null, repeatBehaviour: 'Once', userOptOutAllowed: true, tenantOverrideAllowed: true, severity: 'Low' },
  { key: 'matter_change', displayName: 'Matter Change', enabled: true, inAppDelivery: true, emailDelivery: false, defaultLeadTimeDays: null, repeatBehaviour: 'Once per change', userOptOutAllowed: true, tenantOverrideAllowed: true, severity: 'Low' },
  { key: 'tomorrows_case_prep', displayName: "Tomorrow's-Case Preparation", enabled: true, inAppDelivery: true, emailDelivery: false, defaultLeadTimeDays: 1, repeatBehaviour: 'Once daily', userOptOutAllowed: true, tenantOverrideAllowed: true, severity: 'Medium' },
  { key: 'low_ai_credit_balance', displayName: 'Low AI Credit Balance', enabled: true, inAppDelivery: true, emailDelivery: false, defaultLeadTimeDays: null, repeatBehaviour: 'Once per threshold crossed, per session', userOptOutAllowed: false, tenantOverrideAllowed: false, severity: 'Medium' },
  { key: 'zero_ai_credits', displayName: 'Zero AI Credits', enabled: true, inAppDelivery: true, emailDelivery: false, defaultLeadTimeDays: null, repeatBehaviour: 'Once per session', userOptOutAllowed: false, tenantOverrideAllowed: false, severity: 'High' },
  { key: 'subscription_status', displayName: 'Subscription Status', enabled: true, inAppDelivery: true, emailDelivery: false, defaultLeadTimeDays: null, repeatBehaviour: 'On change', userOptOutAllowed: false, tenantOverrideAllowed: false, severity: 'Medium' },
  { key: 'security_alert', displayName: 'Security Alert', enabled: true, inAppDelivery: true, emailDelivery: false, defaultLeadTimeDays: null, repeatBehaviour: 'Immediate', userOptOutAllowed: false, tenantOverrideAllowed: false, severity: 'High' },
  { key: 'integration_failure', displayName: 'Integration Failure', enabled: true, inAppDelivery: true, emailDelivery: false, defaultLeadTimeDays: null, repeatBehaviour: 'Immediate, then hourly until resolved', userOptOutAllowed: false, tenantOverrideAllowed: false, severity: 'High' },
  { key: 'administrative_notice', displayName: 'Administrative Notice', enabled: true, inAppDelivery: true, emailDelivery: false, defaultLeadTimeDays: null, repeatBehaviour: 'Once', userOptOutAllowed: true, tenantOverrideAllowed: false, severity: 'Low' },
];

export function getNotificationTypes(): NotificationTypeConfig[] {
  return readStore(NOTIFICATIONS_KEY, SEED_TYPES);
}

export function updateNotificationType(key: string, patch: Partial<NotificationTypeConfig>, adminActor: string): void {
  const types = getNotificationTypes();
  const idx = types.findIndex((t) => t.key === key);
  if (idx === -1) return;
  const previous = types[idx];
  const updated = { ...previous, ...patch };
  writeStore(NOTIFICATIONS_KEY, [...types.slice(0, idx), updated, ...types.slice(idx + 1)]);
  recordAuditEvent({
    actor: adminActor, actorRole: 'PLATFORM_ADMIN', tenantId: null,
    target: `Notification Type ${previous.displayName}`, action: 'Notification configuration changed',
    previousValue: JSON.stringify(previous), newValue: JSON.stringify(updated), reason: 'Admin update', sessionRef: null, result: 'SUCCESS',
  });
}
