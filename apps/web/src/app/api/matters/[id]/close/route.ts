import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { MATTER_CLOSURE_REASONS, MATTER_CLOSURE_CONFIRMATION_STATEMENT } from '@/lib/domain/matter-closure';
import { invalidateMatterContext } from '@/lib/ai/context/cache';

/**
 * Close Matter (Production Matter Register Foundation). A closed Matter
 * Register is never deleted — this route only ever inserts one new,
 * immutable MatterClosureRecord row (REVOKE UPDATE, DELETE — see
 * db/schema.sql) and flips Matter.status to CLOSED. The advocate must
 * submit confirmation_statement matching MATTER_CLOSURE_CONFIRMATION_STATEMENT
 * verbatim — this is the "explicit confirmation" requirement, enforced
 * server-side, not just a UI checkbox.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const ClosureReasonSchema = z.enum(MATTER_CLOSURE_REASONS);

interface ClosureRow {
  id: string;
  tenant_id: string;
  matter_id: string;
  closure_reason: string;
  final_outcome: string | null;
  disposal_date: string | null;
  final_order_reference: string | null;
  pending_obligations: string | null;
  appeal_review_limitation_date: string | null;
  execution_compliance_requirement: string | null;
  original_document_status: string | null;
  client_communication_status: string | null;
  account_fee_status: string | null;
  unresolved_warnings: unknown;
  confirming_advocate_id: string;
  confirmation_statement: string;
  confirmation_timestamp: string;
  created_at: string;
}

const CLOSURE_COLUMNS = `id, tenant_id, matter_id, closure_reason, final_outcome, disposal_date,
                         final_order_reference, pending_obligations, appeal_review_limitation_date,
                         execution_compliance_requirement, original_document_status,
                         client_communication_status, account_fee_status, unresolved_warnings,
                         confirming_advocate_id, confirmation_statement, confirmation_timestamp, created_at`;

const CloseMatterSchema = z.object({
  closure_reason: ClosureReasonSchema,
  final_outcome: z.string().max(2000).nullable().optional(),
  disposal_date: z.string().regex(DATE_PATTERN, 'Expected YYYY-MM-DD').nullable().optional(),
  final_order_reference: z.string().max(500).nullable().optional(),
  pending_obligations: z.string().max(5000).nullable().optional(),
  appeal_review_limitation_date: z.string().regex(DATE_PATTERN, 'Expected YYYY-MM-DD').nullable().optional(),
  execution_compliance_requirement: z.string().max(2000).nullable().optional(),
  original_document_status: z.string().max(1000).nullable().optional(),
  client_communication_status: z.string().max(1000).nullable().optional(),
  account_fee_status: z.string().max(1000).nullable().optional(),
  unresolved_warnings: z.array(z.string().max(500)).optional().default([]),
  confirmation_statement: z.string(),
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

    const result = CloseMatterSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid closure payload.', details: result.error.format() },
        { status: 400 }
      );
    }

    const input = result.data;

    // The explicit-confirmation requirement: the advocate must submit the
    // exact approved statement, not merely a truthy flag. A near-miss
    // (whitespace, paraphrase) is rejected rather than silently accepted.
    if (input.confirmation_statement !== MATTER_CLOSURE_CONFIRMATION_STATEMENT) {
      return NextResponse.json(
        {
          error: 'BAD_REQUEST',
          code: 'CONFIRMATION_STATEMENT_MISMATCH',
          message: 'The closure confirmation statement must match the required text exactly.',
        },
        { status: 400 }
      );
    }

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
        { error: 'CONFLICT', code: 'MATTER_ALREADY_CLOSED', message: 'This Matter Register is already closed.' },
        { status: 409 }
      );
    }

    const rows = await db.execute<ClosureRow & { updated_matter_id: string }>(
      session.tenantId,
      `WITH inserted_closure AS (
         INSERT INTO "MatterClosureRecord"
           (tenant_id, matter_id, closure_reason, final_outcome, disposal_date, final_order_reference,
            pending_obligations, appeal_review_limitation_date, execution_compliance_requirement,
            original_document_status, client_communication_status, account_fee_status,
            unresolved_warnings, confirming_advocate_id, confirmation_statement)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15)
         RETURNING ${CLOSURE_COLUMNS}
       ),
       updated_matter AS (
         UPDATE "Matter"
         SET status = 'CLOSED', closed_at = now(), updated_at = now(), updated_by_user_id = $14
         WHERE id = $2
         RETURNING id
       ),
       audit_row AS (
         INSERT INTO "MatterAuditEvent"
           (tenant_id, matter_id, actor_user_id, action, target_type, target_id, new_value, reason)
         SELECT $1, $2, $14, 'MATTER_CLOSED', 'MatterClosureRecord', inserted_closure.id,
                jsonb_build_object('closure_reason', $3, 'final_outcome', $4), $16
         FROM inserted_closure
         RETURNING id
       ),
       inserted_event AS (
         INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description, source_type, actor_user_id)
         SELECT $1, $2, CURRENT_DATE, $17, 'MATTER_CLOSED', $14
         RETURNING id
       )
       SELECT inserted_closure.*, updated_matter.id AS updated_matter_id
       FROM inserted_closure, updated_matter, audit_row, inserted_event`,
      [
        session.tenantId,
        id,
        input.closure_reason,
        input.final_outcome ?? null,
        input.disposal_date ?? null,
        input.final_order_reference ?? null,
        input.pending_obligations ?? null,
        input.appeal_review_limitation_date ?? null,
        input.execution_compliance_requirement ?? null,
        input.original_document_status ?? null,
        input.client_communication_status ?? null,
        input.account_fee_status ?? null,
        JSON.stringify(input.unresolved_warnings),
        session.sub,
        input.confirmation_statement,
        `Matter closed: ${input.closure_reason}`,
        `Matter closed — ${input.closure_reason}${input.final_outcome ? `: ${input.final_outcome}` : ''}`,
      ]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
    const { updated_matter_id: _updatedMatterId, ...closure } = rows[0];
    await invalidateMatterContext(session.tenantId, id);
    return NextResponse.json({ closure }, { status: 201 });
  } catch (error) {
    console.error('[MATTER_CLOSE_API] POST failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
