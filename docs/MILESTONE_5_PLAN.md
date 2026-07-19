# MILESTONE 5 — MATTER HEALTH AND UNIVERSAL SEARCH — READ-ONLY AUDIT & PLAN

**Status: DRAFT — for Product Owner review. No implementation has begun. This document is read-only analysis; zero production code was touched to produce it.**

**Correction to the record before anything else:** the resume brief for this audit stated PR #100 (Milestone 4 — Prepare Document) "has been merged into main." I checked directly against GitHub before starting this audit and that is not accurate — as of this writing, **PR #100 is still `open`, `merged: false`**, on branch `claude/milestone-4-documents-hp1glf`, with CI green and no blocking review comments. This document analyzes the repository *as it will exist once PR #100 lands* (its branch is fully validated — 563 tests, typecheck, build, lint, and manual Playwright verification all passed), since that is the only coherent baseline to plan Milestone 5 against. Nothing below should be read as confirming PR #100 is actually merged; that still needs to happen first, and this plan's "already exists" claims for Milestone 4 capabilities are conditional on that merge.

---

## 1. Current Repository Assessment (post–PR #100)

Governing sequence, unchanged since `docs/PRODUCT_DIRECTION_IMPLEMENTATION_PLAN.md` §2: Court Note (M1) → Hearing-Driven Matter Record (M2) → Seven-Day Preparation (M3) → Prepare Document (M4) → **Matter Health and Universal Search (M5)** → Typist Collaboration (M6). M1–M4 are each individually merged or (M4) validated-and-pending-merge. Milestone 5 is next in the approved order — no milestone has been skipped or reordered.

**One material scope finding, not assumed from the six-milestone-old plan alone:** the Implementation Plan named Milestone 5 "Matter Health **and** Universal Search" back when neither existed. Since then, Milestone 2 (`GET /api/matters/[id]/health`, live-derived from `CourtNote`/`LegalCase`/`MatterTask`, already rendered as the "Matter Health" card on `/matters/[id]`) and Milestone 3 (the seven-day preparation view, `GET /api/matters/[id]/preparation`) have already delivered the "Matter Health" half of this milestone's original name. Re-reading Milestone 5 today as "build Matter Health" would duplicate real, shipped work. **The genuine remaining gap is Universal Search only** — this is flagged explicitly in §11 rather than silently re-scoping the milestone without saying so.

| Building block | State | Evidence |
|---|---|---|
| `hybridSearch()` / `GET /api/search` | **Real, but document-content-only.** pgvector cosine similarity + Postgres full-text (RRF-fused), tenant-scoped, `case_id`/`matter_id` filters. Queries only `DocumentChunkVector` — no Matter/Proceeding/Client/Court-Note text is indexed or searchable. | `lib/search/hybrid-search.ts`, `app/api/search/route.ts` |
| `/search` (top-level route) | **Static 5-line stub.** `'use client'; export default function SearchPage() { return <div>...Global Search</div>; }` — no form, no fetch, no state. | `app/search/page.tsx` |
| `/dashboard/search` | **Fuller-looking but fully disconnected.** ~300 lines, real component state, a hardcoded in-file `legalDatabase` array of fake statute/exhibit/precedent results — calls no backend at all. Lives inside the legacy `/dashboard/*` shell. | `app/dashboard/search/page.tsx` |
| Matter Health | **Real**, delivered by M2/M3 — `stage`, `last_hearing_date`, `last_court_forum_display`, `last_note`, `next_hearing_date`, `pending_action_count`, `needs_attention`, all live-derived (no stored snapshot to go stale). | `app/api/matters/[id]/health/route.ts` |
| Structured searchable entity fields | `LegalCase`: `title`, `case_number`, `court`, `judge`, `stage`, `notes`. `Matter`: `title`, `matter_number`, `practice_area`, `opposing_party_name`, `opposing_counsel`, `court`, `bench`, `judge`, `description`. `Client`: `name`, `email`, `phone`, `notes`. `CourtNote`: `note`, `next_actions`, `court_forum_display`. All plain `TEXT` — **no tsvector/GIN index, no embedding column on any of these tables today.** | `db/schema.sql` |
| Document Type structured entity (Milestone 4) | `lib/domain/document-type.ts` — `DOCUMENT_TYPES`/`DOCUMENT_CATEGORIES`, a Knowledge-Graph-ready pattern Milestone 5 should follow for any new structured vocabulary, not reinvent. | pending PR #100 |
| RAG / AI Chat | Reuses `hybridSearch()` directly (in-process, not HTTP) — any change to `hybridSearch()`'s signature or default behavior has a second real caller (`lib/ai/rag.ts`) to keep backward compatible, not just the `/api/search` route. | `lib/ai/rag.ts` |
| Navigation | `Navbar`/`NavbarWrapper` is still the marketing-menu-shaped nav flagged as stale in the UX Blueprint (§21.1/21.2) — "Search" is not currently a primary nav destination anywhere real. Blueprint's four-destination IA (Home/Prepare/Matters/Search) remains a **standing, not-yet-approved-for-implementation** recommendation (Blueprint §25.5: "No engineering work begins against this document until sign-off"). | `components/Navbar.tsx`, `ADVOCATE_OS_UX_BLUEPRINT.md` |

---

## 2. Existing Capabilities That Can Be Reused

- **`hybridSearch()` itself** — the RRF fusion mechanism, tenant-scoping pattern, and `case_id`/`matter_id` AND-composed filter precedent are the direct template for adding new entity types; the function is not being replaced, only extended (matching the Blueprint §12 and Implementation Plan §"Milestone 5" instruction: "extend, not replace").
- **`DatabaseClient.execute(tenantId, sql, params)` RLS pattern** — every new query this milestone needs follows this unchanged.
- **`requireSession`/`isTrustedOrigin`/zod route-handler shape** — no new security primitive required for a read-only search endpoint.
- **The AI Context Gateway (`lib/ai/context/gateway.ts`)** — if Universal Search results ever need to feed an AI feature (out of scope for this milestone, flagged for awareness only), the Gateway is still the single mandatory entry point; a search feature must not become a second, parallel way to read Matter data into an AI prompt.
- **`lib/domain/document-type.ts` pattern** — if Milestone 5 introduces any new fixed vocabulary (e.g., a "result type" enum for grouping search results), follow this exact structured-constant shape, not a new one.
- **Client-side fetch-then-filter list pattern** (`/matters/page.tsx`) — reusable for any small, local result-refinement UI (e.g., client-side "recent searches"), per Blueprint §20.
- **`EmptyState`/`BrandBackground` components** — direct reuse for the real `/search` page's empty/loading states, per Blueprint §18.
- **Matter Health (§1 above)** — already complete; Milestone 5 should surface it more prominently in search results (e.g., a Matter result card showing its health at a glance) rather than rebuild it.

---

## 3. Architectural Gaps

1. **No full-text/vector index exists on any non-document table.** `Matter`, `LegalCase`, `Client`, `CourtNote` are all plain `TEXT` columns with no `tsvector`/GIN index and no embedding column. Extending `hybridSearch()` to these tables is not a one-line filter change like `matter_id` was — it requires either (a) a real per-table full-text index (`tsvector` + GIN, mirroring `DocumentChunkVector.content_tsv`'s existing pattern) plus a UNION-based fused query, or (b) a simpler ILIKE-based structured-field search for these tables kept separate from the vector-based document path and merged only at the result-list level. This is the single biggest technical decision this milestone must make explicitly (see §10).
2. **No unified "search result" shape exists across entity types.** `DocumentChunkVector` results carry `envelope_id`/`chunk_index`/`content`/`score`; a Matter/Client/Court-Note result would need a different shape entirely. A real `SearchResult` union type (entity type + id + title + snippet + link) does not exist yet and is new work, not a reuse.
3. **`/search` and `/dashboard/search` are two disconnected, competing surfaces** — exactly the "duplicated workflows" risk the Blueprint warns against (§21.3). This milestone must pick one (the top-level `/search`, per the Blueprint's four-destination IA) and either retire or leave `/dashboard/search` alone as legacy — not build a third.
4. **No global search entry point exists in the persistent nav.** Given the Blueprint's navigation-unification item is explicitly **not yet approved** (Blueprint §25.2, "decided by the Product Owner... not fixed by this document"), Milestone 5 cannot assume a nav change ships alongside it — the search page itself must be reachable and usable via direct URL/existing links without depending on an unapproved nav overhaul.
5. **Query performance across heterogeneous entity types** — already flagged as the Implementation Plan's own named risk for this milestone (§227/M5 "Risk: Medium (query performance across heterogeneous entity types)"). A single query fanning out across 4+ tables plus the existing vector/FTS document path needs an explicit performance budget, not an assumption that it will be fast because each individual query is.

---

## 4. Security Considerations

- **Tenant isolation is the load-bearing requirement, not a bonus.** Every new table this milestone queries (`Matter`, `LegalCase`, `Client`, `CourtNote`) already has `FORCE ROW LEVEL SECURITY` — the existing `DatabaseClient.execute(tenantId, ...)` pattern is sufficient and must not be bypassed via `executeSystem` (which is documented as safe only against `Tenant`/`User`, the two RLS-free tables) for any cross-entity fan-out query.
- **No new IDOR surface expected** if the pattern above is followed — a search result must carry only fields the querying tenant's own RLS already permits; there is no new "share a result across tenants" concept in this milestone.
- **`CourtNote` is append-only and privileged content** (hearing notes, next actions) — if Court Notes become searchable, the search result snippet must not leak more than the advocate would see on the Proceeding page itself (i.e., no new exposure surface, same RLS-scoped read).
- **No new write path** — Universal Search is read-only by definition; this milestone should introduce zero new mutation endpoints (a genuine simplification relative to Milestones 1–4).
- **Rate limiting / abuse:** `GET /api/search` today has no explicit rate limit of its own (relies on session auth only). A fan-out query across 4+ tables is more expensive per call than the current single-table query — worth an explicit decision (not silently assumed) on whether this milestone needs a rate limit, or whether that's deferred as a documented, non-blocking gap (matching this codebase's existing practice of flagging rather than silently skipping known gaps).
- **Query injection:** all existing query construction uses parameterized `$n` placeholders throughout this codebase; any new fan-out query must follow the same discipline — no string-interpolated identifiers, matching `db-client.ts`'s own documented `set_config` precedent.

---

## 5. UX Implications

- **A real `/search` page must replace the 5-line stub** — this is the milestone's primary, visible deliverable. Per the Blueprint (§12): mobile-first single-column result cards grouped by entity type (Matter / Document / Court Note) with a type icon and one-line snippet, never a dense table; an empty state that teaches the advocate what the product can now find ("try a case number, client name, or court").
- **Matter-scoped search** — reusing the existing `matter_id` filter precedent, a search box inside a Matter should default to searching within that Matter (documents + its own Court Notes), not the whole tenant, matching the existing `case_id`/`matter_id` filter pattern already proven on `GET /api/documents`/`GET /api/search`.
- **No navigation change is bundled by default** — since navigation unification is a separate, not-yet-approved decision (§3.4), this milestone's UX must stand on its own: reachable from wherever a search affordance already sensibly fits today (e.g., a link from `/matters`), not contingent on a new persistent nav bar shipping first. If the Product Owner wants to approve navigation unification alongside this milestone, that is an explicit joint decision to make now, not an assumption to bake in silently.
- **No AI-generated summarization of results** — per the Blueprint's Trust and Legal Control standing constraint (§22a) and this milestone's own "no AI recommendations" precedent from M1/M3, search results are literal matches with snippets, not an AI-synthesized answer (that already exists, separately, as `POST /api/ai/ask`/RAG — this milestone must not blur the two).
- **Recent/suggested searches** — client-side only (`localStorage`), no new backend, per Blueprint §12.

---

## 6. Database Impact

Two real options — this plan does not pick one, per "do not implement anything" / awaiting Product Owner direction (see §10 for the explicit decision this raises):

**Option A — Real full-text indexes on structured entities (heavier, matches the Blueprint's literal recommendation).**
Additive `tsvector` + GIN index columns on `Matter`, `LegalCase`, `Client` (and optionally `CourtNote`), generated/kept-in-sync the same way `DocumentChunkVector.content_tsv` already is. No new table. `hybridSearch()` (or a new sibling function) unions per-table ranked results. Migration risk: low (additive, generated columns, `CREATE INDEX CONCURRENTLY`-style caution recommended given these tables now have real production-shaped row counts from M1–M4, unlike `DocumentChunkVector` when it was first extended).

**Option B — Lightweight `ILIKE`/trigram search on structured fields, separate from the vector path (simpler, smaller migration).**
No new column on `Matter`/`LegalCase`/`Client`; a `pg_trgm` GIN index (or even a plain sequential scan at today's likely row counts) over the existing `TEXT` columns, fused with document results only at the application layer (interleaved by relevance, not a single SQL-level RRF fusion). Smaller migration, but the "one Reciprocal-Rank-Fusion query" architecture the Blueprint describes would become two separate query shapes merged in code instead — a real architectural tradeoff to surface explicitly, not silently simplify away.

**No changes required to:** `DocumentChunkVector`, `AiUsageEvent`, `DocumentAccessEvent`, RLS policies on any existing table (both options above are additive-only), or any Milestone 1–4 table's write path.

---

## 7. API Impact

- **`GET /api/search` is extended, not replaced** — the existing `q`/`case_id`/`matter_id`/`limit`/`offset` contract must keep working byte-for-byte for `lib/ai/rag.ts`'s in-process caller and any existing document-only consumer; new entity-type results are additive to the response shape (e.g., a `type` discriminant field per result, or a separate `entities` array alongside the existing `results` array — an explicit decision, not assumed).
- **No changes anticipated to** `/api/documents*`, `/api/matters*`, `/api/cases*`, `/api/ai/*` request/response contracts — Universal Search reads existing tables, it does not change how they're written.
- **Possible new, additive query parameter** — an entity-type filter (`type=matter,document,court_note`) if the UX calls for scoped search, mirroring the existing `case_id`/`matter_id` optional-filter precedent.
- **No new route is strictly required** if `GET /api/search` is extended in place; a case for a separate `GET /api/search/entities` (structured-only, no document vector search) is worth considering if Option B's two-query-shapes architecture (§6) is chosen, to keep the existing document-search path completely untouched rather than conditionally branching inside one handler.

---

## 8. SEO/GEO Implications

Continuing Milestone 4's established pattern (`docs/MILESTONE_4_PREPARE_DOCUMENT_PLAN.md` §9) — architectural hooks only, no behavior change, no public exposure of private data:

- `/search` is another authenticated, tenant-private route — `robots: noindex`, same as `/documents/new`/`/documents/[id]`, not a public-facing page.
- If `/search` is rebuilt as a real page (§5), it should follow the same segment-`layout.tsx` split (server-rendered metadata/breadcrumb shell + client-rendered result body) Milestone 4 established, rather than reverting to the old single-file client-only pattern.
- No JSON-LD `SearchAction`/`WebSite` schema should be added, since this is not a public search surface — flagged explicitly so it isn't silently assumed later when a real public marketing/SEO layer is eventually built.
- **Legal Knowledge Graph relevance:** if Option A (§6) is chosen, the same structured-entity discipline from Milestone 4 (`lib/domain/document-type.ts`) applies to any new fixed vocabulary this milestone introduces (e.g., a result-type enum) — no ad hoc string literals scattered across the search UI.
- No new public route, no new public content, no change to the existing public marketing pages' SEO.

---

## 9. Risks

1. **Scope-name mismatch (§1)** — "Matter Health and Universal Search" as a milestone name is stale; proceeding without flagging the already-shipped Matter Health half risks either wasted duplicate work or an under-scoped plan if the Product Owner assumed both halves were still open. Flagged here explicitly.
2. **Query performance across heterogeneous entity types** — the Implementation Plan's own named risk for this milestone; a naive fan-out query at real (if still modest) production row counts could regress `/api/search`'s current, fast, document-only latency. Needs a concrete performance budget and test before shipping, not an assumption.
3. **Full-text index migration on already-populated tables** (`Matter`, `LegalCase`, `Client` now have real rows from M1–M4, unlike when `DocumentChunkVector` was first extended in Sprint 3B against a much smaller dataset) — Option A (§6) carries real migration-time risk that Option B does not; this is a genuine tradeoff, not a formality.
4. **Two-competing-search-UI risk repeats itself if not resolved explicitly** (§3.3) — building a third, better `/search` without an explicit decision on `/dashboard/search`'s fate reproduces exactly the "two front doors" problem the Blueprint spent an entire section warning about for the wider product.
5. **Navigation dependency ambiguity** — if the Product Owner expects Universal Search to be reachable via a real persistent nav entry, that requires resolving the still-open navigation-unification question (Blueprint §21.1/22 item 1) first or in parallel — not assumed silently either way.
6. **PR #100 is not yet merged** (see the correction at the top of this document) — Milestone 5 work should not begin on top of an unmerged Milestone 4 branch in a way that creates a second, harder-to-review combined diff; standard practice (already followed by M1–M4) is to branch Milestone 5 from `main` only after PR #100 is actually merged.

---

## 10. Explicit Decision Needed Before Implementation

Consistent with this codebase's established practice (e.g., the "Decision Needed: Webhook Rate Limit" entry in `docs/PENDING_INTEGRATION_REGISTER.md`) of surfacing real open questions rather than picking silently:

**Decision 1 — Option A vs. Option B (§6):** real per-table full-text indexes fused via RRF (matches the Blueprint's literal description, more consistent architecture, higher migration risk) vs. a lighter `ILIKE`/trigram structured search merged at the application layer (smaller migration, two query shapes instead of one). Recommendation, not a unilateral choice: **Option B first**, with Option A as a documented future upgrade path if search quality on structured fields proves insufficient in practice — matching this codebase's repeated precedent (embedding provider, payment provider, LLM provider) of shipping the simpler real thing first and upgrading behind an unchanged interface, rather than over-building before real usage data exists.

**Decision 2 — `/dashboard/search`'s fate (§3.3, §9.4):** leave it entirely alone as untouched legacy (lowest risk, matches Milestone 1–4's consistent "do not touch `/dashboard/*`" precedent), or explicitly deprecate/redirect it. Recommendation: **leave it untouched**, consistent with every prior milestone's explicit exclusion of `/dashboard/*` — its retirement is Blueprint §22 item 1's (not-yet-approved) navigation-unification territory, not this milestone's.

**Decision 3 — Result-shape/API contract (§7):** additive field on the existing `results` array vs. a new parallel `entities` array vs. a new sibling endpoint. Recommendation: a new sibling endpoint (`GET /api/search/entities` or similar) if Option B is chosen, keeping `GET /api/search`'s existing document-only contract (and its `lib/ai/rag.ts` caller) completely unchanged, with the `/search` page's frontend calling both and merging client-side.

**Decision 4 — Whether this milestone bundles any navigation change.** Recommendation: **no** — ship `/search` as a real, working, directly-linkable page first (reachable from `/matters` and a direct URL), and treat Blueprint §22 item 1 (navigation unification) as its own separate, still-pending Product Owner decision, exactly as the Blueprint itself frames it.

---

## 11. Recommended Implementation Plan (pending approval)

1. **PR 5A — Structured entity search (backend only).** Implement Decision 1 (recommended: Option B), a new `searchEntities()` function (or equivalent) covering `Matter`/`LegalCase`/`Client`/`CourtNote`, tenant-scoped, additive — zero change to `hybridSearch()`'s existing signature/behavior. New tests: cross-tenant isolation per entity type, relevance ordering, empty-query/empty-result handling, performance smoke test at a realistic row count.
2. **PR 5B — `/search` real frontend.** Replace the 5-line stub with a real page (Milestone-4-style `layout.tsx`/`page.tsx` split, `noindex`, breadcrumb), calling both the existing `GET /api/search` (documents) and the new structured-entity search (Decision 3), merged and grouped by entity type client-side. Matter-scoped search entry point added to `/matters/[id]` (reusing the existing `matter_id` filter). No nav change (Decision 4).
3. **PR 5C (optional, only if real usage shows Option B's search quality is insufficient) — Option A upgrade.** Real per-table `tsvector`/GIN indexes, RRF-fused with the existing document path, behind the same `searchEntities()`/sibling-endpoint interface established in 5A — no frontend change required if 5B's contract was designed for this from the start.

Each PR follows this codebase's established discipline: written blueprint reviewed and approved before code (matching M1–M4's own precedent), full test suite + typecheck + build + lint, real Playwright/browser verification against a locally-provisioned Postgres+Redis+S3 stack (as demonstrated for PR #100), and an implementation report before merge.

---

## 12. Proposed Milestone Scope

- Extend search to cover **Matter, Proceeding (LegalCase), Client, and Court Note** text fields (title, case/matter number, court, judge, stage, party names, client name/contact, note text), tenant-scoped, additive to the existing document search.
- A real, working `/search` page (mobile-first, grouped result cards, empty/loading/error states, Milestone-4-style SEO/GEO architectural hooks).
- A Matter-scoped search entry point reusing the existing `matter_id` filter.
- Explicit resolution of Decisions 1–4 (§10) before any code is written.

## 13. Explicit Out-of-Scope Items

- **Rebuilding or duplicating Matter Health** — already delivered by Milestones 2–3; this milestone may surface it more prominently in search result cards but does not re-implement `GET /api/matters/[id]/health`.
- **Any navigation/IA change** (persistent nav bar, FAB, four-destination IA) — Blueprint §22 item 1 remains its own, separate, not-yet-approved decision.
- **`/dashboard/search` retirement or modification** — left untouched (Decision 2, recommended).
- **Elasticsearch, OpenSearch, Meilisearch, Typesense, or any external search engine** — continues Postgres + pgvector only, per the Implementation Plan's explicit instruction and this codebase's consistent precedent.
- **AI-generated result summarization or "answer" synthesis** — that is `POST /api/ai/ask`/RAG's job, already built; this milestone is literal search, not a second AI feature.
- **Citation/statute/precedent search** (named in the Blueprint's long-term entity list) — no such data exists in the schema today; out of scope until a real data source is approved.
- **Search across `DocumentAccessEvent`, `AiUsageEvent`, or any audit/ledger table** — these are operational/audit records, not advocate-facing content.
- **Any commercial/entitlement gating on search** — `enforceEntitlement()` is AI-operation-scoped only (per its own documented design); search is core free usage, matching Court Note/Document viewing's existing "never charge for your own records" precedent, unless the Product Owner explicitly decides otherwise.
- **Milestone 6 (Typist Collaboration)** — unchanged, still sequenced after this milestone, not pulled forward.
- **Any change to Milestone 1–4 tables, routes, or UI** beyond the new, additive search capability itself.

---

## Acceptance Criteria for This Audit

This document is ready for Product Owner review once it is confirmed that:
1. §1's correction (PR #100 not yet merged) is acknowledged and PR #100's actual merge happens before Milestone 5 branching begins.
2. §1's scope finding (Matter Health already substantially delivered) is accepted, re-scoping this milestone to Universal Search as the real remaining work.
3. Decisions 1–4 (§10) are resolved by the Product Owner (or explicit authority delegated back to engineering with stated constraints).
4. The proposed scope (§12) and out-of-scope list (§13) are confirmed as complete and correct.
5. No implementation begins until this sign-off happens, consistent with every prior milestone's own review process.
