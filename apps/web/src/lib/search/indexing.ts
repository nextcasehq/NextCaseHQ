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
  | { status: 'SKIPPED'; reason: 'UNSUPPORTED_CONTENT_TYPE' | 'NO_STORED_OBJECT' };

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

/**
 * Chunks a DocumentEnvelope's stored object, generates embeddings through
 * the provider abstraction, and persists searchable DocumentChunkVector
 * rows. RLS-scoped throughout via DatabaseClient.execute(tenantId, ...) —
 * a document belonging to another tenant simply isn't found, never leaked.
 *
 * OCR/parsing/AI-enrichment can plug into this pipeline later purely by
 * extending extractPlainText — the chunking, embedding, and persistence
 * steps here don't need to change.
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
  if (!objectKey) {
    return { status: 'SKIPPED', reason: 'NO_STORED_OBJECT' };
  }

  if (!isObjectStorageConfigured()) {
    throw new ObjectStorageNotConfiguredError('Object storage is not configured on this server.');
  }

  const object = await getObject(objectKey);
  const text = extractPlainText(object.buffer, object.contentType);
  if (text === null) {
    return { status: 'SKIPPED', reason: 'UNSUPPORTED_CONTENT_TYPE' };
  }

  const chunks = chunkText(text);
  const provider = getEmbeddingProvider();

  // Re-indexing replaces prior chunks outright rather than diffing —
  // simplest correct behavior at this data volume.
  await db.execute(tenantId, `DELETE FROM "DocumentChunkVector" WHERE envelope_id = $1`, [envelopeId]);

  for (let i = 0; i < chunks.length; i++) {
    const embedding = await provider.generateEmbedding(chunks[i]);
    await db.execute(
      tenantId,
      `INSERT INTO "DocumentChunkVector" (tenant_id, envelope_id, chunk_index, content, embedding, vector_array, metadata)
       VALUES ($1, $2, $3, $4, $5::vector, $6, $7)`,
      [tenantId, envelopeId, i, chunks[i], toVectorLiteral(embedding), [], { embedding_provider: provider.name }]
    );
  }

  return { status: 'INDEXED', chunksIndexed: chunks.length, provider: provider.name };
}
