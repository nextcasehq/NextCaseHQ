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
  category: string;
  status: string;
  storage_structure: Record<string, unknown>;
  created_at: string;
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
    const filters: string[] = [];
    const countParams: unknown[] = [];
    if (case_id) {
      countParams.push(case_id);
      filters.push(`case_id = $${countParams.length}`);
    }
    if (matter_id) {
      countParams.push(matter_id);
      filters.push(`matter_id = $${countParams.length}`);
    }
    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const listParams: unknown[] = [...countParams, limit, offset];

    const [rows, countRows] = await Promise.all([
      db.execute<DocumentEnvelopeRow>(
        session.tenantId,
        `SELECT id, tenant_id, case_id, matter_id, title, category, status, storage_structure, created_at
         FROM "DocumentEnvelope"
         ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${countParams.length + 1} OFFSET $${countParams.length + 2}`,
        listParams
      ),
      db.execute<{ count: number }>(
        session.tenantId,
        `SELECT COUNT(*)::int AS count FROM "DocumentEnvelope" ${whereClause}`,
        countParams
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
