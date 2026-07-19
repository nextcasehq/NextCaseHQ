import { DatabaseClient } from '@/lib/db/db-client';
import { getObject, isObjectStorageConfigured } from '@/lib/storage/object-storage';
import { extractPlainText } from './text-extraction';
import { chunkText } from './chunking';
import { getEmbeddingProvider } from './embedding-provider';
import { toVectorLiteral } from './vector-format';

interface DocumentEnvelopeRow {
  id: string;
  storage_structure: { object_key?: string; content_type?: string } | null;
}

export type IndexDocumentResult =
  | { status: 'INDEXED'; chunksIndexed: number; provider: string }
  | { status: 'SKIPPED'; reason: 'UNSUPPORTED_CONTENT_TYPE' | 'NO_STORED_OBJECT' }
  | { status: 'FAILED'; error: string };

export class DocumentNotFoundError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, DocumentNotFoundError.prototype);
  }
}

export class ObjectStorageNotConfiguredError extends Error {
  constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, ObjectStorageNotConfiguredError.prototype);
  }
}

const MAX_STORED_ERROR_LENGTH = 2000;

/**
 * Persists the minimal indexing-status model (Sprint 3, PR 3B-1):
 * NOT_INDEXED / INDEXING / INDEXED / FAILED, plus which version the
 * current chunks (if any) actually came from. indexedVersionNumber/error
 * are only written when explicitly provided, so a transitional 'INDEXING'
 * update doesn't clobber a still-relevant prior value mid-flight.
 */
async function setIndexStatus(
  db: DatabaseClient,
  tenantId: string,
  envelopeId: string,
  fields: { status: 'NOT_INDEXED' | 'INDEXING' | 'INDEXED' | 'FAILED'; indexedVersionNumber?: number | null; error?: string | null }
): Promise<void> {
  const setClauses = [`"index_status" = $1`, `"index_updated_at" = now()`];
  const values: unknown[] = [fields.status];
  let paramIndex = 2;

  if (Object.prototype.hasOwnProperty.call(fields, 'indexedVersionNumber')) {
    setClauses.push(`"indexed_version_number" = $${paramIndex}`);
    values.push(fields.indexedVersionNumber ?? null);
    paramIndex += 1;
  }
  if (Object.prototype.hasOwnProperty.call(fields, 'error')) {
    setClauses.push(`"index_error" = $${paramIndex}`);
    values.push(fields.error ? fields.error.slice(0, MAX_STORED_ERROR_LENGTH) : null);
    paramIndex += 1;
  }
  values.push(envelopeId);

  await db.execute(tenantId, `UPDATE "DocumentEnvelope" SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`, values);
}

/**
 * Chunks a DocumentEnvelope's stored object, generates embeddings through
 * the provider abstraction, and persists searchable DocumentChunkVector
 * rows. RLS-scoped throughout via DatabaseClient.execute(tenantId, ...) —
 * a document belonging to another tenant simply isn't found, never leaked.
 *
 * OCR/parsing/AI-enrichment can plug into this pipeline later purely by
 * extending extractPlainText — the chunking, embedding, and persistence
 * steps here don't need to change.
 *
 * Invalidation is unconditional and happens first, before any type or
 * configuration check: whatever chunks a prior version (or a prior
 * attempt) left behind are deleted the instant this function runs, so a
 * document's search results can never keep describing content that is no
 * longer current — even if this attempt goes on to skip, fail, or
 * otherwise produce nothing new (Sprint 3B, PR 3B-1).
 */
export async function indexDocument(tenantId: string, envelopeId: string): Promise<IndexDocumentResult> {
  const db = new DatabaseClient();

  const rows = await db.execute<DocumentEnvelopeRow>(
    tenantId,
    `SELECT id, storage_structure FROM "DocumentEnvelope" WHERE id = $1`,
    [envelopeId]
  );
  if (rows.length === 0) {
    throw new DocumentNotFoundError(`No accessible DocumentEnvelope with id ${envelopeId}`);
  }

  const objectKey = rows[0].storage_structure?.object_key;

  // Unconditional — see the function-level note above.
  await db.execute(tenantId, `DELETE FROM "DocumentChunkVector" WHERE envelope_id = $1`, [envelopeId]);

  if (!objectKey) {
    await setIndexStatus(db, tenantId, envelopeId, { status: 'NOT_INDEXED', indexedVersionNumber: null, error: null });
    return { status: 'SKIPPED', reason: 'NO_STORED_OBJECT' };
  }

  if (!isObjectStorageConfigured()) {
    throw new ObjectStorageNotConfiguredError('Object storage is not configured on this server.');
  }

  await setIndexStatus(db, tenantId, envelopeId, { status: 'INDEXING' });

  let text: string | null;
  try {
    const object = await getObject(objectKey);
    text = extractPlainText(object.buffer, object.contentType);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error while reading the stored object.';
    await setIndexStatus(db, tenantId, envelopeId, { status: 'FAILED', error: message });
    return { status: 'FAILED', error: message };
  }

  if (text === null) {
    await setIndexStatus(db, tenantId, envelopeId, { status: 'NOT_INDEXED', indexedVersionNumber: null, error: null });
    return { status: 'SKIPPED', reason: 'UNSUPPORTED_CONTENT_TYPE' };
  }

  const chunks = chunkText(text);
  const provider = getEmbeddingProvider();

  try {
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await provider.generateEmbedding(chunks[i]);
      await db.execute(
        tenantId,
        `INSERT INTO "DocumentChunkVector" (tenant_id, envelope_id, chunk_index, content, embedding, vector_array, metadata)
         VALUES ($1, $2, $3, $4, $5::vector, $6, $7)`,
        [tenantId, envelopeId, i, chunks[i], toVectorLiteral(embedding), [], { embedding_provider: provider.name }]
      );
    }
  } catch (error) {
    // Never leave a silently truncated index behind — a partial set of
    // new chunks is worse than none, since it looks complete to a caller.
    await db.execute(tenantId, `DELETE FROM "DocumentChunkVector" WHERE envelope_id = $1`, [envelopeId]);
    const message = error instanceof Error ? error.message : 'Unknown embedding/indexing error.';
    await setIndexStatus(db, tenantId, envelopeId, { status: 'FAILED', error: message });
    return { status: 'FAILED', error: message };
  }

  const versionRows = await db.execute<{ version_number: number | null }>(
    tenantId,
    `SELECT MAX(version_number) AS version_number FROM "DocumentVersion" WHERE envelope_id = $1`,
    [envelopeId]
  );
  const indexedVersionNumber = versionRows[0]?.version_number ?? null;

  await setIndexStatus(db, tenantId, envelopeId, { status: 'INDEXED', indexedVersionNumber, error: null });

  return { status: 'INDEXED', chunksIndexed: chunks.length, provider: provider.name };
}
