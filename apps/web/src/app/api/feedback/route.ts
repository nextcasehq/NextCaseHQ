import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireSession, UnauthenticatedError } from '@/lib/auth/session';
import { isTrustedOrigin } from '@/lib/security/origin-check';
import { DatabaseClient } from '@/lib/db/db-client';

/**
 * Feedback Centre — bug reports, feature requests, usability/AI/
 * documentation feedback, and general suggestions submitted from within
 * the app. Every submission is tenant-scoped and (optionally) attributed
 * to the submitting user; page_url is client-supplied context, never
 * required. Status is the only field an admin can later change (see
 * PATCH below) — the original category/message is never rewritten.
 */

const FEEDBACK_CATEGORIES = ['BUG', 'FEATURE_REQUEST', 'USABILITY', 'AI_FEEDBACK', 'DOCUMENTATION', 'GENERAL'] as const;
const FEEDBACK_STATUSES = ['OPEN', 'REVIEWED', 'RESOLVED', 'DISMISSED'] as const;

interface FeedbackRow {
  id: string;
  category: string;
  message: string;
  page_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

const CreateFeedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  message: z.string().min(1).max(5000),
  page_url: z.string().max(2000).nullable().optional(),
});

const ListQuerySchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES).optional(),
  status: z.enum(FEEDBACK_STATUSES).optional(),
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

    const result = CreateFeedbackSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Invalid feedback payload.', details: result.error.format() },
        { status: 400 }
      );
    }
    const input = result.data;

    const db = new DatabaseClient();
    const rows = await db.execute<FeedbackRow>(
      session.tenantId,
      `INSERT INTO "Feedback" (tenant_id, user_id, category, message, page_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, category, message, page_url, status, created_at, updated_at`,
      [session.tenantId, session.sub, input.category, input.message, input.page_url ?? null]
    );

    return NextResponse.json({ feedback: rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[FEEDBACK_API] POST /api/feedback failed:', error);
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
      category: request.nextUrl.searchParams.get('category') ?? undefined,
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
    const { category, status, limit, offset } = parsed.data;

    const conditions: string[] = [];
    const values: unknown[] = [];
    if (category) {
      values.push(category);
      conditions.push(`category = $${values.length}`);
    }
    if (status) {
      values.push(status);
      conditions.push(`status = $${values.length}`);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(limit, offset);

    const db = new DatabaseClient();
    const rows = await db.execute<FeedbackRow>(
      session.tenantId,
      `SELECT id, category, message, page_url, status, created_at, updated_at
       FROM "Feedback"
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    return NextResponse.json({ feedback: rows }, { status: 200 });
  } catch (error) {
    console.error('[FEEDBACK_API] GET /api/feedback failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
