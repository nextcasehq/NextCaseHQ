import { DatabaseClient } from '@/lib/db/db-client';
import type { ContextItem, ContextSource } from '../types';
import { SOURCE_BASE_WEIGHT } from '../types';

interface MatterSummaryRow {
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

function renderMatterSummary(row: MatterSummaryRow): string {
  const lines: string[] = [];
  lines.push(`Matter: ${row.title}`);
  if (row.matter_number) lines.push(`Matter number: ${row.matter_number}`);
  lines.push(`Engagement type: ${row.engagement_type}`);
  lines.push(`Status: ${row.status}`);
  if (row.practice_area) lines.push(`Practice area: ${row.practice_area}`);
  if (row.client_name) lines.push(`Client: ${row.client_name}`);
  if (row.opposing_party_name) lines.push(`Opposing party: ${row.opposing_party_name}`);
  if (row.court) lines.push(`Court: ${row.court}`);
  if (row.description) lines.push(`Description: ${row.description}`);
  return lines.join('\n');
}

/**
 * Always produces zero or one item — the Matter itself never has more than
 * one summary. Zero items means the matter doesn't exist for this tenant
 * (or belongs to another tenant, indistinguishable under RLS); that's the
 * AI Context Gateway's concern to surface as a real 404 (Milestone 2C),
 * not this source's.
 */
export const matterSummarySource: ContextSource = {
  sourceType: 'MATTER_SUMMARY',
  async fetch(tenantId: string, matterId: string): Promise<ContextItem[]> {
    const db = new DatabaseClient();
    const rows = await db.execute<MatterSummaryRow>(
      tenantId,
      `SELECT m.title, m.matter_number, m.engagement_type, m.practice_area, m.status,
              c.name AS client_name, m.opposing_party_name, m.court, m.description
       FROM "Matter" m LEFT JOIN "Client" c ON c.id = m.client_id
       WHERE m.id = $1`,
      [matterId]
    );
    if (rows.length === 0) return [];
    const row = rows[0];
    return [
      {
        sourceType: 'MATTER_SUMMARY',
        weight: SOURCE_BASE_WEIGHT.MATTER_SUMMARY,
        render: () => renderMatterSummary(row),
      },
    ];
  },
};
