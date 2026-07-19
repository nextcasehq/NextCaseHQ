import { DatabaseClient } from '@/lib/db/db-client';

export type DocumentAccessAction = 'PREVIEW' | 'DOWNLOAD';

export interface RecordDocumentAccessEventInput {
  tenantId: string;
  userId: string | null;
  envelopeId: string;
  versionId?: string | null;
  versionNumber?: number | null;
  action: DocumentAccessAction;
  correlationId?: string | null;
}

/**
 * Durable, append-only preview/download audit trail (Sprint 3B, PR 3B-2).
 * INSERT-only by database grant, not just convention — see the REVOKE on
 * "DocumentAccessEvent" in db/schema.sql, the same real restriction
 * AiUsageEvent already uses. Deliberately stores only who/what/when: no
 * file contents, extracted text, or any other document-derived data ever
 * reaches this table.
 *
 * Never throws — a failure to record an access event must never block the
 * preview/download it's describing, matching the same fail-open posture
 * already established by recordAiUsageEvent() and the context cache.
 */
export async function recordDocumentAccessEvent(input: RecordDocumentAccessEventInput): Promise<void> {
  try {
    const db = new DatabaseClient();
    await db.execute(
      input.tenantId,
      `INSERT INTO "DocumentAccessEvent"
         (tenant_id, user_id, envelope_id, version_id, version_number, action, correlation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.tenantId,
        input.userId,
        input.envelopeId,
        input.versionId ?? null,
        input.versionNumber ?? null,
        input.action,
        input.correlationId ?? null,
      ]
    );
  } catch (error) {
    console.error('[DOCUMENT_AUDIT] failed to record access event:', (error as Error).message);
  }
}

/**
 * Reads whichever request-correlation header the caller (or the hosting
 * platform) happened to supply — never fabricated when absent, since a
 * synthetic id would misrepresent this field's meaning as a real,
 * caller-supplied correlation identifier.
 */
export function extractCorrelationId(request: { headers: { get(name: string): string | null } }): string | null {
  return request.headers.get('x-request-id') ?? request.headers.get('x-vercel-id') ?? null;
}
