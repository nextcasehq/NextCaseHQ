# SEO/GEO Foundation Report

Product-Owner-directed engineering sprint, sequenced ahead of Milestone 6. Scope: fix
sitemap/metadata/robots/JSON-LD correctness on existing public marketing pages. Explicitly
**not** a marketing initiative — no new public content, no Knowledge Graph, no AI/GEO
expansion, no Milestone 6 feature work. This report also documents two separate, read-only investigations requested after the
sprint's initial scope: Legal Dictionary / 15,000-keyword-programme readiness (§6), and a
Dynamic Legal Discovery Layer / keyword-placement architecture with blank-space audit (§7).
Nothing from either investigation was implemented — no modules, pages, migrations, or bulk
content.

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

---

## Dynamic Legal Discovery Layer and Keyword Placement Architecture

*(Architectural direction and read-only audit, requested after PR #103's initial scope. Nothing in this section is implemented — no modules, pages, migrations, or bulk content. This is documentation only, added to PR #103 because it is a report addition, not a scope change to the shipped code.)*

### 7.1 Workbook Ownership (Claude's responsibility, confirmed)

Claude maintains the SEO/GEO workbook's structure, taxonomy, relationships, dedup rules, status fields, and export readiness; the workbook remains the sole authoring source (§6.5). Every keyword record carries, at minimum, the fields already specified in §6.2 (`KeywordRecord`) plus two additional status fields this direction introduces:

- `visibility_status` (`PRIVATE` | `PUBLIC`) — distinct from `verification_status`. A keyword can be `SME_REVIEWED` and still `PRIVATE` (used only for internal research/Knowledge Graph prep) until a Product Owner decision makes it `PUBLIC`.
- `indexable` (boolean) — whether the keyword's target page is allowed to be indexed once public; defaults `FALSE` until every §7.4 publication gate is satisfied.

Both are additive to the `KeywordRecord` schema already proposed in §6.2 — no redesign of that model was needed.

### 7.2 Blank-Space Audit (read-only, current public pages)

No page was found to be "empty" in a way that justifies filling it for its own sake. What follows are structurally genuine openings — places where either dead-end content already exists (unlinked badges, static cards with no destination) or a page's own stated purpose already implies a browse/discovery function it doesn't yet deliver.

| Route | Current section | Space/weakness | Proposed module | User value | SEO/GEO value | Keyword/entity types | Visual/UX risk | New content required? | Priority |
|---|---|---|---|---|---|---|---|---|---|
| `/` (home) | `TrustBar` — six plain, unlinked badges: BNS, BNSS, FRCP, CPR, NI Act, IT Act | Real statute names already rendered but dead-end (no `href`) | "Browse by Act" — same badges become links to real Act pages | Lets a visitor go straight from "we support BNS" to what BNS actually covers | Direct entity-page internal linking from the highest-traffic page on the site | Act | None — same visual, only adds `href` | Yes (Act pages must exist first) | High (once Phase 3/4 entity pages exist) |
| `/features` | "Statutory Engines" card names BNS/BNSS/FRCP/CPR/NI Act inline in body text | Statute names appear in prose but aren't linked | Inline links from statute names to their Act pages | Reader can jump from feature description to the real legal content | Low-risk internal link from an already-indexed page | Act | None — text unchanged, just add anchor tags | Yes (same dependency as above) | Medium |
| `/resources` | Two static publication cards (BNS/BNSS Playbook, Zero-Knowledge Whitepaper) — currently unclickable dead ends | Page's own framing ("Expert Legal Tech Publications") already promises a content hub it doesn't deliver | "Popular Legal Questions," "Recently Reviewed Legal Definitions," "Legal Topic Clusters" — this page is the natural home for the discovery layer | Turns an already-published but non-functional page into a real destination | Highest-leverage single placement — one page absorbing several module types at once | Dictionary terms, questions, topic clusters | Low if module cards match existing card styling already used on this page | Yes (Dictionary/FAQ/article content) | High (best single starting point) |
| Home `SiteFooter` "Product" column | 4 links (Features, Solutions, Pricing, Resources) | Column has visual room for more entries; other columns (Company, Legal) are similarly short | Add a "Legal Dictionary" / "Browse by Practice Area" link once those routes exist | One more real, low-friction navigation path into the discovery layer sitewide | Sitewide footer link = crawled from every page | Practice Area, Dictionary | None — same list pattern, one more `<li>` | Yes | Medium |
| Marketing pages' shared `Footer` (`about`, `contact`, `features`, `pricing`, `solutions`, `privacy`, `terms`) | Only 4 static links, no nav columns (unlike the home page's richer `SiteFooter`) | Structural inconsistency across 7 pages, not a deliberate design choice | Eventually align with `SiteFooter`'s column pattern, adding a "Legal Resources" column | Consistent sitewide navigation into real content | Same link surfaced from 7 more pages | Practice Area, Dictionary, Court | Touches 7 files at once — real layout change, not a one-line addition | Yes | Low (defer — this is a small redesign, not a blank-space fill) |
| Primary `Navbar` | No "Resources" or "Learn" entry at all — `/resources` is reachable only via footer or direct URL | Not blank space exactly, but a genuine discoverability gap: the one page shaped like a content hub isn't in primary nav | Add a nav entry once `/resources` (or a renamed discovery hub) has real content | Direct primary-nav path to the discovery layer | Improves crawl depth/priority signal for the hub page | N/A (navigation, not content) | Adding a nav item is a real, visible layout change | No | Low (defer — nav changes need explicit sign-off, not bundled with content work) |

**Explicitly not treated as opportunities:** `/pricing` (single plan card — wrong search intent for legal content, would dilute a transactional-intent page), `/about`/`/contact` (company pages, not legal-content pages), `/privacy`/`/terms` (policy pages — inserting keyword modules into legal-boilerplate pages risks looking like exactly the "unsupported legal claims" pattern this whole programme is designed to avoid). Authenticated `/documents/*`, `/search`, `/matters/*` etc. are `noindex` and out of scope entirely.

### 7.3 Recommended Reusable Modules (design only)

Each module is a server-rendered, semantic-HTML component (`<section>`/`<nav aria-label>`/`<ul>`, matching the pattern already established by `Breadcrumbs.tsx`) that queries only `KeywordRecord`/`Page` rows where `visibility_status = PUBLIC` and `indexable = TRUE` (§7.4) — never draft or private rows:

- **Browse by Practice Area / Court / Act / Section / Procedure / Jurisdiction** — a linked index list, one entry per real published entity page. Same list-of-links shape as `SiteFooter`'s nav columns; no new visual language needed.
- **Related Legal Terms / Related Questions** — rendered from `KeywordRelation` rows (`RELATED_TERM`/`QUESTION_VARIANT`), shown at the bottom of a Dictionary/entity page, same placement convention as a "related articles" block.
- **Legal Term of the Day / Recently Reviewed Definitions** — a single featured `LegalDictionaryEntry` where `verification_status = SME_REVIEWED`, rotated deterministically (e.g., by date) — never randomly surfacing an unreviewed entry.
- **Popular Legal Questions / Legal Topic Clusters / Common Document Types** — curated lists driven by `priority`/`search_volume` on already-published `KeywordRecord` rows, grouped by `parent_topic`.

All modules link only to real canonical URLs (`canonical_target`), never to a placeholder or "coming soon" page — a module has nothing to render until its underlying entity pages exist, and simply doesn't render rather than showing an empty or fake state.

### 7.4 Keyword-to-Page Clustering Model

Consolidation targets (page groups, not one page per keyword) for the ~15,000-keyword set:

| Content group | Estimated real pages | Consolidation logic |
|---|---|---|
| Legal Dictionary | ~2,000–3,000 | One page per distinct term; synonyms/abbreviations map to the same page via `KeywordRelation`, not duplicate pages |
| Courts | ~50–100 | Major courts + high-tier district courts; low-search-volume courts roll into their state/jurisdiction page rather than getting a standalone page |
| Acts | ~200–400 | One page per Act; minor/rarely-searched Acts grouped into a practice-area page's "related Acts" list instead of a standalone page |
| Sections | ~1,000–2,000 | Only high-search-volume Sections get a standalone page; the rest live as an indexed list on their parent Act page |
| Practice Areas | ~30–50 | Standard practice-area taxonomy (Criminal, Civil, Family, Corporate, IP, Labour, Tax, etc.) |
| Procedures | ~50–100 | One page per distinct legal procedure (bail process, appeal process, etc.), extending `ProcedurePack`'s existing 7-step model |
| Jurisdictions | ~40–60 | Country + state/UT level |
| Legal Documents | ~15–30 | Directly maps to the existing 15 `document-type.ts` slugs, one explainer page each, plus a small number of category-overview pages |
| Legal Questions / FAQs | ~200–500 standalone + many more as FAQ sections on entity pages | A question only becomes a standalone page if it doesn't fit naturally as an FAQ block on an existing entity page — avoids duplicate near-identical pages |
| Explanatory articles | ~100–300 | Evergreen topic-cluster and comparison content, each with one primary intent |

**Total: roughly 3,500–5,000 real pages** absorbing ~15,000 keywords (avg. ~3–4 keywords per page via primary + related-term mapping) — never a 1:1 keyword-to-page ratio. Every page in every group still requires: one primary search intent, one primary entity/topic, a bounded secondary-term set, real original content, citations, internal links, canonical URL, appropriate structured data, and human/SME review before publication — no exceptions by content group.

### 7.5 Publication Gates (restated, binding)

A keyword may influence public content only when **all** of the following hold: `verification_status = APPROVED`, `visibility_status = PUBLIC`, `indexable = TRUE`, a `canonical_target` page exists, an authoritative source is recorded, duplicate review is complete, and the target content has had human/SME review. Keywords failing any gate remain usable internally for research, search expansion, and Knowledge Graph preparation — never surfaced as hidden or draft page content.

### 7.6 Risks

- **Premature module rendering**: a module with no `PUBLIC`/`indexable` rows to show must render nothing, not a placeholder — a "coming soon" grid at this scale would itself look like a doorway pattern.
- **Footer/nav inconsistency** (§7.2) becoming a rushed redesign rather than a deliberate, separately-approved change once content exists to justify it.
- **Consolidation drift**: without enforcing the §7.4 grouping logic at authoring time (in the workbook, not after the fact), authors will default to one page per keyword, recreating the exact problem this model exists to prevent.

### 7.7 Proposed Future Milestone Sequence

1. Workbook build-out (§7.1 schema, `KeywordRecord`/`KeywordRelation`) — no public code.
2. Small-batch Legal Dictionary + entity pages (Courts/Acts first, since `CourtPack`/`LawPack` already provide seed data once reconciled per §6.7).
3. `/resources` becomes the first real discovery-module host (§7.2's highest-priority opportunity), using only already-published entries.
4. Extend modules sitewide (`TrustBar` links, footer column) once enough entity pages exist to link to.
5. Navbar/IA changes considered separately, only once the discovery layer has real, published content to justify surfacing it in primary navigation.
