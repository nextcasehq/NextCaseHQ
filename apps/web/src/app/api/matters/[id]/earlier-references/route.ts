import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { EARLIER_CASE_REFERENCE_TYPES } from '@/lib/domain/earlier-case-reference';
import { invalidateMatterContext } from '@/lib/ai/context/cache';

/**
 * Earlier case references (Production Matter Register Foundation).
 * Supports zero, one, or multiple prior references per Matter — each is an
 * independent, append-oriented row (no update endpoint in this milestone;
 * a correction is recorded as a new reference with notes explaining the
 * relationship, matching this codebase's preference for new rows over
 * silent overwrites).
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ReferenceTypeSchema = z.enum(EARLIER_CASE_REFERENCE_TYPES);

interface EarlierCaseReferenceRow {
  id: string;
  tenant_id: string;
  matter_id: string;
  reference_type: string;
  reference_number: string | null;
  court: string | null;
  state: string | null;
  district: string | null;
  reference_year: number | null;
  relationship_to_current: string | null;
  notes: string | null;
  linked_matter_id: string | null;
  created_by: string | null;
  created_at: string;
}

const REFERENCE_COLUMNS = `id, tenant_id, matter_id, reference_type, reference_number, court, state,
                           district, reference_year, relationship_to_current, notes, linked_matter_id,
                           created_by, created_at`;

const CreateReferenceSchema = z.object({
  reference_type: ReferenceTypeSchema,
  reference_number: z.string().max(200).nullable().optional(),
  court: z.string().max(300).nullable().optional(),
  state: z.string().max(200).nullable().optional(),
  district: z.string().max(200).nullable().optional(),
  reference_year: z.number().int().min(1900).max(2100).nullable().optional(),
  relationship_to_current: z.string().max(300).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  linked_matter_id: z.string().regex(UUID_PATTERN, 'Invalid matter id').nullable().optional(),
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

    const rows = await db.execute<EarlierCaseReferenceRow>(
      session.tenantId,
      `SELECT ${REFERENCE_COLUMNS} FROM "EarlierCaseReference" WHERE matter_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    return NextResponse.json({ earlier_references: rows }, { status: 200 });
  } catch (error) {
    console.error('[MATTER_EARLIER_REFERENCES_API] GET failed:', error);
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

    const result = CreateReferenceSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid earlier reference payload.', details: result.error.format() },
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

    // A linked_matter_id FK check bypasses RLS — re-verify ownership before
    // trusting it, same rule as every other client-supplied FK in this API.
    if (input.linked_matter_id) {
      const linkedRows = await db.execute<{ id: string }>(
        session.tenantId,
        `SELECT id FROM "Matter" WHERE id = $1`,
        [input.linked_matter_id]
      );
      if (linkedRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'linked_matter_id does not refer to an existing matter.' },
          { status: 400 }
        );
      }
    }

    const rows = await db.execute<EarlierCaseReferenceRow>(
      session.tenantId,
      `WITH inserted AS (
         INSERT INTO "EarlierCaseReference"
           (tenant_id, matter_id, reference_type, reference_number, court, state, district,
            reference_year, relationship_to_current, notes, linked_matter_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING ${REFERENCE_COLUMNS}
       ),
       inserted_event AS (
         INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description, source_type, actor_user_id)
         SELECT $1, $2, CURRENT_DATE, $13, 'EARLIER_REFERENCE_LINKED', $12
         RETURNING id
       )
       SELECT * FROM inserted`,
      [
        session.tenantId,
        id,
        input.reference_type,
        input.reference_number ?? null,
        input.court ?? null,
        input.state ?? null,
        input.district ?? null,
        input.reference_year ?? null,
        input.relationship_to_current ?? null,
        input.notes ?? null,
        input.linked_matter_id ?? null,
        session.sub,
        `Earlier case reference linked: ${input.reference_type}${input.reference_number ? ` (${input.reference_number})` : ''}`,
      ]
    );

    await invalidateMatterContext(session.tenantId, id);
    return NextResponse.json({ earlier_reference: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[MATTER_EARLIER_REFERENCES_API] POST failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
