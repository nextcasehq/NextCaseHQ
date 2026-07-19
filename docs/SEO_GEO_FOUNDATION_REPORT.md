# SEO/GEO Foundation Report

Product-Owner-directed engineering sprint, sequenced ahead of Milestone 6. Scope: fix
sitemap/metadata/robots/JSON-LD correctness on existing public marketing pages. Explicitly
**not** a marketing initiative — no new public content, no Knowledge Graph, no AI/GEO
expansion, no Milestone 6 feature work. This report also documents a separate, read-only
investigation into Legal Dictionary / 15,000-keyword-programme readiness requested mid-sprint
(§6); nothing in that investigation was implemented.

## 1. Completed This Sprint

| Item | What changed | Where |
|---|---|---|
| Sitemap correctness | Removed the `/blog` entry — no such route exists, so it was a dead sitemap link | `apps/web/src/app/sitemap.ts` |
| Unique page-level metadata | Added `title`/`description`/`alternates.canonical`/`openGraph`/`twitter` to all 8 public marketing pages that previously had none (they inherited the homepage's generic metadata) | `about`, `contact`, `features`, `pricing`, `solutions`, `resources`, `privacy`, `terms` `page.tsx` files |
| Client-only pages converted to server components | `resources`, `privacy`, `terms` were marked `'use client'` with zero actual interactivity (no hooks, no event handlers) — dropped the directive so they can export `metadata` and now prerender statically, same as the other marketing pages | same three files |
| `robots.txt` reframed as crawler guidance, not access control | Added `/matters/`, `/documents/`, `/admin`, `/docs`, `/system` to `disallow` (previously absent) with a comment clarifying these routes are protected by real auth regardless of robots directives; `allow` list now matches the corrected sitemap without treating the two files as required to be identical everywhere | `apps/web/src/app/robots.ts` |
| JSON-LD builder expansion | Added `LegalService`, `FAQPage`, `Article` type support to the existing `Organization`/`SoftwareApplication`/`WebSite` component. `LegalService` is a builder for future use only — NextCaseHQ is a software platform for legal professionals, not a legal-service provider, so it is not wired to any page. `FAQPage`/`Article` are likewise unattached — no page currently has genuine FAQ or article content | `components/seo/JsonLd.tsx` |
| Home page JSON-LD gap closed | Home page (`LandingPageContent.tsx`) already rendered `WebSite` and `SoftwareApplication`; audit found `Organization` — factually correct and already-supported — was never rendered anywhere. Added it | `apps/web/src/components/landing/LandingPageContent.tsx` |
| Breadcrumb audit | Confirmed all 9 public marketing pages are flat, single-level routes with no real hierarchy to expose — breadcrumbs were **not** added to avoid forcing navigation UI onto pages where it adds no value. (Breadcrumbs already exist correctly on `/documents/*`, which do have real hierarchy.) | audit only, no code change |
| Verification | `pnpm --filter web build` succeeds cleanly; typecheck/test failures present are byte-for-byte identical on unmodified `main` (pre-existing `tsconfig.json` deprecation flag and missing `DATABASE_URL`/Redis in this sandbox) — confirmed via `git stash` diffing, zero regressions introduced. Dev server verification confirmed correct rendered `<title>`, canonical, OG, Twitter card per page, correct `robots.txt`/`sitemap.xml` output, correct JSON-LD `@type`s on the home page, `noindex` still intact on `/search` and `/documents/new`, and `/blog` now correctly 404s | manual + automated |

No visual, branding, or authenticated-application changes were made anywhere in this sprint.

## 2. Remaining Gaps (not in this sprint's scope)

- No public content pages exist for the metadata/JSON-LD/breadcrumb machinery to serve beyond the current 9 marketing pages and the home page.
- `FAQPage`/`Article`/`LegalService` builders exist but are unattached — intentionally, per Product Owner instruction, until a page factually warrants them.
- The Legal Knowledge Graph taxonomy is still free text (`LegalCase.court`, `LegalCase.practice_area`) in the primary application path — see §6 for the fuller finding on this, including a second, disconnected taxonomy layer discovered during the keyword-readiness investigation.

## 3. Recommendations Feeding the Knowledge Graph Phase

1. Reconcile the two existing, non-integrated "court" representations (see §6.1) before building new structured entities on top of either one.
2. Follow the `lib/domain/document-type.ts` pattern (frozen literal array → seedable table, zero call-site churn) for any future Court/Act/Section/Practice-Area/Jurisdiction entity — it is the only taxonomy in this codebase that has been taken end-to-end successfully.
3. Treat the JSON-LD component (`components/seo/JsonLd.tsx`) and the breadcrumb component as the reusable rendering seams for all future public entity/dictionary pages — no new component pattern is needed, just new page consumers.

---

## Legal Dictionary and 15,000-Keyword Readiness

*(Read-only architecture and readiness investigation, requested mid-sprint. No schema changes, imports, dictionary routes, or generated content were implemented. Nothing here expands this sprint's shipped scope.)*

### 6.1 Current Repository Status

No dedicated legal glossary, dictionary, terminology database, or keyword dataset exists anywhere in the repository — no content folders, no CSV/JSON keyword files, no workbook-import scaffolding.

What does exist, more precisely than first assumed:

- **`CountryPack` / `CourtPack` / `LawPack` / `ProcedurePack`** (`db/schema.sql:41-73`, seeded in `db/seed.sql`) — a real, structured, country-scoped taxonomy: courts (with tier), statutes, and a 7-step procedure lifecycle, keyed by stable tokens (e.g. `IN_DELHI_HIGH_COURT`, `IN_BNS_2023`).
- **`@nextcase/country-packs`** workspace package (`packages/country-packs/src/`) — a second, separate implementation of country-pack logic (US/UK/India modules). Confirmed by grep to be imported only by `apps/web/src/lib/smoke/heartbeat.test.ts` — not by any real API route, domain module, or UI. Legacy/scaffold code, not live product logic.
- **`lib/domain/document-type.ts`** — the one taxonomy that *is* fully wired end-to-end (form rendering, DB check constraint, draft prompts) and is explicitly documented as the pattern a future graph migration should copy.

🟡 **Partially implemented / structurally disconnected:**
`LegalCase.court_pack_id`/`law_pack_id`/`procedure_pack_id` are plain `TEXT` columns with **no `REFERENCES` constraint** back to `CourtPack`/`LawPack`/`ProcedurePack`, and `POST /api/cases` (`apps/web/src/app/api/cases/route.ts`) accepts them as unvalidated free strings (`z.string().max(200).optional()`). No application code JOINs a case to its pack row to resolve a token to a display name. Separately, `LegalCase` also has free-text `court`/`judge` columns (added later, `schema.sql:143-144`) that the actual `/cases` UI reads and writes. **Two parallel, non-integrated representations of "court" exist on the same table today** — the seeded taxonomy tables are not dead, but nothing reads them back.

❌ **Missing entirely:** glossary/definition table, practice-area taxonomy beyond the India-only seed, jurisdiction taxonomy beyond `CountryPack`, any keyword dataset or import pipeline, any content folder.

### 6.2 15,000-Keyword Readiness

The architecture can support ~15k keywords **only as a normalized relational model**, never a flat list or metadata-embedded set — a single wide table breaks the moment one keyword maps to multiple pages, synonyms, or child topics, which is guaranteed at this scale.

Proposed structure (four linked tables, not one):

```
KeywordRecord        -- one row per keyword/phrase
  id, keyword, normalized_keyword (unique),
  primary_entity_id, entity_type,
  jurisdiction, court_pack_id, law_pack_id, section_ref, practice_area, matter_type, legal_procedure,
  search_intent (INFORMATIONAL | NAVIGATIONAL | TRANSACTIONAL | COMMERCIAL), user_intent_note,
  primary_page_id, canonical_target,
  keyword_difficulty, search_volume, commercial_relevance, informational_relevance, priority,
  source, verification_status (UNVERIFIED | SME_REVIEWED | PUBLISHED),
  content_status (NOT_STARTED | DRAFTED | REVIEWED | LIVE | RETIRED),
  schema_type, last_reviewed_at, created_at, updated_at

KeywordRelation       -- keyword-to-keyword graph edges (synonym, abbreviation, parent/child topic, related term, question variant)
KeywordSupportingPage -- many-to-many: a keyword to its several supporting pages
Page                  -- one row per real/planned URL (dictionary entry, entity page, article, FAQ)
```

This covers every field requested (keyword, entity type, jurisdiction, court, act, section, practice area, procedure, matter type, both intent fields, primary/supporting page, parent/child topic, synonyms/abbreviations/related terms, question variants, difficulty, volume, commercial/informational relevance, priority, source, verification status, content status, canonical target, internal-link targets, schema type, last-reviewed date) via the base table plus the two junction tables for what's inherently one-to-many.

**Additional fields recommended** for Knowledge Graph/GEO readiness, beyond the requested list:
- `graph_node_id` — the Knowledge Graph node a keyword resolves to, once one exists (keywords should resolve to entities, not just URLs).
- `citation_source_url` / `citation_authority` — required before any legal-definition content publishes.
- `geo_snippet_ready` (boolean) — whether the target page currently contains a clean, extractable, citation-quality answer block, distinct from traditional search-volume metrics.
- `duplicate_of` — self-referential FK for near-duplicate consolidation, enforced at import time.
- `locale` — distinct from `jurisdiction`; relevant once content spans India's multiple official languages.

### 6.3 Legal Dictionary Architecture (future, not implemented)

```
LegalDictionaryEntry
  id, term_slug (unique), term_display,
  plain_language_definition, formal_legal_definition,
  jurisdiction_notes (JSONB — one term can mean different things per jurisdiction),
  related_act_ids[], related_section_refs[], related_court_ids[], related_procedure_ids[],
  synonyms[], abbreviations[], alternative_spellings[],
  related_question_ids[],
  citations[] (JSONB: [{ source, url, retrieved_at }]),
  internal_link_target_ids[],
  schema_type,
  verification_status, reviewed_by, last_reviewed_at,
  published_at (null until human-approved)
```

Proposed URL: `/legal-dictionary/[term-slug]`, same `layout.tsx`/`page.tsx` server-shell split already proven on `/documents/[id]`. `DefinedTerm` (schema.org) is the correct JSON-LD type for an entry — not `Article`, not `LegalService`. No entry publishes (`published_at` set) without `verification_status = SME_REVIEWED`.

### 6.4 Keyword Insertion Policy (proposed)

**Prohibited, no exceptions:** keyword stuffing; hidden/invisible keyword text; bulk-writing keywords directly into `metadata`/`openGraph` fields; duplicate pages targeting near-identical phrases (require a `duplicate_of` merge instead); AI/auto-generated legal definitions published without SME review; doorway pages; unsupported legal claims.

Keywords are assigned only to real content units: Legal Dictionary entries, Court/Act/Section entity pages, Practice Area pages, Procedure pages, Jurisdiction pages, FAQs, and explanatory/comparison articles — never to marketing pages built for a different purpose. **One primary search intent per page**, with a bounded number of related/secondary terms (recommend capping at ~8–12).

### 6.5 Workbook Integration (Google Sheets remains authoritative)

Proposed sheets: `Keywords`, `Relations`, `DictionaryEntries`, `Pages`, `ChangeLog`. Normalized `keyword` (lowercase, trimmed, diacritics-stripped) as the unique identifier, with a sheet-native dedup check blocking near-duplicate submission before export. Approval workflow: `DRAFT → SME_REVIEW → APPROVED → EXPORTED` — engineering's importer only ingests `APPROVED` rows. Export as versioned, filename-stamped JSON (e.g. `keywords_export_2026-07-19.json`), validated against a JSON Schema before import, committed to a `data/` folder as the audit trail — never a direct live write from the sheet. The database is a read-replica of the workbook's approved rows, not a second source of truth.

### 6.6 Risks

- **Regulatory/liability risk**: unreviewed or uncited legal definitions could constitute unauthorized legal advice, or simply be wrong. `verification_status` gating is not optional.
- **Duplicate-content risk** at 15k scale without the `duplicate_of`/dedup discipline in §6.4–6.5.
- **Two-tier taxonomy risk**: building the Knowledge Graph on top of the existing `CourtPack`/`LawPack`/`ProcedurePack` vs. free-text `court`/`practice_area` split (§6.1) without reconciling it first bakes today's inconsistency into 15k keyword records.

### 6.7 Recommended Implementation Phases

1. Reconcile `CourtPack`/`LawPack`/`ProcedurePack` vs. free-text `court`/`practice_area` — small, precedes everything else.
2. Stand up `KeywordRecord`/`KeywordRelation` schema + workbook import pipeline — no publishing.
3. Build `LegalDictionaryEntry` + `/legal-dictionary/[term]`, SME-reviewed entries only, small batch.
4. Scale dictionary + entity pages once the pipeline is proven at small volume.
5. GEO-specific tuning (answer-block quality, citation density) once real pages exist to measure.

### 6.8 Product Owner Decisions Required

- Who is the SME reviewer of record for `verification_status`, and what is the minimum citation standard?
- Should `CourtPack`/`LawPack`/`ProcedurePack` be reconciled with `court`/`practice_area` before or independently of Knowledge Graph work?
- Confirm the workbook remains the sole authoring surface (no admin UI for direct DB edits to keyword/dictionary data).
- Approve or reject `DefinedTerm` as the Legal Dictionary entry schema type.
