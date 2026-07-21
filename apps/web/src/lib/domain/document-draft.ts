/**
 * The mutable working-draft record an advocate's typed content is
 * autosaved into, per docs/document-creator/DOCUMENT_AUTOSAVE_SPECIFICATION.md.
 * Deliberately not append-only (unlike MatterClosureRecord/MatterAuditEvent) —
 * see db/schema.sql's DocumentDraft table comment for the full rationale.
 */

import { DOCUMENT_TYPES } from './document-type';

export const DOCUMENT_DRAFT_TYPE_SLUGS = DOCUMENT_TYPES.map((t) => t.slug);

export interface DocumentDraft {
  id: string;
  tenant_id: string;
  user_id: string;
  matter_id: string | null;
  envelope_id: string | null;
  document_type: string | null;
  title: string | null;
  content: string;
  revision: number;
  created_at: string;
  updated_at: string;
}

export const DRAFT_COLUMNS =
  'id, tenant_id, user_id, matter_id, envelope_id, document_type, title, content, revision, created_at, updated_at';
