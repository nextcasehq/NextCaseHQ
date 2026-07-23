import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { invalidateMatterContext } from '@/lib/ai/context/cache';
import {
  COURT_FORUM_TYPES,
  COURT_NOTE_INPUT_METHODS,
  COURT_NOTE_SOURCES,
  COURT_NOTE_VERIFICATION_STATUSES,
  resolveCourtForumDisplay,
} from '@/lib/domain/court-note';

/**
 * Court Note Quick Entry Foundation (Product Direction, Milestone 1).
 *
 * A Court Note is an immutable, append-only record of one hearing (see
 * db/schema.sql's CourtNote table and its REVOKE UPDATE, DELETE — a
 * correction is a new Court Note, never an edit to a prior one). Saving one
 * atomically: (1) inserts the CourtNote row, (2) updates the Proceeding's
 * stage/court and its hearing_date — a forward-looking pointer set to
 * next_hearing_date (or NULL when none was fixed), not the hearing that
 * just happened, since Matter Health, the dashboard, and the Seven-Day
 * Preparation workflow/reminder cron all read this column expecting "next
 * hearing" — the hearing that just occurred is preserved permanently on
 * this same CourtNote row instead (hearing_date/previous_hearing_date/
 * previous_stage), (3) — only when the Proceeding is linked to a Matter —
 * appends one MatterEvent (source_type='HEARING') so the Matter's existing
 * chronology (/api/matters/[id]/events) picks it up automatically, (4) —
 * only when matter-linked and next_actions is non-empty — inserts exactly
 * one MatterTask (Milestone 2), a correctable, no-text checklist entry that
 * always reads its display text back from this same CourtNote row rather
 * than copying it, satisfying "never ask the advocate to enter the same
 * information twice," and (5) — only when this Proceeding is the Matter's
 * current_proceeding_id — refreshes Matter.current_stage/next_hearing_date
 * to match. Those two Matter-level columns were previously only ever
 * written when a *new* Proceeding was created and marked current (see
 * /api/matters/[id]/proceedings), so a routine Court Note against an
 * already-current Proceeding left them silently stale after every ordinary
 * hearing — the Digital Case File vision requires the Matter to always
 * reflect the latest diary activity, not just the Proceeding it mirrors.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const CourtForumTypeSchema = z.enum(COURT_FORUM_TYPES);
const InputMethodSchema = z.enum(COURT_NOTE_INPUT_METHODS);
const SourceSchema = z.enum(COURT_NOTE_SOURCES);
const VerificationStatusSchema = z.enum(COURT_NOTE_VERIFICATION_STATUSES);

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
  source: string;
  verification_status: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
  previous_hearing_date: string | null;
  previous_stage: string | null;
  created_at: string;
}

const COURT_NOTE_COLUMNS = `id, tenant_id, case_id, matter_id, author_user_id, hearing_date, next_hearing_date,
                            court_forum_type, court_forum_other, court_forum_display, stage, note, next_actions,
                            input_method, source, verification_status, confirmed_by, confirmed_at,
                            previous_hearing_date, previous_stage, created_at`;

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
    source: SourceSchema.optional().default('ADVOCATE_ENTRY'),
    verification_status: VerificationStatusSchema.optional(),
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
    // as POST /api/matters/[id]/events). Also captures the Proceeding's
    // current hearing_date/stage before this update (so the new Court Note
    // can record previous_hearing_date/previous_stage) and its matter_id
    // (so a Court Note can be blocked when the linked Matter is closed).
    const caseRows = await db.execute<{
      id: string;
      matter_id: string | null;
      hearing_date: string | null;
      stage: string | null;
    }>(
      session.tenantId,
      `SELECT id, matter_id, hearing_date, stage FROM "LegalCase" WHERE id = $1`,
      [id]
    );
    if (caseRows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Case not found.' }, { status: 404 });
    }

    // A Court Note tied to a Proceeding whose parent Matter is closed would
    // silently add new hearing history to a matter that's supposed to be
    // read-only. Only blocked when the Proceeding actually links to a
    // Matter — a standalone Proceeding is unaffected.
    if (caseRows[0].matter_id) {
      const matterRows = await db.execute<{ status: string }>(
        session.tenantId,
        `SELECT status FROM "Matter" WHERE id = $1`,
        [caseRows[0].matter_id]
      );
      if (matterRows.length > 0 && matterRows[0].status === 'CLOSED') {
        return NextResponse.json(
          {
            error: 'CONFLICT',
            code: 'MATTER_CLOSED_READ_ONLY',
            message: 'The Matter linked to this Proceeding is closed. Reopen it before adding new Court Notes.',
          },
          { status: 409 }
        );
      }
    }

    const courtForumDisplay = resolveCourtForumDisplay(
      input.court_forum_type,
      input.court_forum_other ?? null
    );

    // Idempotency / no-op detection: if the most recent Court Note for this
    // Proceeding already recorded these exact hearing_date/next_hearing_date/
    // stage/court_forum_display/note values, this is a duplicate submission
    // (double-click, retried request) rather than a real new hearing — return
    // the existing record instead of creating a second, identical timeline
    // event.
    const latestNoteRows = await db.execute<CourtNoteRow>(
      session.tenantId,
      `SELECT ${COURT_NOTE_COLUMNS} FROM "CourtNote" WHERE case_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [id]
    );
    const latest = latestNoteRows[0];
    if (
      latest &&
      latest.hearing_date === input.hearing_date &&
      (latest.next_hearing_date ?? null) === (input.next_hearing_date ?? null) &&
      latest.stage === input.stage &&
      latest.court_forum_display === courtForumDisplay &&
      latest.note === input.note
    ) {
      return NextResponse.json({ court_note: latest, no_op: true }, { status: 200 });
    }

    const verificationStatus =
      input.verification_status ?? (input.source === 'ECOURTS_CONFIRMED' ? 'ECOURTS_CONFIRMED' : 'ADVOCATE_CONFIRMED');

    const eventDescriptionParts = [
      `Court Note — ${input.stage} (${courtForumDisplay}): ${input.note}`,
    ];
    if (input.next_hearing_date) {
      eventDescriptionParts.push(`Next hearing: ${input.next_hearing_date}`);
    }
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
           court_forum_type, court_forum_other, court_forum_display, stage, note, next_actions, input_method,
           source, verification_status, confirmed_by, confirmed_at, previous_hearing_date, previous_stage
         )
         SELECT $2, target_case.id, target_case.matter_id, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                $14, $15, $3, now(), $16, $17
         FROM target_case
         RETURNING ${COURT_NOTE_COLUMNS}
       ),
       updated_case AS (
         -- The Proceeding's hearing_date is a forward-looking pointer to the
         -- next scheduled hearing, not a record of the hearing that just
         -- happened — every downstream reader (Matter Health, the dashboard,
         -- the Seven-Day Preparation workflow, the reminder cron) filters
         -- this column expecting "when is this Proceeding next due in
         -- court." $5 (next_hearing_date) is that date, or NULL when none
         -- was fixed (e.g. orders reserved, matter disposed) — correctly
         -- clearing the field rather than leaving it pointing at a hearing
         -- that has now already happened. The hearing that just occurred is
         -- never lost: it's permanently preserved on this same CourtNote row
         -- (hearing_date/previous_hearing_date/previous_stage above).
         UPDATE "LegalCase"
         SET hearing_date = $5, stage = $9, court = $8, updated_at = now()
         WHERE id = (SELECT id FROM target_case)
         RETURNING id
       ),
       inserted_event AS (
         INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description, source_type, actor_user_id)
         SELECT $2, target_case.matter_id, $4::date, $13, 'HEARING', $3
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
       ),
       updated_matter AS (
         -- Only refreshed when this Proceeding is the Matter's designated
         -- "current" one (Matter.current_proceeding_id) — a Court Note on a
         -- superseded/prior proceeding (e.g. the trial court record once an
         -- appeal is current) must never overwrite the Matter's live stage
         -- with stale, no-longer-relevant text.
         UPDATE "Matter"
         SET current_stage = $9, next_hearing_date = $5::date, updated_at = now()
         WHERE id = (SELECT matter_id FROM target_case)
           AND current_proceeding_id = (SELECT id FROM target_case)
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
        input.source,
        verificationStatus,
        caseRows[0].hearing_date,
        caseRows[0].stage,
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
