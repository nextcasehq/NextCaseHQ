import { DatabaseClient } from '@/lib/db/db-client';
import type { ContextItem, ContextSource } from '../types';
import { SOURCE_BASE_WEIGHT } from '../types';

interface ParticipantRow {
  role: string;
  user_email: string;
  user_name: string | null;
  created_at: string;
}

function renderParticipant(row: ParticipantRow): string {
  return `- ${row.user_name || row.user_email} (${row.role})`;
}

/** One item per MatterParticipant row, joined to User for a display name. */
export const participantsSource: ContextSource = {
  sourceType: 'PARTICIPANT',
  async fetch(tenantId: string, matterId: string): Promise<ContextItem[]> {
    const db = new DatabaseClient();
    const rows = await db.execute<ParticipantRow>(
      tenantId,
      `SELECT mp.role, mp.created_at, u.email AS user_email, u.name AS user_name
       FROM "MatterParticipant" mp
       JOIN "User" u ON u.id = mp.user_id
       WHERE mp.matter_id = $1
       ORDER BY mp.created_at ASC`,
      [matterId]
    );
    return rows.map((row) => ({
      sourceType: 'PARTICIPANT' as const,
      weight: SOURCE_BASE_WEIGHT.PARTICIPANT,
      recency: row.created_at,
      render: () => renderParticipant(row),
    }));
  },
};
