import { DatabaseClient } from '@/lib/db/db-client';
import type { ContextItem, ContextSource } from '../types';
import { SOURCE_BASE_WEIGHT } from '../types';

interface ChronologyRow {
  event_date: string;
  description: string;
}

const RECENCY_DECAY_PER_POSITION = 6;
const MIN_WEIGHT = 15;

function renderChronologyEntry(row: ChronologyRow): string {
  return `- ${row.event_date}: ${row.description}`;
}

/**
 * One item per MatterEvent row. Unlike the other sources, chronology
 * entries decay in weight by position (rows already arrive newest-first):
 * the most recent entry keeps the full base weight so a recent hearing can
 * outrank a Proceeding or Participant, but a years-old entry sinks below
 * both rather than crowding out the rest of a long-running matter's
 * context — floored so it's never treated as irrelevant, just deprioritized.
 */
export const chronologySource: ContextSource = {
  sourceType: 'CHRONOLOGY_ENTRY',
  async fetch(tenantId: string, matterId: string): Promise<ContextItem[]> {
    const db = new DatabaseClient();
    const rows = await db.execute<ChronologyRow>(
      tenantId,
      // to_char avoids the pg driver's default DATE->JS Date parsing (which
      // returns a Date object, not a string, and is sensitive to the
      // server's local timezone) — event_date arrives as a plain
      // YYYY-MM-DD string, matching ContextItem.recency's contract.
      `SELECT to_char(event_date, 'YYYY-MM-DD') AS event_date, description
       FROM "MatterEvent"
       WHERE matter_id = $1
       ORDER BY event_date DESC, created_at DESC`,
      [matterId]
    );
    return rows.map((row, index) => ({
      sourceType: 'CHRONOLOGY_ENTRY' as const,
      weight: Math.max(MIN_WEIGHT, SOURCE_BASE_WEIGHT.CHRONOLOGY_ENTRY - index * RECENCY_DECAY_PER_POSITION),
      recency: row.event_date,
      render: () => renderChronologyEntry(row),
    }));
  },
};
