'use client';

import { readStore, writeStore } from './store-utils';
import { recordAuditEvent } from './audit-log';

export interface FeatureFlag {
  key: string;
  displayName: string;
  description: string;
  enabled: boolean;
  environment: 'All' | 'Production' | 'Sandbox';
  eligiblePlans: string[];
  eligibleTenants: string[];
  effectiveFrom: string;
  updatedBy: string;
  updatedAt: string;
  internalReason: string;
  /** Flags marked unsafe cannot be enabled from this UI alone — see
   * setFlagEnabled(). Real production gating stays server-side. */
  productionGated: boolean;
}

const FLAGS_KEY = 'nchq-admin-feature-flags-v1';

const SEED_FLAGS: FeatureFlag[] = [
  { key: 'draft_document_prototype', displayName: 'Draft Document Prototype', description: 'The merged Draft Document prototype flow.', enabled: true, environment: 'All', eligiblePlans: [], eligibleTenants: [], effectiveFrom: '2026-07-01T00:00:00+05:30', updatedBy: 'Platform Admin', updatedAt: '2026-07-01T09:00:00+05:30', internalReason: 'Seed', productionGated: false },
  { key: 'next_hearing_stage', displayName: 'Next Hearing & Stage', description: 'The merged Next Hearing & Stage prototype flow.', enabled: true, environment: 'All', eligiblePlans: [], eligibleTenants: [], effectiveFrom: '2026-07-01T00:00:00+05:30', updatedBy: 'Platform Admin', updatedAt: '2026-07-01T09:00:00+05:30', internalReason: 'Seed', productionGated: false },
  { key: 'arguments_evidence', displayName: 'Arguments & Evidence', description: 'Per-matter Arguments and Evidence tabs.', enabled: true, environment: 'All', eligiblePlans: [], eligibleTenants: [], effectiveFrom: '2026-07-01T00:00:00+05:30', updatedBy: 'Platform Admin', updatedAt: '2026-07-01T09:00:00+05:30', internalReason: 'Seed', productionGated: false },
  { key: 'legal_search', displayName: 'Legal Search', description: 'The dashboard Legal Search workspace.', enabled: true, environment: 'All', eligiblePlans: [], eligibleTenants: [], effectiveFrom: '2026-07-01T00:00:00+05:30', updatedBy: 'Platform Admin', updatedAt: '2026-07-01T09:00:00+05:30', internalReason: 'Seed', productionGated: false },
  { key: 'ecourts_manual_verification', displayName: 'eCourts Manual Verification', description: 'The Check eCourts Case Update Action Card.', enabled: true, environment: 'All', eligiblePlans: [], eligibleTenants: [], effectiveFrom: '2026-07-01T00:00:00+05:30', updatedBy: 'Platform Admin', updatedAt: '2026-07-01T09:00:00+05:30', internalReason: 'Seed', productionGated: false },
  { key: 'ai_drafting', displayName: 'AI Drafting', description: 'AI-assisted drafting actions charged against AI Credits.', enabled: true, environment: 'All', eligiblePlans: ['STARTER', 'PROFESSIONAL', 'FIRM'], eligibleTenants: [], effectiveFrom: '2026-07-01T00:00:00+05:30', updatedBy: 'Platform Admin', updatedAt: '2026-07-01T09:00:00+05:30', internalReason: 'Seed', productionGated: false },
  { key: 'ai_evidence_assistance', displayName: 'AI Evidence Assistance', description: 'AI-assisted evidence review, restricted to Professional+.', enabled: true, environment: 'All', eligiblePlans: ['PROFESSIONAL', 'FIRM'], eligibleTenants: [], effectiveFrom: '2026-07-01T00:00:00+05:30', updatedBy: 'Platform Admin', updatedAt: '2026-07-01T09:00:00+05:30', internalReason: 'Seed', productionGated: false },
  { key: 'ai_credits', displayName: 'AI Credits', description: 'The AI Credits commercialization system.', enabled: true, environment: 'All', eligiblePlans: [], eligibleTenants: [], effectiveFrom: '2026-07-01T00:00:00+05:30', updatedBy: 'Platform Admin', updatedAt: '2026-07-01T09:00:00+05:30', internalReason: 'Seed', productionGated: false },
  { key: 'litigant_portal', displayName: 'Litigant Portal', description: 'A separate litigant-facing account experience.', enabled: false, environment: 'All', eligiblePlans: [], eligibleTenants: [], effectiveFrom: '2026-07-01T00:00:00+05:30', updatedBy: 'Platform Admin', updatedAt: '2026-07-01T09:00:00+05:30', internalReason: 'Not yet built.', productionGated: false },
  { key: 'change_of_advocate', displayName: 'Change of Advocate', description: 'The paid change-of-advocate workflow.', enabled: false, environment: 'All', eligiblePlans: [], eligibleTenants: [], effectiveFrom: '2026-07-01T00:00:00+05:30', updatedBy: 'Platform Admin', updatedAt: '2026-07-01T09:00:00+05:30', internalReason: 'Not yet built — explicitly deferred.', productionGated: false },
  { key: 'real_payments', displayName: 'Real Payments', description: 'Live payment processing beyond the existing wallet top-up.', enabled: false, environment: 'Production', eligiblePlans: [], eligibleTenants: [], effectiveFrom: '2026-07-01T00:00:00+05:30', updatedBy: 'Platform Admin', updatedAt: '2026-07-01T09:00:00+05:30', internalReason: 'Requires real financial/compliance review before enabling.', productionGated: true },
  { key: 'notifications', displayName: 'Notifications', description: 'In-app and email notification delivery.', enabled: true, environment: 'All', eligiblePlans: [], eligibleTenants: [], effectiveFrom: '2026-07-01T00:00:00+05:30', updatedBy: 'Platform Admin', updatedAt: '2026-07-01T09:00:00+05:30', internalReason: 'Seed', productionGated: false },
  { key: 'judgment_research', displayName: 'Judgment Research', description: 'External judgment/citation research surface (JudgmentProvider architecture).', enabled: false, environment: 'All', eligiblePlans: [], eligibleTenants: [], effectiveFrom: '2026-07-22T00:00:00+05:30', updatedBy: 'Platform Admin', updatedAt: '2026-07-22T00:00:00+05:30', internalReason: 'Architecture-only milestone — only the placeholder provider is registered, so enabling this flag does not connect any external judgment source.', productionGated: false },
];

export function getFeatureFlags(): FeatureFlag[] {
  return readStore(FLAGS_KEY, SEED_FLAGS);
}

/** Production-gated flags (e.g. Real Payments) cannot be flipped on from
 * this UI alone — "Do not permit unsafe production-only features to be
 * enabled merely through frontend state." */
export function setFlagEnabled(key: string, enabled: boolean, adminActor: string, reason: string): { ok: boolean; reason?: string } {
  const flags = getFeatureFlags();
  const idx = flags.findIndex((f) => f.key === key);
  if (idx === -1) return { ok: false, reason: 'Flag not found.' };
  const previous = flags[idx];
  if (enabled && previous.productionGated) {
    return { ok: false, reason: 'This flag guards a real production integration and cannot be enabled from the Admin Panel alone.' };
  }
  const updated = { ...previous, enabled, updatedBy: adminActor, updatedAt: new Date().toISOString(), internalReason: reason || previous.internalReason };
  writeStore(FLAGS_KEY, [...flags.slice(0, idx), updated, ...flags.slice(idx + 1)]);
  recordAuditEvent({
    actor: adminActor, actorRole: 'PLATFORM_ADMIN', tenantId: null,
    target: `Feature Flag ${previous.displayName}`, action: enabled ? 'Feature flag enabled' : 'Feature flag disabled',
    previousValue: String(previous.enabled), newValue: String(enabled), reason: reason || 'Admin toggle', sessionRef: null, result: 'SUCCESS',
  });
  return { ok: true };
}
