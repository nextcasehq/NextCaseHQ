import { DatabaseClient, closePool } from '@/lib/db/db-client';
import { putObject, deleteObject } from '@/lib/storage/object-storage';
import { indexDocument, DocumentNotFoundError } from '../indexing';

const TENANT_A = '00000000-0000-4000-8000-000000000f01';
const TENANT_B = '00000000-0000-4000-8000-000000000f02';

const hasS3 = () => Boolean(process.env.S3_ENDPOINT);

describe('indexDocument', () => {
  const db = new DatabaseClient();
  const uploadedObjectKeys: string[] = [];

  beforeAll(async () => {
    await db.execute(TENANT_A, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_A,
      'Indexing Test Tenant A',
    ]);
    await db.execute(TENANT_B, `INSERT INTO "Tenant" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [
      TENANT_B,
      'Indexing Test Tenant B',
    ]);
  });

  afterAll(async () => {
    await Promise.all(uploadedObjectKeys.map((key) => deleteObject(key).catch(() => {})));
    await db.execute(TENANT_A, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_A]);
    await db.execute(TENANT_B, `DELETE FROM "DocumentEnvelope" WHERE tenant_id = $1`, [TENANT_B]);
    await closePool();
  });

  async function createDocumentWithRealObject(
    tenantId: string,
    content: string,
    contentType = 'text/plain'
  ): Promise<string> {
    const documentId = crypto.randomUUID();
    const objectKey = `${tenantId}/${documentId}/file`;
    await putObject(objectKey, Buffer.from(content), contentType);
    uploadedObjectKeys.push(objectKey);

    await db.execute(
      tenantId,
      `INSERT INTO "DocumentEnvelope" (id, tenant_id, title, storage_structure)
       VALUES ($1, $2, $3, $4)`,
      [documentId, tenantId, 'file', { object_key: objectKey, content_type: contentType }]
    );
    return documentId;
  }

  test('throws DocumentNotFoundError for a nonexistent document', async () => {
    await expect(indexDocument(TENANT_A, crypto.randomUUID())).rejects.toBeInstanceOf(DocumentNotFoundError);
  });

  test('throws DocumentNotFoundError for a document belonging to a different tenant', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithRealObject(TENANT_A, 'private to tenant A');
    await expect(indexDocument(TENANT_B, id)).rejects.toBeInstanceOf(DocumentNotFoundError);
  });

  test('skips with NO_STORED_OBJECT when the envelope has no object_key', async () => {
    const documentId = crypto.randomUUID();
    await db.execute(
      TENANT_A,
      `INSERT INTO "DocumentEnvelope" (id, tenant_id, title, storage_structure) VALUES ($1, $2, $3, $4)`,
      [documentId, TENANT_A, 'legacy.txt', { storage_provider: 'pending' }]
    );
    const result = await indexDocument(TENANT_A, documentId);
    expect(result).toEqual({ status: 'SKIPPED', reason: 'NO_STORED_OBJECT' });
  });

  test('skips with UNSUPPORTED_CONTENT_TYPE for a non-plain-text object', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithRealObject(TENANT_A, '%PDF-1.4 fake', 'application/pdf');
    const result = await indexDocument(TENANT_A, id);
    expect(result).toEqual({ status: 'SKIPPED', reason: 'UNSUPPORTED_CONTENT_TYPE' });
  });

  test('indexes a plain-text document into real, tenant-scoped DocumentChunkVector rows', async () => {
    if (!hasS3()) return;
    const content = 'The plaintiff alleges breach of contract. '.repeat(50);
    const id = await createDocumentWithRealObject(TENANT_A, content);

    const result = await indexDocument(TENANT_A, id);
    expect(result.status).toBe('INDEXED');
    if (result.status !== 'INDEXED') throw new Error('unreachable');
    expect(result.chunksIndexed).toBeGreaterThan(0);
    expect(result.provider).toBe('local-hashing');

    const rows = await db.execute<{ chunk_index: number; content: string; tenant_id: string }>(
      TENANT_A,
      `SELECT chunk_index, content, tenant_id FROM "DocumentChunkVector" WHERE envelope_id = $1 ORDER BY chunk_index`,
      [id]
    );
    expect(rows).toHaveLength(result.chunksIndexed);
    expect(rows.every((row) => row.tenant_id === TENANT_A)).toBe(true);

    // Not visible from another tenant's RLS-scoped connection, even though
    // the row's envelope_id FK technically points at a real envelope.
    const rowsFromOtherTenant = await db.execute(
      TENANT_B,
      `SELECT id FROM "DocumentChunkVector" WHERE envelope_id = $1`,
      [id]
    );
    expect(rowsFromOtherTenant).toHaveLength(0);
  });

  test('re-indexing replaces prior chunks rather than appending to them', async () => {
    if (!hasS3()) return;
    const id = await createDocumentWithRealObject(TENANT_A, 'short document body');
    const first = await indexDocument(TENANT_A, id);
    const second = await indexDocument(TENANT_A, id);
    expect(first.status).toBe('INDEXED');
    expect(second.status).toBe('INDEXED');

    const rows = await db.execute(TENANT_A, `SELECT id FROM "DocumentChunkVector" WHERE envelope_id = $1`, [id]);
    if (second.status === 'INDEXED') {
      expect(rows).toHaveLength(second.chunksIndexed);
    }
  });
});
