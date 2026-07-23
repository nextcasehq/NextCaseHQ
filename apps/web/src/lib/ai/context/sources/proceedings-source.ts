import { DatabaseClient } from '@/lib/db/db-client';
import type { ContextItem, ContextSource } from '../types';
import { SOURCE_BASE_WEIGHT } from '../types';

interface ProceedingRow {
  title: string;
  case_number: string | null;
  status: string;
  court: string | null;
  stage: string | null;
  hearing_date: string | null;
  created_at: string;
}

function renderProceeding(row: ProceedingRow): string {
  const parts = [row.title];
  if (row.case_number) parts.push(`(${row.case_number})`);
  parts.push(`— ${row.status}`);
  if (row.court) parts.push(`at ${row.court}`);
  if (row.stage) parts.push(`[${row.stage}]`);
  // hearing_date is the Proceeding's next scheduled hearing (kept current by
  // every Court Note save — see api/cases/[id]/court-notes/route.ts), not a
  // history of past hearings, so it's safe to always render as "upcoming."
  if (row.hearing_date) parts.push(`— next hearing ${row.hearing_date}`);
  return `- ${parts.join(' ')}`;
}

/**
 * One item per linked LegalCase (Proceeding) row. A flat base weight is
 * enough here — unlike Chronology, older Proceedings aren't inherently
 * less relevant than newer ones, so no recency decay is applied.
 */
export const proceedingsSource: ContextSource = {
  sourceType: 'PROCEEDING',
  async fetch(tenantId: string, matterId: string): Promise<ContextItem[]> {
    const db = new DatabaseClient();
    const rows = await db.execute<ProceedingRow>(
      tenantId,
      `SELECT title, case_number, status, court, stage, hearing_date, created_at
       FROM "LegalCase"
       WHERE matter_id = $1
       ORDER BY created_at DESC`,
      [matterId]
    );
    return rows.map((row) => ({
      sourceType: 'PROCEEDING' as const,
      weight: SOURCE_BASE_WEIGHT.PROCEEDING,
      recency: row.created_at,
      render: () => renderProceeding(row),
    }));
  },
};
