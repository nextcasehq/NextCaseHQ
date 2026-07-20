'use client';

import { readStore, writeStore, genId } from './store-utils';
import { recordAuditEvent } from './audit-log';

export const TEMPLATE_CATEGORIES = [
  'Legal notice', 'Affidavit', 'Petition', 'Application', 'Written statement', 'Agreement', 'Legal opinion', 'Written arguments', 'Hearing notes', 'Custom firm template',
] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export interface DocumentTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  scope: 'Global' | 'Firm-specific';
  firmId: string | null;
  enabled: boolean;
  version: number;
  effectiveFrom: string;
  jurisdiction: string;
  courtLevel: string;
  documentType: string;
  updatedBy: string;
  updatedAt: string;
}

const TEMPLATES_KEY = 'nchq-admin-templates-v1';

const SEED_TEMPLATES: DocumentTemplate[] = [
  { id: 'tpl-001', name: 'Standard Legal Notice', category: 'Legal notice', scope: 'Global', firmId: null, enabled: true, version: 3, effectiveFrom: '2026-06-01T00:00:00+05:30', jurisdiction: 'India', courtLevel: 'All', documentType: 'Notice', updatedBy: 'Platform Admin', updatedAt: '2026-06-01T09:00:00+05:30' },
  { id: 'tpl-002', name: 'Affidavit of Evidence', category: 'Affidavit', scope: 'Global', firmId: null, enabled: true, version: 2, effectiveFrom: '2026-05-10T00:00:00+05:30', jurisdiction: 'India', courtLevel: 'Civil Court', documentType: 'Affidavit', updatedBy: 'Platform Admin', updatedAt: '2026-05-10T09:00:00+05:30' },
  { id: 'tpl-003', name: 'Writ Petition (Article 226)', category: 'Petition', scope: 'Global', firmId: null, enabled: true, version: 1, effectiveFrom: '2026-04-01T00:00:00+05:30', jurisdiction: 'India', courtLevel: 'High Court', documentType: 'Petition', updatedBy: 'Platform Admin', updatedAt: '2026-04-01T09:00:00+05:30' },
  { id: 'tpl-004', name: 'Bail Application', category: 'Application', scope: 'Global', firmId: null, enabled: true, version: 2, effectiveFrom: '2026-03-15T00:00:00+05:30', jurisdiction: 'India', courtLevel: 'Sessions Court', documentType: 'Application', updatedBy: 'Platform Admin', updatedAt: '2026-03-15T09:00:00+05:30' },
  { id: 'tpl-005', name: 'Sharma & Associates — Firm Letterhead Agreement', category: 'Custom firm template', scope: 'Firm-specific', firmId: 'demo-tenant-firm', enabled: true, version: 1, effectiveFrom: '2026-02-01T00:00:00+05:30', jurisdiction: 'India', courtLevel: 'All', documentType: 'Agreement', updatedBy: 'Adv. Rohit Agarwal', updatedAt: '2026-02-01T09:00:00+05:30' },
  { id: 'tpl-006', name: 'Written Arguments — Civil Suit', category: 'Written arguments', scope: 'Global', firmId: null, enabled: false, version: 1, effectiveFrom: '2026-01-05T00:00:00+05:30', jurisdiction: 'India', courtLevel: 'Civil Court', documentType: 'Written arguments', updatedBy: 'Platform Admin', updatedAt: '2026-06-20T09:00:00+05:30' },
];

export function getTemplates(): DocumentTemplate[] {
  return readStore(TEMPLATES_KEY, SEED_TEMPLATES);
}

function saveTemplates(templates: DocumentTemplate[]): void {
  writeStore(TEMPLATES_KEY, templates);
}

export function setTemplateEnabled(id: string, enabled: boolean, adminActor: string): void {
  const templates = getTemplates();
  const idx = templates.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const previous = templates[idx];
  const updated = { ...previous, enabled, updatedBy: adminActor, updatedAt: new Date().toISOString() };
  saveTemplates([...templates.slice(0, idx), updated, ...templates.slice(idx + 1)]);
  recordAuditEvent({
    actor: adminActor, actorRole: 'PLATFORM_ADMIN', tenantId: previous.firmId,
    target: `Template ${previous.name}`, action: enabled ? 'Template enabled' : 'Template disabled',
    previousValue: String(previous.enabled), newValue: String(enabled), reason: 'Admin toggle', sessionRef: null, result: 'SUCCESS',
  });
}

/** Publishing a new version never overwrites the previous one's history —
 * it appends a new template row referencing the same name/category at an
 * incremented version, and the prior version's row is left untouched. */
export function publishNewVersion(id: string, adminActor: string): DocumentTemplate | null {
  const templates = getTemplates();
  const previous = templates.find((t) => t.id === id);
  if (!previous) return null;
  const next: DocumentTemplate = { ...previous, id: genId('tpl'), version: previous.version + 1, updatedBy: adminActor, updatedAt: new Date().toISOString() };
  saveTemplates([next, ...templates]);
  recordAuditEvent({
    actor: adminActor, actorRole: 'PLATFORM_ADMIN', tenantId: previous.firmId,
    target: `Template ${previous.name}`, action: 'Template publication',
    previousValue: `v${previous.version}`, newValue: `v${next.version}`, reason: 'New version published', sessionRef: null, result: 'SUCCESS',
  });
  return next;
}
