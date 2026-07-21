import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { invalidateMatterContext } from '@/lib/ai/context/cache';

/**
 * Saved authorities/citations linked to a Matter Register (Production
 * Matter Register Foundation). verification_status is never accepted from
 * the client — every row this route creates is forced to 'UNVERIFIED'
 * regardless of what the caller sends, matching "do not permit synthetic
 * or unverified authorities to be marked verified without authorised
 * verification rules." A citation is reference material only, never
 * treated as factual evidence.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface ResearchAuthorityRow {
  id: string;
  tenant_id: string;
  matter_id: string;
  case_title: string;
  court: string | null;
  citation: string | null;
  decision_date: string | null;
  legal_proposition: string | null;
  source: string | null;
  verification_status: string;
  advocate_note: string | null;
  intended_use: string | null;
  related_issue: string | null;
  added_by: string | null;
  added_at: string;
}

const AUTHORITY_COLUMNS = `id, tenant_id, matter_id, case_title, court, citation, decision_date,
                           legal_proposition, source, verification_status, advocate_note, intended_use,
                           related_issue, added_by, added_at`;

const CreateAuthoritySchema = z.object({
  case_title: z.string().min(1).max(500),
  court: z.string().max(300).nullable().optional(),
  citation: z.string().max(300).nullable().optional(),
  decision_date: z.string().regex(DATE_PATTERN, 'Expected YYYY-MM-DD').nullable().optional(),
  legal_proposition: z.string().max(5000).nullable().optional(),
  source: z.string().max(300).nullable().optional(),
  advocate_note: z.string().max(5000).nullable().optional(),
  intended_use: z.string().max(500).nullable().optional(),
  related_issue: z.string().max(500).nullable().optional(),
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

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid matter id.' }, { status: 400 });
    }

    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'SECURE_ACCESS_DENIED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const db = new DatabaseClient();
    const matterRows = await db.execute<{ id: string }>(
      session.tenantId,
      `SELECT id FROM "Matter" WHERE id = $1`,
      [id]
    );
    if (matterRows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    const rows = await db.execute<ResearchAuthorityRow>(
      session.tenantId,
      `SELECT ${AUTHORITY_COLUMNS} FROM "MatterResearchAuthority" WHERE matter_id = $1 ORDER BY added_at DESC`,
      [id]
    );

    return NextResponse.json({ authorities: rows }, { status: 200 });
  } catch (error) {
    console.error('[MATTER_RESEARCH_API] GET failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid matter id.' }, { status: 400 });
    }

    if (!isTrustedOrigin(request)) {
      return NextResponse.json({ error: 'INVALID_ORIGIN' }, { status: 403 });
    }

    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'SECURE_ACCESS_DENIED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Malformed JSON body.' }, { status: 400 });
    }

    const result = CreateAuthoritySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid authority payload.', details: result.error.format() },
        { status: 400 }
      );
    }

    const input = result.data;
    const db = new DatabaseClient();

    const matterRows = await db.execute<{ id: string; status: string }>(
      session.tenantId,
      `SELECT id, status FROM "Matter" WHERE id = $1`,
      [id]
    );
    if (matterRows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Matter not found.' }, { status: 404 });
    }
    if (matterRows[0].status === 'CLOSED') {
      return NextResponse.json(
        { error: 'CONFLICT', code: 'MATTER_CLOSED_READ_ONLY', message: 'This Matter Register is closed and read-only.' },
        { status: 409 }
      );
    }

    const rows = await db.execute<ResearchAuthorityRow>(
      session.tenantId,
      `WITH inserted AS (
         INSERT INTO "MatterResearchAuthority"
           (tenant_id, matter_id, case_title, court, citation, decision_date, legal_proposition,
            source, verification_status, advocate_note, intended_use, related_issue, added_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'UNVERIFIED', $9, $10, $11, $12)
         RETURNING ${AUTHORITY_COLUMNS}
       ),
       inserted_event AS (
         INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description, source_type, actor_user_id)
         SELECT $1, $2, CURRENT_DATE, $13, 'AUTHORITY_SAVED', $12
         RETURNING id
       )
       SELECT * FROM inserted`,
      [
        session.tenantId,
        id,
        input.case_title,
        input.court ?? null,
        input.citation ?? null,
        input.decision_date ?? null,
        input.legal_proposition ?? null,
        input.source ?? null,
        input.advocate_note ?? null,
        input.intended_use ?? null,
        input.related_issue ?? null,
        session.sub,
        `Authority saved: ${input.case_title}`,
      ]
    );

    await invalidateMatterContext(session.tenantId, id);
    return NextResponse.json({ authority: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[MATTER_RESEARCH_API] POST failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
