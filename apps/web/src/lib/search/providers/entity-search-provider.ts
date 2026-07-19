import { DatabaseClient } from '@/lib/db/db-client';
import { DEFAULT_PROVIDER_RESULT_LIMIT, type SearchProvider, type SearchProviderOptions, type SearchResultGroup } from './types';

/**
 * Milestone 5's new structured-entity search — pg_trgm similarity-ranked,
 * tenant-scoped exactly like every other query in this codebase
 * (DatabaseClient.execute(tenantId, ...), no executeSystem, relying on
 * each table's own pre-existing FORCE ROW LEVEL SECURITY policy). Four
 * small, independently-testable providers rather than one — matching
 * docs/MILESTONE_5_PLAN.md §2.2's "implementation-time decision": this
 * shape lets search-service.ts's `type` filter simply skip calling a
 * provider entirely rather than post-filtering a combined result set.
 *
 * Each query combines a plain ILIKE substring match (so short queries and
 * exact matches are never missed — pg_trgm's similarity() alone is weak
 * under ~3 characters) with similarity() for ranking. Matched against the
 * schema comment precedent throughout db/schema.sql: additive-only,
 * TEXT columns, no new tables.
 */

const DEFAULT_SIMILARITY_FLOOR = 0.2;

interface MatterSearchRow {
  id: string;
  title: string;
  matter_number: string | null;
  practice_area: string | null;
  score: number;
}

export const matterSearchProvider: SearchProvider = {
  type: 'MATTER',

  async search(tenantId: string, query: string, options: SearchProviderOptions): Promise<SearchResultGroup> {
    const db = new DatabaseClient();
    const limit = options.limit ?? DEFAULT_PROVIDER_RESULT_LIMIT;
    const rows = await db.execute<MatterSearchRow>(
      tenantId,
      `SELECT id, title, matter_number, practice_area,
              GREATEST(
                similarity(title, $1),
                similarity(coalesce(matter_number, ''), $1),
                similarity(coalesce(practice_area, ''), $1),
                similarity(coalesce(description, ''), $1)
              ) AS score
       FROM "Matter"
       WHERE ($2::uuid IS NULL OR id = $2)
         AND (
           title ILIKE '%' || $1 || '%'
           OR matter_number ILIKE '%' || $1 || '%'
           OR practice_area ILIKE '%' || $1 || '%'
           OR description ILIKE '%' || $1 || '%'
           OR similarity(title, $1) > $4
         )
       ORDER BY score DESC, updated_at DESC
       LIMIT $3`,
      [query, options.matterId ?? null, limit, DEFAULT_SIMILARITY_FLOOR]
    );

    return {
      type: 'MATTER',
      providerName: 'MatterSearchProvider',
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        snippet: [row.matter_number, row.practice_area].filter(Boolean).join(' · ') || 'Matter',
        score: row.score,
        href: `/matters/${row.id}`,
      })),
    };
  },
};

interface ProceedingSearchRow {
  id: string;
  title: string;
  case_number: string | null;
  court: string | null;
  stage: string | null;
  score: number;
}

export const proceedingSearchProvider: SearchProvider = {
  type: 'PROCEEDING',

  async search(tenantId: string, query: string, options: SearchProviderOptions): Promise<SearchResultGroup> {
    const db = new DatabaseClient();
    const limit = options.limit ?? DEFAULT_PROVIDER_RESULT_LIMIT;
    const rows = await db.execute<ProceedingSearchRow>(
      tenantId,
      `SELECT id, title, case_number, court, stage,
              GREATEST(
                similarity(title, $1),
                similarity(coalesce(case_number, ''), $1),
                similarity(coalesce(court, ''), $1),
                similarity(coalesce(judge, ''), $1),
                similarity(coalesce(notes, ''), $1)
              ) AS score
       FROM "LegalCase"
       WHERE ($2::uuid IS NULL OR matter_id = $2)
         AND (
           title ILIKE '%' || $1 || '%'
           OR case_number ILIKE '%' || $1 || '%'
           OR court ILIKE '%' || $1 || '%'
           OR judge ILIKE '%' || $1 || '%'
           OR notes ILIKE '%' || $1 || '%'
           OR similarity(title, $1) > $4
         )
       ORDER BY score DESC, updated_at DESC
       LIMIT $3`,
      [query, options.matterId ?? null, limit, DEFAULT_SIMILARITY_FLOOR]
    );

    return {
      type: 'PROCEEDING',
      providerName: 'ProceedingSearchProvider',
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        snippet: [row.case_number, row.court, row.stage].filter(Boolean).join(' · ') || 'Proceeding',
        score: row.score,
        href: `/cases/${row.id}`,
      })),
    };
  },
};

interface ClientSearchRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  score: number;
}

export const clientSearchProvider: SearchProvider = {
  type: 'CLIENT',

  // matterId is deliberately ignored: Client has no matter_id column
  // (Matter references Client, not the reverse) — a Matter-scoped search
  // simply omits 'CLIENT' from its requested `type` list instead (see
  // search-service.ts), so this provider is never called in that case.
  async search(tenantId: string, query: string, options: SearchProviderOptions): Promise<SearchResultGroup> {
    const db = new DatabaseClient();
    const limit = options.limit ?? DEFAULT_PROVIDER_RESULT_LIMIT;
    const rows = await db.execute<ClientSearchRow>(
      tenantId,
      `SELECT id, name, email, phone,
              GREATEST(
                similarity(name, $1),
                similarity(coalesce(email, ''), $1),
                similarity(coalesce(phone, ''), $1)
              ) AS score
       FROM "Client"
       WHERE (
         name ILIKE '%' || $1 || '%'
         OR email ILIKE '%' || $1 || '%'
         OR phone ILIKE '%' || $1 || '%'
         OR similarity(name, $1) > $3
       )
       ORDER BY score DESC, created_at DESC
       LIMIT $2`,
      [query, limit, DEFAULT_SIMILARITY_FLOOR]
    );

    return {
      type: 'CLIENT',
      providerName: 'ClientSearchProvider',
      items: rows.map((row) => ({
        id: row.id,
        title: row.name,
        snippet: [row.email, row.phone].filter(Boolean).join(' · ') || 'Client',
        score: row.score,
        // No dedicated Client page exists yet — left empty rather than a
        // guessed/broken link; the frontend renders this item non-linked.
        href: '',
      })),
    };
  },
};

interface CourtNoteSearchRow {
  id: string;
  case_id: string;
  case_title: string;
  court_forum_display: string;
  note: string;
  score: number;
}

export const courtNoteSearchProvider: SearchProvider = {
  type: 'COURT_NOTE',

  async search(tenantId: string, query: string, options: SearchProviderOptions): Promise<SearchResultGroup> {
    const db = new DatabaseClient();
    const limit = options.limit ?? DEFAULT_PROVIDER_RESULT_LIMIT;
    const rows = await db.execute<CourtNoteSearchRow>(
      tenantId,
      `SELECT cn.id, cn.case_id, lc.title AS case_title, cn.court_forum_display, cn.note,
              GREATEST(
                similarity(cn.note, $1),
                similarity(coalesce(cn.next_actions, ''), $1),
                similarity(cn.court_forum_display, $1)
              ) AS score
       FROM "CourtNote" cn
       JOIN "LegalCase" lc ON lc.id = cn.case_id
       WHERE ($2::uuid IS NULL OR cn.matter_id = $2)
         AND (
           cn.note ILIKE '%' || $1 || '%'
           OR cn.next_actions ILIKE '%' || $1 || '%'
           OR cn.court_forum_display ILIKE '%' || $1 || '%'
           OR similarity(cn.note, $1) > $4
         )
       ORDER BY score DESC, cn.created_at DESC
       LIMIT $3`,
      [query, options.matterId ?? null, limit, DEFAULT_SIMILARITY_FLOOR]
    );

    return {
      type: 'COURT_NOTE',
      providerName: 'CourtNoteSearchProvider',
      items: rows.map((row) => ({
        id: row.id,
        title: `Court Note — ${row.case_title}`,
        snippet: `${row.court_forum_display}: ${row.note}`.slice(0, 220),
        score: row.score,
        href: `/cases/${row.case_id}`,
      })),
    };
  },
};
