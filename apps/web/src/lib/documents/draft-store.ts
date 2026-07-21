import { DatabaseClient } from '@/lib/db/db-client';
import { DRAFT_COLUMNS, type DocumentDraft } from '@/lib/domain/document-draft';

/**
 * Server-side data access for DocumentDraft (Document Creator Phase 2 —
 * durable draft and continuous autosave). Every function here is
 * tenant-scoped via DatabaseClient (RLS) AND owner-scoped by user_id — a
 * draft is a personal working copy, not a tenant-shared record, so a
 * different user in the same tenant gets NOT_FOUND rather than a
 * distinguishable "forbidden" response, avoiding an existence-leak.
 */

export class DraftNotFoundError extends Error {
  constructor(message = 'Draft not found.') {
    super(message);
    Object.setPrototypeOf(this, DraftNotFoundError.prototype);
  }
}

export class DraftRevisionConflictError extends Error {
  constructor(public readonly current: DocumentDraft) {
    super('The draft has been updated since this revision was last read.');
    Object.setPrototypeOf(this, DraftRevisionConflictError.prototype);
  }
}

export interface CreateDraftInput {
  matterId: string | null;
  documentType: string | null;
  title: string | null;
  content: string;
}

export async function createDraft(
  tenantId: string,
  userId: string,
  input: CreateDraftInput
): Promise<DocumentDraft> {
  const db = new DatabaseClient();
  const rows = await db.execute<DocumentDraft>(
    tenantId,
    `INSERT INTO "DocumentDraft" (tenant_id, user_id, matter_id, document_type, title, content)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${DRAFT_COLUMNS}`,
    [tenantId, userId, input.matterId, input.documentType, input.title, input.content]
  );
  return rows[0];
}

export async function getDraft(tenantId: string, userId: string, draftId: string): Promise<DocumentDraft> {
  const db = new DatabaseClient();
  const rows = await db.execute<DocumentDraft>(
    tenantId,
    `SELECT ${DRAFT_COLUMNS} FROM "DocumentDraft" WHERE id = $1 AND user_id = $2`,
    [draftId, userId]
  );
  if (rows.length === 0) {
    throw new DraftNotFoundError();
  }
  return rows[0];
}

export interface AutosaveDraftInput {
  content: string;
  title: string | null;
  expectedRevision: number;
}

/**
 * Optimistic-concurrency write: the UPDATE's WHERE clause itself performs
 * the compare-and-swap (revision = expectedRevision), so there is no
 * read-then-write race between two concurrent autosave requests for the
 * same draft. A zero-row result means either the draft doesn't exist (or
 * isn't owned by this user — DraftNotFoundError) or the revision has
 * already moved (DraftRevisionConflictError, carrying the current server
 * state so the caller can show "Conflict Detected" rather than guessing).
 */
export async function autosaveDraft(
  tenantId: string,
  userId: string,
  draftId: string,
  input: AutosaveDraftInput
): Promise<DocumentDraft> {
  const db = new DatabaseClient();
  const updated = await db.execute<DocumentDraft>(
    tenantId,
    `UPDATE "DocumentDraft"
     SET content = $1, title = $2, revision = revision + 1, updated_at = now()
     WHERE id = $3 AND user_id = $4 AND revision = $5
     RETURNING ${DRAFT_COLUMNS}`,
    [input.content, input.title, draftId, userId, input.expectedRevision]
  );
  if (updated.length > 0) {
    return updated[0];
  }

  // The CAS didn't match — figure out why, to return the right error.
  const current = await db.execute<DocumentDraft>(
    tenantId,
    `SELECT ${DRAFT_COLUMNS} FROM "DocumentDraft" WHERE id = $1 AND user_id = $2`,
    [draftId, userId]
  );
  if (current.length === 0) {
    throw new DraftNotFoundError();
  }
  throw new DraftRevisionConflictError(current[0]);
}
