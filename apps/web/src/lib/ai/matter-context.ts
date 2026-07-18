import { DatabaseClient } from '@/lib/db/db-client';

/**
 * Seeds the future "Matter Memory" — a text summary of everything Milestone
 * 1 actually knows about a Matter, ready to be interpolated into a RAG
 * prompt (see lib/ai/rag.ts) once a caller passes matter_id through
 * /api/ai/ask. That wiring is deliberately out of Milestone 1's own scope;
 * this function's job is only to assemble the context correctly from real
 * data — the Matter record, its linked Proceedings, and its Chronology —
 * never fabricated content.
 */

interface MatterContextRow {
  title: string;
  matter_number: string | null;
  engagement_type: string;
  practice_area: string | null;
  status: string;
  client_name: string | null;
  opposing_party_name: string | null;
  court: string | null;
  description: string | null;
}

interface ProceedingRow {
  title: string;
  case_number: string | null;
  status: string;
  court: string | null;
  stage: string | null;
}

interface EventRow {
  event_date: string;
  description: string;
}

export interface MatterContext {
  matterId: string;
  found: boolean;
  summary: string;
}

function buildSummary(
  matter: MatterContextRow,
  proceedings: ProceedingRow[],
  events: EventRow[]
): string {
  const lines: string[] = [];
  lines.push(`Matter: ${matter.title}`);
  if (matter.matter_number) lines.push(`Matter number: ${matter.matter_number}`);
  lines.push(`Engagement type: ${matter.engagement_type}`);
  lines.push(`Status: ${matter.status}`);
  if (matter.practice_area) lines.push(`Practice area: ${matter.practice_area}`);
  if (matter.client_name) lines.push(`Client: ${matter.client_name}`);
  if (matter.opposing_party_name) lines.push(`Opposing party: ${matter.opposing_party_name}`);
  if (matter.court) lines.push(`Court: ${matter.court}`);
  if (matter.description) lines.push(`Description: ${matter.description}`);

  if (proceedings.length > 0) {
    lines.push('', 'Linked proceedings:');
    for (const p of proceedings) {
      const parts = [p.title];
      if (p.case_number) parts.push(`(${p.case_number})`);
      parts.push(`— ${p.status}`);
      if (p.court) parts.push(`at ${p.court}`);
      if (p.stage) parts.push(`[${p.stage}]`);
      lines.push(`- ${parts.join(' ')}`);
    }
  }

  if (events.length > 0) {
    lines.push('', 'Chronology:');
    for (const e of events) {
      lines.push(`- ${e.event_date}: ${e.description}`);
    }
  }

  return lines.join('\n');
}

/**
 * Assembles a Matter's context as a single text block. Returns
 * found: false (rather than throwing) when the matter doesn't exist or
 * doesn't belong to the given tenant, since RLS makes those
 * indistinguishable — same as any other tenant-scoped lookup in this app.
 */
export async function getMatterContext(tenantId: string, matterId: string): Promise<MatterContext> {
  const db = new DatabaseClient();

  const [matterRows, proceedingRows, eventRows] = await Promise.all([
    db.execute<MatterContextRow>(
      tenantId,
      `SELECT m.title, m.matter_number, m.engagement_type, m.practice_area, m.status,
              c.name AS client_name, m.opposing_party_name, m.court, m.description
       FROM "Matter" m LEFT JOIN "Client" c ON c.id = m.client_id
       WHERE m.id = $1`,
      [matterId]
    ),
    db.execute<ProceedingRow>(
      tenantId,
      `SELECT title, case_number, status, court, stage
       FROM "LegalCase"
       WHERE matter_id = $1
       ORDER BY created_at DESC`,
      [matterId]
    ),
    db.execute<EventRow>(
      tenantId,
      `SELECT event_date, description
       FROM "MatterEvent"
       WHERE matter_id = $1
       ORDER BY event_date DESC, created_at DESC`,
      [matterId]
    ),
  ]);

  if (matterRows.length === 0) {
    return { matterId, found: false, summary: '' };
  }

  return {
    matterId,
    found: true,
    summary: buildSummary(matterRows[0], proceedingRows, eventRows),
  };
}
