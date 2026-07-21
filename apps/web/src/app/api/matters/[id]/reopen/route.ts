import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { MATTER_REOPENING_REASONS } from '@/lib/domain/matter-closure';
import { invalidateMatterContext } from '@/lib/ai/context/cache';

/**
 * Reopen Matter (Production Matter Register Foundation). Preserves the
 * original MatterClosureRecord untouched (append-only, REVOKE UPDATE,
 * DELETE) and records a new, equally immutable MatterReopeningRecord
 * pointing back at it — the closure history is never erased or rewritten,
 * only ever followed by a new, linked fact.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ReopeningReasonSchema = z.enum(MATTER_REOPENING_REASONS);

interface ReopeningRow {
  id: string;
  tenant_id: string;
  matter_id: string;
  closure_record_id: string;
  reopening_reason: string;
  advocate_id: string;
  notes: string | null;
  confirmation_timestamp: string;
  created_at: string;
}

const REOPENING_COLUMNS = `id, tenant_id, matter_id, closure_record_id, reopening_reason, advocate_id,
                           notes, confirmation_timestamp, created_at`;

const ReopenMatterSchema = z.object({
  reopening_reason: ReopeningReasonSchema,
  notes: z.string().max(2000).nullable().optional(),
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

    const result = ReopenMatterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid reopening payload.', details: result.error.format() },
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
    if (matterRows[0].status !== 'CLOSED') {
      return NextResponse.json(
        { error: 'CONFLICT', code: 'MATTER_NOT_CLOSED', message: 'Only a closed Matter Register can be reopened.' },
        { status: 409 }
      );
    }

    // The most recent closure record is the one this reopening reverses —
    // there is always exactly one (closure is a precondition of reaching
    // this point), and MatterClosureRecord is append-only, so "most recent"
    // is unambiguous even across a close -> reopen -> close -> reopen cycle.
    const closureRows = await db.execute<{ id: string }>(
      session.tenantId,
      `SELECT id FROM "MatterClosureRecord" WHERE matter_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [id]
    );
    if (closureRows.length === 0) {
      return NextResponse.json(
        { error: 'CONFLICT', code: 'NO_CLOSURE_RECORD', message: 'This matter has no closure record to reverse.' },
        { status: 409 }
      );
    }

    const rows = await db.execute<ReopeningRow & { updated_matter_id: string }>(
      session.tenantId,
      `WITH inserted_reopening AS (
         INSERT INTO "MatterReopeningRecord" (tenant_id, matter_id, closure_record_id, reopening_reason, advocate_id, notes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${REOPENING_COLUMNS}
       ),
       updated_matter AS (
         UPDATE "Matter"
         SET status = 'REOPENED', closed_at = NULL, updated_at = now(), updated_by_user_id = $5
         WHERE id = $2
         RETURNING id
       ),
       audit_row AS (
         INSERT INTO "MatterAuditEvent"
           (tenant_id, matter_id, actor_user_id, action, target_type, target_id, previous_value, reason)
         SELECT $1, $2, $5, 'MATTER_REOPENED', 'MatterReopeningRecord', inserted_reopening.id,
                jsonb_build_object('closure_record_id', $3), $6
         FROM inserted_reopening
         RETURNING id
       ),
       inserted_event AS (
         INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description, source_type, actor_user_id)
         SELECT $1, $2, CURRENT_DATE, $7, 'MATTER_REOPENED', $5
         RETURNING id
       )
       SELECT inserted_reopening.*, updated_matter.id AS updated_matter_id
       FROM inserted_reopening, updated_matter, audit_row, inserted_event`,
      [
        session.tenantId,
        id,
        closureRows[0].id,
        input.reopening_reason,
        session.sub,
        input.notes ?? null,
        `Matter reopened — ${input.reopening_reason}`,
      ]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
    const { updated_matter_id: _updatedMatterId, ...reopening } = rows[0];
    await invalidateMatterContext(session.tenantId, id);
    return NextResponse.json({ reopening }, { status: 201 });
  } catch (error) {
    console.error('[MATTER_REOPEN_API] POST failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
