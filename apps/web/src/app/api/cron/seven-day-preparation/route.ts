import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DatabaseClient } from '@/lib/db/db-client';
import { constantTimeEqual } from '@/lib/security/constant-time';
import { INSECURE_CRON_SECRET_PLACEHOLDER } from '@/lib/security/env-validation';
import { PREPARATION_NOTIFICATION_TYPE, PREPARATION_WINDOW_DAYS } from '@/lib/domain/preparation';

/**
 * Seven-Day Case Preparation scheduled trigger (Product Direction,
 * Milestone 3) — invoked once daily by a Vercel Cron Job (see
 * vercel.json), never by a browser. Authenticated by a shared secret, not
 * a user session, since no advocate is signed in when the scheduler calls
 * this.
 *
 * Every RLS-protected table (LegalCase, CourtNote, MatterTask,
 * Notification, MatterPreparationReminder) is read/written exclusively
 * through DatabaseClient.execute(tenantId, ...) — the same tenant-scoped
 * path every other route uses. executeSystem() is used only once, to
 * list tenant ids from "Tenant" (the one table with no RLS), and this
 * route then loops per tenant rather than ever querying an RLS-protected
 * table cross-tenant. This keeps the security model unchanged; it is a
 * new *pattern* (the first tenant-iterating job in the codebase), not a
 * new *bypass*.
 */

const CRON_SECRET = process.env.CRON_SECRET || INSECURE_CRON_SECRET_PLACEHOLDER;

interface TenantRow {
  id: string;
}

interface QualifyingCaseRow {
  case_id: string;
  matter_id: string | null;
  case_title: string;
  hearing_date: string;
}

interface RecipientRow {
  user_id: string;
}

interface ReminderResultRow {
  notifications_created: number;
  reminder_created: number;
}

function isAuthorized(request: NextRequest): boolean {
  const header = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${CRON_SECRET}`;
  return constantTimeEqual(header, expected);
}

async function notifyQualifyingCase(
  db: DatabaseClient,
  tenantId: string,
  qualifyingCase: QualifyingCaseRow
): Promise<ReminderResultRow> {
  let recipientIds: string[] = [];

  if (qualifyingCase.matter_id) {
    const participantRows = await db.execute<RecipientRow>(
      tenantId,
      `SELECT user_id FROM "MatterParticipant" WHERE matter_id = $1`,
      [qualifyingCase.matter_id]
    );
    recipientIds = participantRows.map((r) => r.user_id);
  }

  if (recipientIds.length === 0) {
    const authorRows = await db.execute<RecipientRow>(
      tenantId,
      `SELECT author_user_id AS user_id FROM "CourtNote"
       WHERE case_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [qualifyingCase.case_id]
    );
    recipientIds = authorRows.map((r) => r.user_id);
  }

  if (recipientIds.length === 0) {
    // No Matter participants and no Court Note author to notify. Nothing
    // is silently marked as reminded — the next daily run tries again for
    // as long as the hearing stays within the window, and the Matter
    // preparation view still surfaces it to anyone who opens the page.
    return { notifications_created: 0, reminder_created: 0 };
  }

  const title = 'Prepare for your upcoming hearing';
  const message = `${qualifyingCase.case_title} — hearing on ${qualifyingCase.hearing_date}. Review your last Court Note, pending actions, and documents before you appear.`;

  const rows = await db.execute<ReminderResultRow>(
    tenantId,
    `WITH recipients AS (
       SELECT unnest($1::uuid[]) AS user_id
     ),
     inserted_notifications AS (
       INSERT INTO "Notification" (tenant_id, user_id, type, title, message)
       SELECT $2, r.user_id, $3, $4, $5
       FROM recipients r
       WHERE NOT EXISTS (
         SELECT 1 FROM "MatterPreparationReminder" WHERE case_id = $6 AND hearing_date = $7
       )
       RETURNING id
     ),
     inserted_reminder AS (
       INSERT INTO "MatterPreparationReminder" (tenant_id, case_id, hearing_date, notification_id)
       SELECT $2, $6, $7, (SELECT id FROM inserted_notifications LIMIT 1)
       WHERE EXISTS (SELECT 1 FROM inserted_notifications)
       ON CONFLICT (case_id, hearing_date) DO NOTHING
       RETURNING id
     )
     SELECT
       (SELECT count(*)::int FROM inserted_notifications) AS notifications_created,
       (SELECT count(*)::int FROM inserted_reminder) AS reminder_created`,
    [recipientIds, tenantId, PREPARATION_NOTIFICATION_TYPE, title, message, qualifyingCase.case_id, qualifyingCase.hearing_date]
  );

  return rows[0];
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'SECURE_ACCESS_DENIED' }, { status: 401 });
    }

    const db = new DatabaseClient();
    const tenants = await db.executeSystem<TenantRow>(`SELECT id FROM "Tenant"`);

    let proceedingsNotified = 0;
    let notificationsCreated = 0;

    for (const tenant of tenants) {
      const qualifyingCases = await db.execute<QualifyingCaseRow>(
        tenant.id,
        `SELECT lc.id AS case_id, lc.matter_id, lc.title AS case_title, lc.hearing_date
         FROM "LegalCase" lc
         WHERE lc.hearing_date IS NOT NULL
           AND lc.hearing_date::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + $1::int)
           AND NOT EXISTS (
             SELECT 1 FROM "MatterPreparationReminder" mpr
             WHERE mpr.case_id = lc.id AND mpr.hearing_date = lc.hearing_date
           )`,
        [PREPARATION_WINDOW_DAYS]
      );

      for (const qualifyingCase of qualifyingCases) {
        const result = await notifyQualifyingCase(db, tenant.id, qualifyingCase);
        notificationsCreated += result.notifications_created;
        if (result.reminder_created > 0) {
          proceedingsNotified += 1;
        }
      }
    }

    return NextResponse.json(
      { tenants_scanned: tenants.length, proceedings_notified: proceedingsNotified, notifications_created: notificationsCreated },
      { status: 200 }
    );
  } catch (error) {
    console.error('[SEVEN_DAY_PREPARATION_CRON] run failed:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
