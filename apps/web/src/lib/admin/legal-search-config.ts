'use client';

import { readStore, writeStore } from './store-utils';
import { recordAuditEvent } from './audit-log';

export type SourceStatus = 'Demonstration source' | 'Unverified source' | 'Verified official source' | 'Disabled source' | 'Integration pending';

export interface LegalSearchSource {
  id: string;
  name: string;
  sourceType: string;
  status: SourceStatus;
  jurisdictionCoverage: string;
  courtCoverage: string;
  documentTypes: string[];
  citationFormat: string;
  enabled: boolean;
  usageLimit: number | null;
  lastSuccessfulCheck: string | null;
  internalNote: string;
}

const SOURCES_KEY = 'nchq-admin-legal-search-sources-v1';

const SEED_SOURCES: LegalSearchSource[] = [
  { id: 'src-001', name: 'Demo Judgment & Citation Set', sourceType: 'Synthetic demonstration dataset', status: 'Demonstration source', jurisdictionCoverage: 'None — synthetic', courtCoverage: 'None — synthetic', documentTypes: ['Judgment', 'Citation'], citationFormat: 'Neutral (Demo)', enabled: true, usageLimit: null, lastSuccessfulCheck: null, internalNote: 'Backs Product Review Mode only — never shown to a real session.' },
  { id: 'src-002', name: 'Real Hybrid Document Search', sourceType: 'Internal indexed documents', status: 'Verified official source', jurisdictionCoverage: 'Tenant-uploaded documents', courtCoverage: 'N/A', documentTypes: ['Uploaded document'], citationFormat: 'N/A', enabled: true, usageLimit: null, lastSuccessfulCheck: '2026-07-20T09:00:00+05:30', internalNote: 'The real, existing search-service.ts — indexes each tenant\'s own documents only.' },
  { id: 'src-003', name: 'Authorised eCourts Case-Status API', sourceType: 'Government API (proposed)', status: 'Integration pending', jurisdictionCoverage: 'India — pending authorisation', courtCoverage: 'Pending authorisation', documentTypes: ['Case status'], citationFormat: 'N/A', enabled: false, usageLimit: null, lastSuccessfulCheck: null, internalNote: 'Authorisation status: Not yet obtained. See docs/integrations for the access-request draft.' },
];

export function getLegalSearchSources(): LegalSearchSource[] {
  return readStore(SOURCES_KEY, SEED_SOURCES);
}

function saveSources(sources: LegalSearchSource[]): void {
  writeStore(SOURCES_KEY, sources);
}

/** Never allows a source's status to be set to "Verified official source"
 * unless it already was one — administrators cannot mark a synthetic or
 * unverified source as verified from this UI. */
export function updateSourceStatus(id: string, status: SourceStatus, adminActor: string): { ok: boolean; reason?: string } {
  const sources = getSources_internal();
  const idx = sources.findIndex((s) => s.id === id);
  if (idx === -1) return { ok: false, reason: 'Source not found.' };
  const previous = sources[idx];
  if (status === 'Verified official source' && previous.status !== 'Verified official source') {
    return { ok: false, reason: 'A source cannot be marked verified from this panel — verification requires an authorised, documented integration, not an admin toggle.' };
  }
  const updated = { ...previous, status };
  saveSources([...sources.slice(0, idx), updated, ...sources.slice(idx + 1)]);
  recordAuditEvent({
    actor: adminActor, actorRole: 'PLATFORM_ADMIN', tenantId: null,
    target: `Legal Search Source ${previous.name}`, action: 'Legal search source status changed',
    previousValue: previous.status, newValue: status, reason: 'Admin update', sessionRef: null, result: 'SUCCESS',
  });
  return { ok: true };
}

function getSources_internal(): LegalSearchSource[] {
  return getLegalSearchSources();
}

export function setSourceEnabled(id: string, enabled: boolean, adminActor: string): void {
  const sources = getLegalSearchSources();
  const idx = sources.findIndex((s) => s.id === id);
  if (idx === -1) return;
  const previous = sources[idx];
  const updated = { ...previous, enabled };
  saveSources([...sources.slice(0, idx), updated, ...sources.slice(idx + 1)]);
  recordAuditEvent({
    actor: adminActor, actorRole: 'PLATFORM_ADMIN', tenantId: null,
    target: `Legal Search Source ${previous.name}`, action: enabled ? 'Source enabled' : 'Source disabled',
    previousValue: String(previous.enabled), newValue: String(enabled), reason: 'Admin toggle', sessionRef: null, result: 'SUCCESS',
  });
}

export interface CitationGovernanceRules {
  aiSummaryDisclaimerRequired: boolean;
  advocateConfirmationRequiredBeforeFinalUse: boolean;
  sourceProvenanceMustBeVisible: boolean;
  citationsMayBeMarkedAsFactualEvidence: false;
}

const RULES_KEY = 'nchq-admin-citation-governance-v1';
const SEED_RULES: CitationGovernanceRules = {
  aiSummaryDisclaimerRequired: true,
  advocateConfirmationRequiredBeforeFinalUse: true,
  sourceProvenanceMustBeVisible: true,
  citationsMayBeMarkedAsFactualEvidence: false,
};

export function getCitationGovernanceRules(): CitationGovernanceRules {
  return readStore(RULES_KEY, SEED_RULES);
}
