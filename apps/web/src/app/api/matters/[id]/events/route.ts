import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';
import { invalidateMatterContext } from '@/lib/ai/context/cache';

/**
 * Matter chronology — the ordered, human-entered timeline a Matter's future
 * "Matter Memory" reads from (see db/schema.sql section 3b). This milestone
 * only produces MANUAL entries; HEARING/ORDER/DOCUMENT source types are
 * reserved for later milestones that generate events automatically.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface MatterEventRow {
  id: string;
  tenant_id: string;
  matter_id: string;
  event_date: string;
  description: string;
  source_type: string;
  created_at: string;
}

const EVENT_COLUMNS = `id, tenant_id, matter_id, event_date, description, source_type, created_at`;

const CreateEventSchema = z.object({
  event_date: z.string().regex(EVENT_DATE_PATTERN, 'Expected YYYY-MM-DD'),
  description: z.string().min(1).max(10000),
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
    const rows = await db.execute<MatterEventRow>(
      session.tenantId,
      `SELECT ${EVENT_COLUMNS}
       FROM "MatterEvent"
       WHERE matter_id = $1
       ORDER BY event_date DESC, created_at DESC`,
      [id]
    );

    return NextResponse.json({ events: rows }, { status: 200 });
  } catch (error) {
    console.error('[MATTERS_API] GET /api/matters/[id]/events failed:', error);
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

    const result = CreateEventSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid event payload.', details: result.error.format() },
        { status: 400 }
      );
    }

    const input = result.data;
    const db = new DatabaseClient();

    // A matter_id FK check bypasses RLS — confirm the Matter exists in the
    // caller's own tenant before inserting a child row under it.
    const matterRows = await db.execute<{ id: string }>(
      session.tenantId,
      `SELECT id FROM "Matter" WHERE id = $1`,
      [id]
    );
    if (matterRows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Matter not found.' }, { status: 404 });
    }

    const rows = await db.execute<MatterEventRow>(
      session.tenantId,
      `INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description, source_type)
       VALUES ($1, $2, $3, $4, 'MANUAL')
       RETURNING ${EVENT_COLUMNS}`,
      [session.tenantId, id, input.event_date, input.description]
    );

    await invalidateMatterContext(session.tenantId, id);
    return NextResponse.json({ event: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[MATTERS_API] POST /api/matters/[id]/events failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
