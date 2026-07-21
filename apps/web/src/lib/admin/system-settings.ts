'use client';

import { readStore, writeStore } from './store-utils';
import { recordAuditEvent } from './audit-log';

export interface SystemSettings {
  platformName: string;
  supportEmail: string;
  defaultTimezone: string;
  defaultCurrency: string;
  dateFormat: string;
  hearingReminderLeadDays: number;
  matterClosureRequiresReason: boolean;
  sessionTimeoutMinutes: number;
  allowedFileTypes: string[];
  maxUploadSizeMb: number;
  maintenanceMode: boolean;
  publicRegistrationEnabled: boolean;
  trialAvailable: boolean;
  aiAvailable: boolean;
}

const SETTINGS_KEY = 'nchq-admin-system-settings-v1';

const SEED_SETTINGS: SystemSettings = {
  platformName: 'NextCaseHQ',
  supportEmail: 'support@nextcasehq.com',
  defaultTimezone: 'Asia/Kolkata',
  defaultCurrency: 'INR',
  dateFormat: 'DD MMM YYYY',
  hearingReminderLeadDays: 7,
  matterClosureRequiresReason: true,
  sessionTimeoutMinutes: 1440,
  allowedFileTypes: ['pdf', 'docx', 'jpg', 'png'],
  maxUploadSizeMb: 25,
  maintenanceMode: false,
  publicRegistrationEnabled: false,
  trialAvailable: true,
  aiAvailable: true,
};

export function getSystemSettings(): SystemSettings {
  return readStore(SETTINGS_KEY, SEED_SETTINGS);
}

const SENSITIVE_KEYS: (keyof SystemSettings)[] = ['maintenanceMode', 'publicRegistrationEnabled', 'sessionTimeoutMinutes'];

export function updateSystemSettings(patch: Partial<SystemSettings>, adminActor: string, reason: string): { ok: boolean; reason?: string } {
  const touchesSensitive = Object.keys(patch).some((k) => SENSITIVE_KEYS.includes(k as keyof SystemSettings));
  if (touchesSensitive && !reason.trim()) {
    return { ok: false, reason: 'A reason is required for security-sensitive settings changes.' };
  }
  const previous = getSystemSettings();
  const updated = { ...previous, ...patch };
  writeStore(SETTINGS_KEY, updated);
  recordAuditEvent({
    actor: adminActor, actorRole: 'PLATFORM_ADMIN', tenantId: null,
    target: 'System Settings', action: 'System setting changed',
    previousValue: JSON.stringify(previous), newValue: JSON.stringify(updated), reason: reason || 'Admin update', sessionRef: null, result: 'SUCCESS',
  });
  return { ok: true };
}
