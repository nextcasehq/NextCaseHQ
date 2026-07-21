'use client';

import { readStore, writeStore } from './store-utils';
import { recordAuditEvent } from './audit-log';
import { OFFICIAL_ECOURTS_URL } from '@/app/dashboard/matters/mock-matters';

export type EcourtsIntegrationMode =
  | 'Manual advocate-assisted verification'
  | 'Authorised API unavailable'
  | 'Authorised API approval pending'
  | 'Authorised API active';

export interface EcourtsAdminConfig {
  integrationMode: EcourtsIntegrationMode;
  officialUrl: string;
  disclaimer: string;
  attribution: string;
  caseNumberSearchEnabled: boolean;
  cnrSearchEnabled: boolean;
  authorisationStatus: string;
  lastConfigChangeAt: string;
  lastConfigChangeBy: string;
}

const ECOURTS_CONFIG_KEY = 'nchq-admin-ecourts-config-v1';

const SEED_CONFIG: EcourtsAdminConfig = {
  integrationMode: 'Manual advocate-assisted verification',
  officialUrl: OFFICIAL_ECOURTS_URL,
  disclaimer: 'eCourts information is provided for reference. Verify critical information against the relevant court record before acting.',
  attribution: 'External official service operated by the eCommittee / NIC.',
  caseNumberSearchEnabled: true,
  cnrSearchEnabled: true,
  authorisationStatus: 'Not yet obtained',
  lastConfigChangeAt: '2026-07-20T09:00:00+05:30',
  lastConfigChangeBy: 'Platform Admin (seed)',
};

/** Only this exact official domain is accepted without an explicit
 * security warning + privileged approval step — see requestUrlChange(). */
const ALLOWED_OFFICIAL_HOST = 'services.ecourts.gov.in';

export function getEcourtsConfig(): EcourtsAdminConfig {
  return readStore(ECOURTS_CONFIG_KEY, SEED_CONFIG);
}

function saveConfig(config: EcourtsAdminConfig): void {
  writeStore(ECOURTS_CONFIG_KEY, config);
}

export function isOfficialDomain(url: string): boolean {
  try {
    return new URL(url).hostname === ALLOWED_OFFICIAL_HOST;
  } catch {
    return false;
  }
}

/** Setting a non-official URL is refused outright in this prototype
 * rather than silently accepted — there is no "privileged approval"
 * override implemented, since building one would itself be new,
 * security-sensitive scope beyond this milestone. */
export function requestUrlChange(newUrl: string, adminActor: string, reason: string): { ok: boolean; reason?: string } {
  if (!isOfficialDomain(newUrl)) {
    return { ok: false, reason: `Only the official domain (${ALLOWED_OFFICIAL_HOST}) may be configured here.` };
  }
  const config = getEcourtsConfig();
  const updated = { ...config, officialUrl: newUrl, lastConfigChangeAt: new Date().toISOString(), lastConfigChangeBy: adminActor };
  saveConfig(updated);
  recordAuditEvent({
    actor: adminActor, actorRole: 'PLATFORM_ADMIN', tenantId: null,
    target: 'eCourts Configuration', action: 'Official URL changed',
    previousValue: config.officialUrl, newValue: newUrl, reason, sessionRef: null, result: 'SUCCESS',
  });
  return { ok: true };
}

export function updateEcourtsToggle(patch: Partial<Pick<EcourtsAdminConfig, 'caseNumberSearchEnabled' | 'cnrSearchEnabled'>>, adminActor: string): void {
  const config = getEcourtsConfig();
  const updated = { ...config, ...patch, lastConfigChangeAt: new Date().toISOString(), lastConfigChangeBy: adminActor };
  saveConfig(updated);
  recordAuditEvent({
    actor: adminActor, actorRole: 'PLATFORM_ADMIN', tenantId: null,
    target: 'eCourts Configuration', action: 'Search mode toggled',
    previousValue: JSON.stringify({ caseNumberSearchEnabled: config.caseNumberSearchEnabled, cnrSearchEnabled: config.cnrSearchEnabled }),
    newValue: JSON.stringify({ caseNumberSearchEnabled: updated.caseNumberSearchEnabled, cnrSearchEnabled: updated.cnrSearchEnabled }),
    reason: 'Admin toggle', sessionRef: null, result: 'SUCCESS',
  });
}
