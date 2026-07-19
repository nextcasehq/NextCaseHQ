import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { invalidateMatterContext } from '@/lib/ai/context/cache';
import { COURT_FORUM_TYPES, COURT_NOTE_INPUT_METHODS, resolveCourtForumDisplay } from '@/lib/domain/court-note';

/**
 * Court Note Quick Entry Foundation (Product Direction, Milestone 1).
 *
 * A Court Note is an immutable, append-only record of one hearing (see
 * db/schema.sql's CourtNote table and its REVOKE UPDATE, DELETE — a
 * correction is a new Court Note, never an edit to a prior one). Saving one
 * atomically: (1) inserts the CourtNote row, (2) updates the Proceeding's
 * current hearing_date/stage/court so the case detail page always reflects
 * the latest hearing without a second action, (3) — only when the
 * Proceeding is linked to a Matter — appends one MatterEvent
 * (source_type='HEARING') so the Matter's existing chronology
 * (/api/matters/[id]/events) picks it up automatically, and (4) — only
 * when matter-linked and next_actions is non-empty — inserts exactly one
 * MatterTask (Milestone 2), a correctable, no-text checklist entry that
 * always reads its display text back from this same CourtNote row rather
 * than copying it, satisfying "never ask the advocate to enter the same
 * information twice."
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const CourtForumTypeSchema = z.enum(COURT_FORUM_TYPES);
const InputMethodSchema = z.enum(COURT_NOTE_INPUT_METHODS);

interface CourtNoteRow {
  id: string;
  tenant_id: string;
  case_id: string;
  matter_id: string | null;
  author_user_id: string;
  hearing_date: string;
  next_hearing_date: string | null;
  court_forum_type: string;
  court_forum_other: string | null;
  court_forum_display: string;
  stage: string;
  note: string;
  next_actions: string | null;
  input_method: string;
  created_at: string;
}

const COURT_NOTE_COLUMNS = `id, tenant_id, case_id, matter_id, author_user_id, hearing_date, next_hearing_date,
                            court_forum_type, court_forum_other, court_forum_display, stage, note, next_actions,
                            input_method, created_at`;

const CreateCourtNoteSchema = z
  .object({
    hearing_date: z.string().regex(DATE_PATTERN, 'Expected YYYY-MM-DD'),
    next_hearing_date: z.string().regex(DATE_PATTERN, 'Expected YYYY-MM-DD').nullable().optional(),
    court_forum_type: CourtForumTypeSchema,
    court_forum_other: z.string().max(300).nullable().optional(),
    stage: z.string().min(1).max(300),
    note: z.string().min(1).max(10000),
    next_actions: z.string().max(5000).nullable().optional(),
    input_method: InputMethodSchema.optional().default('MANUAL'),
  })
  .refine(
    (data) => data.court_forum_type !== 'OTHER' || Boolean(data.court_forum_other && data.court_forum_other.trim()),
    { message: '"court_forum_other" is required when court_forum_type is OTHER.', path: ['court_forum_other'] }
  );

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
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid case id.' }, { status: 400 });
    }

    const session = await resolveSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'SECURE_ACCESS_DENIED', message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const db = new DatabaseClient();
    // RLS scopes this to the caller's own tenant — a case belonging to
    // another tenant returns zero rows here, not a permission leak.
    const rows = await db.execute<CourtNoteRow>(
      session.tenantId,
      `SELECT ${COURT_NOTE_COLUMNS}
       FROM "CourtNote"
       WHERE case_id = $1
       ORDER BY hearing_date DESC, created_at DESC`,
      [id]
    );

    return NextResponse.json({ court_notes: rows }, { status: 200 });
  } catch (error) {
    console.error('[COURT_NOTES_API] GET /api/cases/[id]/court-notes failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Invalid case id.' }, { status: 400 });
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

    const result = CreateCourtNoteSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid Court Note payload.', details: result.error.format() },
        { status: 400 }
      );
    }

    const input = result.data;
    const db = new DatabaseClient();

    // A case_id FK check bypasses RLS — confirm the Proceeding exists in the
    // caller's own tenant before inserting a child row under it (same rule
    // as POST /api/matters/[id]/events).
    const caseRows = await db.execute<{ id: string }>(
      session.tenantId,
      `SELECT id FROM "LegalCase" WHERE id = $1`,
      [id]
    );
    if (caseRows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Case not found.' }, { status: 404 });
    }

    const courtForumDisplay = resolveCourtForumDisplay(
      input.court_forum_type,
      input.court_forum_other ?? null
    );

    const eventDescriptionParts = [
      `Court Note — ${input.stage} (${courtForumDisplay}): ${input.note}`,
    ];
    if (input.next_actions && input.next_actions.trim()) {
      eventDescriptionParts.push(`Next: ${input.next_actions.trim()}`);
    }
    const eventDescription = eventDescriptionParts.join(' ');

    // Single transaction: insert the immutable Court Note, refresh the
    // Proceeding's current hearing_date/stage/court, and — only when the
    // Proceeding is matter-linked — append the Matter chronology entry.
    // Data-modifying CTEs run to completion even when the primary SELECT
    // doesn't read from them, so updated_case/inserted_event always execute
    // exactly once alongside inserted_note.
    const rows = await db.execute<CourtNoteRow & { updated_matter_id: string | null }>(
      session.tenantId,
      `WITH target_case AS (
         SELECT id, matter_id FROM "LegalCase" WHERE id = $1
       ),
       inserted_note AS (
         INSERT INTO "CourtNote" (
           tenant_id, case_id, matter_id, author_user_id, hearing_date, next_hearing_date,
           court_forum_type, court_forum_other, court_forum_display, stage, note, next_actions, input_method
         )
         SELECT $2, target_case.id, target_case.matter_id, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
         FROM target_case
         RETURNING ${COURT_NOTE_COLUMNS}
       ),
       updated_case AS (
         UPDATE "LegalCase"
         SET hearing_date = $5, stage = $9, court = $8, updated_at = now()
         WHERE id = (SELECT id FROM target_case)
         RETURNING id
       ),
       inserted_event AS (
         INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description, source_type)
         SELECT $2, target_case.matter_id, $4::date, $13, 'HEARING'
         FROM target_case
         WHERE target_case.matter_id IS NOT NULL
         RETURNING id
       ),
       inserted_task AS (
         INSERT INTO "MatterTask" (tenant_id, matter_id, case_id, court_note_id)
         SELECT $2, target_case.matter_id, target_case.id, inserted_note.id
         FROM target_case, inserted_note
         WHERE target_case.matter_id IS NOT NULL AND $11 IS NOT NULL AND btrim($11) <> ''
         ON CONFLICT (court_note_id) DO NOTHING
         RETURNING id
       )
       SELECT inserted_note.*, target_case.matter_id AS updated_matter_id
       FROM inserted_note, target_case`,
      [
        id,
        session.tenantId,
        session.sub,
        input.hearing_date,
        input.next_hearing_date ?? null,
        input.court_forum_type,
        input.court_forum_other ?? null,
        courtForumDisplay,
        input.stage,
        input.note,
        input.next_actions ?? null,
        input.input_method,
        eventDescription,
      ]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Case not found.' }, { status: 404 });
    }

    const { updated_matter_id: matterId, ...courtNote } = rows[0];
    if (matterId) {
      await invalidateMatterContext(session.tenantId, matterId);
    }

    return NextResponse.json({ court_note: courtNote }, { status: 201 });
  } catch (error) {
    console.error('[COURT_NOTES_API] POST /api/cases/[id]/court-notes failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
