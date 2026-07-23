import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';

/**
 * "Can't find your court?" — an advocate reports a missing or incorrect
 * court in the eCourts registry (lib/ecourts-registry/). This is a
 * candidate correction, never an automatic edit: it lands in a review
 * queue (status OPEN) for a human to verify against a real source before
 * it's folded into a future registry update, via the same process
 * docs/knowledge-base/CONTRIBUTING_COURT_DATA.md already describes for
 * every existing entry.
 */

const REPORT_STATUSES = ['OPEN', 'REVIEWED', 'INCORPORATED', 'DISMISSED'] as const;

interface CourtDataReportRow {
  id: string;
  court_system_id: string | null;
  state: string | null;
  district: string | null;
  court_establishment: string | null;
  court_name: string;
  comments: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const CreateCourtDataReportSchema = z.object({
  court_system_id: z.string().max(100).nullable().optional(),
  state: z.string().max(200).nullable().optional(),
  district: z.string().max(200).nullable().optional(),
  court_establishment: z.string().max(300).nullable().optional(),
  court_name: z.string().min(1).max(300),
  comments: z.string().max(2000).nullable().optional(),
});

const ListQuerySchema = z.object({
  status: z.enum(REPORT_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
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

export async function POST(request: NextRequest) {
  try {
    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403 });
    }

    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json({ error: 'SECURE_ACCESS_DENIED', message: 'Authentication required.' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Malformed JSON body.' }, { status: 400 });
    }

    const result = CreateCourtDataReportSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid court data report payload.', details: result.error.format() },
        { status: 400 }
      );
    }
    const input = result.data;

    const db = new DatabaseClient();
    const rows = await db.execute<CourtDataReportRow>(
      session.tenantId,
      `INSERT INTO "CourtDataReport"
         (tenant_id, user_id, court_system_id, state, district, court_establishment, court_name, comments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, court_system_id, state, district, court_establishment, court_name, comments, status, created_at, updated_at`,
      [
        session.tenantId,
        session.sub,
        input.court_system_id ?? null,
        input.state ?? null,
        input.district ?? null,
        input.court_establishment ?? null,
        input.court_name,
        input.comments ?? null,
      ]
    );

    return NextResponse.json({ court_data_report: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[COURT_DATA_REPORTS_API] POST /api/court-data-reports failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json({ error: 'SECURE_ACCESS_DENIED', message: 'Authentication required.' }, { status: 401 });
    }

    const parsed = ListQuerySchema.safeParse({
      status: request.nextUrl.searchParams.get('status') ?? undefined,
      limit: request.nextUrl.searchParams.get('limit') ?? undefined,
      offset: request.nextUrl.searchParams.get('offset') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid query parameters.', details: parsed.error.format() },
        { status: 400 }
      );
    }
    const { status, limit, offset } = parsed.data;

    const conditions: string[] = [];
    const values: unknown[] = [];
    if (status) {
      values.push(status);
      conditions.push(`status = $${values.length}`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(limit, offset);

    const db = new DatabaseClient();
    const rows = await db.execute<CourtDataReportRow>(
      session.tenantId,
      `SELECT id, court_system_id, state, district, court_establishment, court_name, comments, status, created_at, updated_at
       FROM "CourtDataReport"
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    return NextResponse.json({ court_data_reports: rows }, { status: 200 });
  } catch (error) {
    console.error('[COURT_DATA_REPORTS_API] GET /api/court-data-reports failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
