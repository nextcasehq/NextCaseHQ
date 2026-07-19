# MILESTONE 5 — UNIVERSAL SEARCH — APPROVED IMPLEMENTATION PLAN

**Status: Approved by the Product Owner. This is the definitive plan — implementation proceeds against this document.**

**Revision history:**
- v1 (read-only audit): established that "Matter Health" (half of this milestone's original name) was already delivered by Milestones 2–3, leaving Universal Search as the real remaining scope; raised four open decisions.
- v2 (this revision): all four decisions resolved by the Product Owner, including a fifth architectural investigation (single-endpoint vs. sibling-endpoint vs. internal-provider-service) resolved in favor of **Option C — a single Search Service with one stable HTTP contract, dispatching internally to independent providers**. Superseded content (the Option A/B/C comparison itself, the sibling-endpoint recommendation, the "Decision Needed" framing) has been removed from this document — see the session record if that comparison is needed for historical reference. This document now states only the approved direction.

**Standing correction, carried forward:** PR #100 (Milestone 4 — Prepare Document) is **not yet merged** as of this revision (`open`, `merged: false`, CI green). Milestone 5 branches from `main` at its pre-PR-#100 state, independent of PR #100's unmerged branch, per the risk this document itself flagged. `apps/web/src/app/matters/[id]/page.tsx` is touched by both PR #100 (Documents panel) and this milestone (search entry point) — a real, ordinary merge-conflict-at-merge-time consideration, not a blocker, flagged so it isn't a surprise later.

---

## 1. Scope (unchanged from the approved audit)

"Matter Health" is functionally satisfied by Milestones 2–3 (`GET /api/matters/[id]/health`, the seven-day preparation view) and is not rebuilt here. This milestone delivers **Universal Search** only: extending search beyond today's document-content-only `hybridSearch()` to Matters, Proceedings, Clients, and Court Notes, with a real `/search` frontend replacing the current 5-line stub.

## 2. Approved Architecture — Option C: Single Search Service, Internal Provider Dispatch

**One public HTTP contract** (`GET /api/search`, extended in place — no sibling endpoint), backed by **one internal orchestration module** that dispatches to independently-testable, independently-swappable providers. This mirrors three patterns already proven in this codebase — `lib/ai/llm-provider.ts` (`LLMProvider` interface), `lib/billing/payment-provider.ts` (`PaymentProvider` interface), `lib/search/embedding-provider.ts` (pluggable embedding provider) — applied a fourth time, not a new pattern invented for this feature.

### 2.1 Module layout

```
apps/web/src/lib/search/
  providers/
    types.ts                      # SearchProvider interface, SearchResultGroup/SearchResultItem types
    document-search-provider.ts   # wraps hybridSearch() UNCHANGED
    entity-search-provider.ts     # NEW — Matter/LegalCase/Client/CourtNote, trigram-based
  search-service.ts               # runSearch(tenantId, query, options) — the ONE orchestration entry point
  hybrid-search.ts                # UNCHANGED — still called directly, in-process, by lib/ai/rag.ts
```

### 2.2 The `SearchProvider` interface

```ts
export interface SearchResultItem {
  id: string;
  title: string;
  snippet: string;
  score: number;          // meaningful only within this provider's own result set — never compared across providers
  href: string;            // e.g. /matters/{id}, /cases/{id}, /documents/{id}
  metadata?: Record<string, unknown>;
}

export interface SearchResultGroup {
  type: string;             // 'DOCUMENT' | 'MATTER' | 'PROCEEDING' | 'CLIENT' | 'COURT_NOTE' | future types
  providerName: string;
  items: SearchResultItem[];
}

export interface SearchProviderOptions {
  matterId?: string | null;
  limit?: number;
}

export interface SearchProvider {
  readonly type: string;
  search(tenantId: string, query: string, options: SearchProviderOptions): Promise<SearchResultGroup>;
}
```

- **`DocumentSearchProvider`** wraps the existing `hybridSearch()` call **unchanged** — same RRF-fused vector+FTS ranking, same `case_id`/`matter_id` filter behavior — and maps its `HybridSearchResult[]` into one `SearchResultGroup` (`type: 'DOCUMENT'`).
- **`EntitySearchProvider`** is new: one provider internally covering Matter/Proceeding/Client/Court Note (or, if cleaner in implementation, four small providers registered together — an implementation-time decision, not an architectural one, since the service treats "a list of registered providers" uniformly either way). Trigram-similarity ranked (§2.3), per-entity-type sub-grouping preserved so the frontend can still render distinct sections per entity type even if internally computed by one provider.
- **`runSearch()`** (`search-service.ts`) calls every registered provider in parallel (`Promise.all`, with per-provider error isolation — one provider failing returns an empty group for that type, never a 500 for the whole request), and returns `{ query, groups: SearchResultGroup[] }`. **Groups are never merged or cross-ranked** — this is the deliberate answer to the RRF-vs-trigram score-incompatibility problem: each provider's score is only ever compared to its own provider's other results.

### 2.3 Ranking Strategy

- **Documents:** unchanged RRF fusion (vector + full-text), inside `DocumentSearchProvider`, calling the untouched `hybridSearch()`.
- **Entities:** PostgreSQL `pg_trgm` `similarity()` per matched column, best-matching-field-per-row, ties broken by recency (`updated_at`/`created_at` descending). No cross-provider score normalization is attempted anywhere in this architecture — grouped display (§6) makes that unnecessary.

### 2.4 Filtering

- `matter_id` — reused exactly as-is, passed through to every provider that understands it (Document via `hybridSearch()`'s existing filter, Entity via a straightforward `WHERE matter_id = $1` on `LegalCase`/`CourtNote`, and Matter itself via `id = $1` when scoping to "this Matter's own record").
- `type` (optional, additive) — restricts which registered providers run, e.g. `type=document,matter` for a Matter-scoped search box that shouldn't also search unrelated Clients.
- No date-range or other faceted filtering in this milestone — not named in approved scope.

## 3. Database Changes

Additive only, following this file's established idempotent-migration convention:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS matter_title_trgm_idx ON "Matter" USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS matter_description_trgm_idx ON "Matter" USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS legalcase_title_trgm_idx ON "LegalCase" USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS legalcase_notes_trgm_idx ON "LegalCase" USING GIN (notes gin_trgm_ops);
CREATE INDEX IF NOT EXISTS client_name_trgm_idx ON "Client" USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS courtnote_note_trgm_idx ON "CourtNote" USING GIN (note gin_trgm_ops);
```

No new table. No RLS change — every queried table already carries `FORCE ROW LEVEL SECURITY` (`Matter`, `LegalCase`, `Client`, `CourtNote`, all pre-existing). `CREATE INDEX` (not `CONCURRENTLY`) matches this file's existing precedent for every prior migration in this codebase (`db/schema.sql` has never used `CONCURRENTLY`, since `scripts/db/migrate.js` runs the whole file as one script) — flagged as a conscious consistency choice, revisited only if a real production migration-time lock contention issue is observed.

## 4. API Contract

`GET /api/search?q=&matter_id=&type=&limit=`

- **Backward compatible in spirit, additive in shape.** Since no real frontend consumer of the current `{results, query, limit, offset}` shape exists yet (confirmed by the consumer inspection — the only real callers are the route handler itself and `lib/ai/rag.ts`'s direct, in-process call to the underlying `hybridSearch()` function, a different layer entirely), the response is restructured to `{ query, groups: SearchResultGroup[] }`. `lib/ai/rag.ts` is **unaffected** — it never calls this route; it calls `hybridSearch()` directly and continues to do so unchanged.
- `requireSession` + zod-validated query params, matching every other route in this codebase.
- Read-only — no new mutation endpoint anywhere in this milestone.

## 5. Security and Tenant Isolation

- Every provider query runs through `DatabaseClient.execute(tenantId, ...)` — no `executeSystem` (RLS-bypassing) calls anywhere in this feature.
- `Matter`, `LegalCase`, `Client`, `CourtNote` already carry `FORCE ROW LEVEL SECURITY` — no new isolation mechanism required.
- Zero new write paths.
- A search result snippet exposes nothing the advocate couldn't already read on that entity's own page — no new exposure surface.
- Per-provider error isolation (§2.2) means a single provider's failure can never leak a stack trace or partial cross-tenant state into the response — it degrades to an empty group for that type.

## 6. UX Flow

1. **Entry:** a search affordance linked from `/matters`, plus a Matter-scoped search box on `/matters/[id]` (pre-filled `matter_id`, `type` restricted to Document/Proceeding/Court Note — not other Matters/Clients). No persistent nav entry — approved as out of scope.
2. **`/search` page** replaces the 5-line stub: one input, one call to the one `GET /api/search` endpoint (no client-side fan-out or merge logic — the service already did that server-side, per Option C's whole point).
3. **Results:** rendered by iterating `groups[]` — one section per entity type, mobile-first single-column cards, type badge, title, snippet, link into the real entity page. Never a dense table, never a cross-type merged ranking.
4. **Empty state:** "No results for '…' — try a case number, client name, or court."
5. **Loading state:** existing spinner pattern.
6. **No AI summarization of results** — literal matches only; `POST /api/ai/ask` remains the separate, existing AI answer-synthesis surface.

## 7. SEO/GEO Considerations

- `/search` is authenticated, tenant-private — `robots: noindex`, same Milestone-4-established `layout.tsx`/`page.tsx` split (server-rendered shell/breadcrumb + client-rendered result body).
- No JSON-LD `SearchAction` — not a public search surface.
- No new structured vocabulary/Knowledge-Graph entity introduced by this milestone — the `type` discriminant on `SearchResultGroup` is an internal/API concern, not a public taxonomy; if it later needs to become one, it follows `lib/domain/document-type.ts`'s established structured-constant pattern, not ad hoc strings.

## 8. Test Plan

- **Provider unit tests:** `DocumentSearchProvider` (thin wrapper — asserts it calls `hybridSearch()` unchanged and maps results correctly), `EntitySearchProvider` (per-entity-type relevance/recency ordering, cross-tenant isolation, empty-query handling).
- **`search-service.ts` dispatch tests:** all registered providers called in parallel; one provider throwing is isolated (empty group returned, other groups unaffected, no 500); `type` filter correctly restricts which providers run; `matter_id` correctly passed through to every provider that accepts it.
- **`GET /api/search` route tests:** auth required; zod validation; response shape (`{query, groups}`); RLS cross-tenant isolation end-to-end.
- **Regression:** `lib/ai/rag.ts`'s existing test suite must pass unchanged — proof `hybridSearch()`'s direct call path was never touched.
- **Manual Playwright verification:** real login → Matter with linked Proceedings/Documents/Court Notes → search from `/search` and from a Matter-scoped box → confirm grouped results, correct links, empty state, cross-tenant isolation (a second tenant's data never appears).

## 9. Implementation Phases

1. **Phase 1 — Search Service backend.** `SearchProvider` interface, `DocumentSearchProvider` (wraps `hybridSearch()`), `EntitySearchProvider` (new, trigram-based), `search-service.ts` (`runSearch()`), `pg_trgm` migration, extended `GET /api/search` route. Full test coverage per §8.
2. **Phase 2 — `/search` frontend + Matter-scoped entry.** Real page replacing the stub, grouped result cards, empty/loading states, search box on `/matters/[id]`. No nav change.
3. **Phase 3 (future, not scheduled in this milestone) — additional providers.** Citation/statute/precedent, AI-assisted search, or a heavier full-text (`tsvector`) upgrade to `EntitySearchProvider` if trigram relevance proves insufficient in practice — all register against the same `SearchProvider` interface with zero HTTP contract change and zero required frontend rework.

## 10. Explicit Out-of-Scope Items

- Rebuilding or duplicating Matter Health (already delivered).
- Any navigation/IA change — functional `/search` route only.
- `/dashboard/search` — left untouched.
- Elasticsearch/OpenSearch/Meilisearch/Typesense or any external search engine — Postgres + `pg_trgm` only.
- AI-generated result summarization or answer synthesis.
- Citation/statute/precedent search — no underlying data exists yet; a future `SearchProvider` implementation, not this milestone's.
- Date-range or other faceted filtering beyond `type`/`matter_id`.
- Search across audit/ledger tables (`AiUsageEvent`, `DocumentAccessEvent`).
- Any commercial/entitlement gating — search remains core free usage.
- Milestone 6 (Typist Collaboration) — unchanged, still sequenced after this milestone.

## 11. Acceptance Criteria

1. `GET /api/search` returns grouped, per-provider results; `lib/ai/rag.ts` and its existing tests are unaffected by this milestone.
2. `/search` is a real, working page; `/dashboard/search` and the persistent nav are untouched.
3. Adding a future provider requires no HTTP contract change and no change to any existing consumer — demonstrated in review by the shape of `DocumentSearchProvider`/`EntitySearchProvider` both conforming to one unchanged `SearchProvider` interface.
4. RLS/tenant isolation verified by test for every new query.
5. Full test suite, typecheck, build, and lint pass with zero regressions; Playwright verification performed against a real local stack before PR.
6. No merge until CI is green and Product Owner approval is received, per this workspace's standard workflow.
