'use client';

import { readStore, writeStore } from './store-utils';
import { recordAuditEvent } from './audit-log';

export interface IntegrationStatus {
  id: string;
  name: string;
  category: string;
  environment: 'Production' | 'Sandbox' | 'Not configured';
  enabled: boolean;
  lastSuccessfulCheck: string | null;
  lastFailure: string | null;
  configurationComplete: boolean;
  authorisationStatus: string;
  documentationLink: string;
  maskedIdentifier: string | null;
  internalNote: string;
}

const INTEGRATIONS_KEY = 'nchq-admin-integrations-v1';

/** Never stores a real secret value — only a masked identifier (last 4
 * characters at most) is ever displayed, matching "never display
 * secrets, API keys, or credentials in plaintext." */
const SEED_INTEGRATIONS: IntegrationStatus[] = [
  { id: 'int-ai', name: 'AI Provider (OpenAI / Anthropic)', category: 'AI', environment: 'Production', enabled: true, lastSuccessfulCheck: '2026-07-20T08:00:00+05:30', lastFailure: null, configurationComplete: true, authorisationStatus: 'Configured', documentationLink: 'lib/ai/llm-provider.ts', maskedIdentifier: '••••…af31', internalNote: 'Selected via AI_PROVIDER env var; real provider calls, not mock.' },
  { id: 'int-ecourts', name: 'eCourts', category: 'Legal Data', environment: 'Not configured', enabled: false, lastSuccessfulCheck: null, lastFailure: null, configurationComplete: false, authorisationStatus: 'Not yet obtained', documentationLink: 'docs/integrations/ECOURTS_AUTHORISED_INTEGRATION_PLAN.md', maskedIdentifier: null, internalNote: 'Manual advocate-assisted verification only — see eCourts Administration.' },
  { id: 'int-email', name: 'Email (Resend)', category: 'Messaging', environment: 'Not configured', enabled: false, lastSuccessfulCheck: null, lastFailure: null, configurationComplete: false, authorisationStatus: 'Not configured', documentationLink: 'lib/messaging/providers/resend-provider.ts', maskedIdentifier: null, internalNote: 'Library-only — no feature yet triggers a real send.' },
  { id: 'int-storage', name: 'Document Storage (S3-compatible)', category: 'Storage', environment: 'Sandbox', enabled: true, lastSuccessfulCheck: '2026-07-19T09:00:00+05:30', lastFailure: null, configurationComplete: true, authorisationStatus: 'Configured', documentationLink: 'lib/documents', maskedIdentifier: '••••…9b2c', internalNote: 'Sandbox bucket only in this environment.' },
  { id: 'int-ocr', name: 'OCR Pipeline', category: 'Document Processing', environment: 'Not configured', enabled: false, lastSuccessfulCheck: null, lastFailure: null, configurationComplete: false, authorisationStatus: 'Not configured', documentationLink: '', maskedIdentifier: null, internalNote: 'Not yet built.' },
  { id: 'int-payments', name: 'Payment Gateway (Stripe)', category: 'Billing', environment: 'Sandbox', enabled: true, lastSuccessfulCheck: '2026-07-15T09:00:00+05:30', lastFailure: null, configurationComplete: true, authorisationStatus: 'Configured', documentationLink: 'lib/billing/providers/stripe-provider.ts', maskedIdentifier: '••••…7f4e', internalNote: 'Wallet top-up only — no subscription billing yet.' },
  { id: 'int-sms', name: 'SMS (Twilio)', category: 'Messaging', environment: 'Not configured', enabled: false, lastSuccessfulCheck: null, lastFailure: null, configurationComplete: false, authorisationStatus: 'Not configured', documentationLink: 'lib/messaging/providers/twilio-provider.ts', maskedIdentifier: null, internalNote: 'Library-only — no feature yet triggers a real send.' },
  { id: 'int-monitoring', name: 'Error Monitoring', category: 'Observability', environment: 'Not configured', enabled: false, lastSuccessfulCheck: null, lastFailure: null, configurationComplete: false, authorisationStatus: 'Not configured', documentationLink: '', maskedIdentifier: null, internalNote: 'Not yet integrated.' },
];

export function getIntegrations(): IntegrationStatus[] {
  return readStore(INTEGRATIONS_KEY, SEED_INTEGRATIONS);
}

export function setIntegrationEnabled(id: string, enabled: boolean, adminActor: string): void {
  const integrations = getIntegrations();
  const idx = integrations.findIndex((i) => i.id === id);
  if (idx === -1) return;
  const previous = integrations[idx];
  const updated = { ...previous, enabled };
  writeStore(INTEGRATIONS_KEY, [...integrations.slice(0, idx), updated, ...integrations.slice(idx + 1)]);
  recordAuditEvent({
    actor: adminActor, actorRole: 'PLATFORM_ADMIN', tenantId: null,
    target: `Integration ${previous.name}`, action: enabled ? 'Integration enabled' : 'Integration disabled',
    previousValue: String(previous.enabled), newValue: String(enabled), reason: 'Admin toggle', sessionRef: null, result: 'SUCCESS',
  });
}
