import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { REPRESENTATION_ROLES } from '@/lib/domain/matter-representation';
import { invalidateMatterContext } from '@/lib/ai/context/cache';

/**
 * Representation history foundation only (Production Matter Register
 * Foundation) — not the full paid change-of-advocate commercial workflow.
 * A new representation stint is always a new row; when it supersedes an
 * active one for the same person, the prior row is closed out via
 * effective_to/is_active=false in the same transaction, never edited past
 * that point. audit_reference points at the MatterAuditEvent row recording
 * this same change.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const RepresentationRoleSchema = z.enum(REPRESENTATION_ROLES);

interface RepresentationRow {
  id: string;
  tenant_id: string;
  matter_id: string;
  proceeding_id: string | null;
  user_id: string;
  representation_role: string;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  handover_status: string | null;
  access_status: string;
  change_reason: string | null;
  audit_reference: string | null;
  created_by: string | null;
  created_at: string;
}

const REPRESENTATION_COLUMNS = `id, tenant_id, matter_id, proceeding_id, user_id, representation_role,
                                effective_from, effective_to, is_active, handover_status, access_status,
                                change_reason, audit_reference, created_by, created_at`;

const CreateRepresentationSchema = z.object({
  proceeding_id: z.string().regex(UUID_PATTERN, 'Invalid proceeding id').nullable().optional(),
  user_id: z.string().regex(UUID_PATTERN, 'Invalid user id'),
  representation_role: RepresentationRoleSchema,
  effective_from: z.string().regex(DATE_PATTERN, 'Expected YYYY-MM-DD').optional(),
  handover_status: z.string().max(300).nullable().optional(),
  change_reason: z.string().max(1000).nullable().optional(),
  supersede_representation_id: z.string().regex(UUID_PATTERN, 'Invalid representation id').nullable().optional(),
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

    const rows = await db.execute<RepresentationRow>(
      session.tenantId,
      `SELECT ${REPRESENTATION_COLUMNS} FROM "MatterRepresentation" WHERE matter_id = $1
       ORDER BY is_active DESC, created_at DESC`,
      [id]
    );

    return NextResponse.json({ representation: rows }, { status: 200 });
  } catch (error) {
    console.error('[MATTER_REPRESENTATION_API] GET failed:', error);
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

    const result = CreateRepresentationSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid representation payload.', details: result.error.format() },
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

    const userRows = await db.execute<{ id: string }>(
      session.tenantId,
      `SELECT id FROM "User" WHERE id = $1 AND tenant_id = $2`,
      [input.user_id, session.tenantId]
    );
    if (userRows.length === 0) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'user_id does not refer to a user in this tenant.' },
        { status: 400 }
      );
    }

    if (input.proceeding_id) {
      const proceedingRows = await db.execute<{ id: string }>(
        session.tenantId,
        `SELECT id FROM "LegalCase" WHERE id = $1 AND matter_id = $2`,
        [input.proceeding_id, id]
      );
      if (proceedingRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'proceeding_id does not refer to a proceeding under this matter.' },
          { status: 400 }
        );
      }
    }

    if (input.supersede_representation_id) {
      const priorRows = await db.execute<{ id: string }>(
        session.tenantId,
        `SELECT id FROM "MatterRepresentation" WHERE id = $1 AND matter_id = $2 AND is_active = true`,
        [input.supersede_representation_id, id]
      );
      if (priorRows.length === 0) {
        return NextResponse.json(
          { error: 'BAD_REQUEST', message: 'supersede_representation_id does not refer to an active representation on this matter.' },
          { status: 400 }
        );
      }
    }

    const changeDescription = `Representation change: ${input.representation_role} assigned${input.change_reason ? ` — ${input.change_reason}` : ''}`;

    const rows = await db.execute<RepresentationRow & { updated_audit_id: string }>(
      session.tenantId,
      `WITH audit_row AS (
         INSERT INTO "MatterAuditEvent" (tenant_id, matter_id, actor_user_id, action, target_type, reason)
         VALUES ($1, $2, $3, 'REPRESENTATION_CHANGED', 'MatterRepresentation', $4)
         RETURNING id
       ),
       closed_prior AS (
         UPDATE "MatterRepresentation"
         SET is_active = false, effective_to = $5
         WHERE id = $6 AND matter_id = $2 AND $6 IS NOT NULL
         RETURNING id
       ),
       inserted AS (
         INSERT INTO "MatterRepresentation"
           (tenant_id, matter_id, proceeding_id, user_id, representation_role, effective_from,
            handover_status, change_reason, audit_reference, created_by)
         SELECT $1, $2, $7, $8, $9, COALESCE($10, CURRENT_DATE), $11, $4, audit_row.id, $3
         FROM audit_row
         RETURNING ${REPRESENTATION_COLUMNS}
       ),
       inserted_event AS (
         INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description, source_type, actor_user_id)
         SELECT $1, $2, CURRENT_DATE, $12, 'REPRESENTATION_CHANGED', $3
         RETURNING id
       )
       SELECT inserted.*, audit_row.id AS updated_audit_id FROM inserted, audit_row`,
      [
        session.tenantId,
        id,
        session.sub,
        input.change_reason ?? null,
        input.effective_from ?? new Date().toISOString().slice(0, 10),
        input.supersede_representation_id ?? null,
        input.proceeding_id ?? null,
        input.user_id,
        input.representation_role,
        input.effective_from ?? null,
        input.handover_status ?? null,
        changeDescription,
      ]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
    }
    const { updated_audit_id: _auditId, ...representation } = rows[0];
    await invalidateMatterContext(session.tenantId, id);
    return NextResponse.json({ representation }, { status: 201 });
  } catch (error) {
    console.error('[MATTER_REPRESENTATION_API] POST failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
