import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { DatabaseClient } from '@/lib/db/db-client';

/**
 * Real DocumentEnvelope listing — metadata only (see
 * /api/documents/upload for how rows are created; object storage for the
 * actual file bytes is a separate, not-yet-started milestone).
 *
 * Tenant identity comes exclusively from the verified session cookie,
 * same rule as every other real domain route in this app.
 */

interface DocumentEnvelopeRow {
  id: string;
  tenant_id: string;
  case_id: string | null;
  matter_id: string | null;
  title: string;
  storage_structure: Record<string, unknown>;
  created_at: string;
  index_status: string;
  indexed_version_number: number | null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 100;

const ListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).optional().default(DEFAULT_PAGE_LIMIT),
  offset: z.coerce.number().int().min(0).optional().default(0),
  case_id: z.string().regex(UUID_PATTERN).optional(),
  matter_id: z.string().regex(UUID_PATTERN).optional(),
});

async function resolveSession(request: NextRequest) {
  try {
    return await requireSession(request);
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      return null;
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'SECURE_ACCESS_DENIED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const queryResult = ListQuerySchema.safeParse({
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      offset: request.nextUrl.searchParams.get('offset') ?? undefined,
      case_id: request.nextUrl.searchParams.get('case_id') ?? undefined,
      matter_id: request.nextUrl.searchParams.get('matter_id') ?? undefined,
    });
    if (!queryResult.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid query parameters.', details: queryResult.error.format() },
        { status: 400 }
      );
    }
    const { limit, offset, case_id, matter_id } = queryResult.data;

    const db = new DatabaseClient();
    const conditions: string[] = [];
    const filterParams: unknown[] = [];
    if (case_id) {
      filterParams.push(case_id);
      conditions.push(`case_id = $${filterParams.length}`);
    }
    if (matter_id) {
      filterParams.push(matter_id);
      conditions.push(`matter_id = $${filterParams.length}`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const listParams = [...filterParams, limit, offset];

    const [rows, countRows] = await Promise.all([
      db.execute<DocumentEnvelopeRow>(
        session.tenantId,
        `SELECT id, tenant_id, case_id, matter_id, title, storage_structure, created_at, index_status, indexed_version_number
         FROM "DocumentEnvelope"
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2}`,
        listParams
      ),
      db.execute<{ count: number }>(
        session.tenantId,
        `SELECT COUNT(*)::int AS count FROM "DocumentEnvelope" ${whereClause}`,
        filterParams
      ),
    ]);

    return NextResponse.json(
      { documents: rows, total: countRows[0].count, limit, offset },
      { status: 200 }
    );
  } catch (error) {
    console.error('[DOCUMENTS_API] GET /api/documents failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
