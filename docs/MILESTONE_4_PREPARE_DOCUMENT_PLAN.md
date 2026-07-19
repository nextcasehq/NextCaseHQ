# MILESTONE 4 — PREPARE DOCUMENT — PLAN

**Status: Approved by the Product Owner. Implementation in progress on `claude/milestone-4-documents-hp1glf`.**

---

## 1. Read-Only Audit — Existing-State Findings

**Governing source text.** The Product Owner's resume brief for this session (no separate blueprint section exists yet for Milestone 4 — the Advocate OS UX Blueprint's §22 sequencing lists "Prepare Document (Milestone 4)" as not-yet-started, dependent on Milestones 1–3, all now merged).

**Backend already real and reusable (confirmed by direct inspection):**

| Building block | State |
|---|---|
| `DocumentEnvelope` / `DocumentVersion` | Real tables (Sprint 3, PR 3A). `id, tenant_id, case_id, matter_id, title, storage_structure, created_at` + indexing columns. `case_id`/`matter_id` both nullable — a document can already be linked to a Matter directly. **No `document_type` column exists** — flagged below as the one additive column this milestone needs. |
| `POST /api/documents/upload` | Real: streams raw bytes, validates file type/size, writes to object storage (S3-compatible), inserts `DocumentEnvelope` + version-1 `DocumentVersion` atomically. Accepts `x-case-id`/`x-matter-id`/`x-file-name` headers. `.txt` is already an allowed extension (`ALLOWED_DOCUMENT_EXTENSIONS`), which matters directly for how "Save Draft" is implemented (§4). |
| `POST /api/documents/[id]/versions` | Real: uploads a new version, re-indexes, never overwrites prior bytes. |
| `PATCH /api/documents/[id]` | Real: re-links `case_id`/`matter_id` with full tenant/Proceeding-consistency checks. |
| `GET /api/documents` / `GET /api/documents/[id]` | Real: list (filterable by `case_id`/`matter_id`) and single-document fetch, both RLS-scoped. |
| `GET/POST /api/documents/[id]/download`, `/preview` | Real: server-proxied byte streaming, access-audited. |
| AI Operation Taxonomy (`lib/ai/operation-types.ts`) | `DRAFT_CREATE` and `DRAFT_IMPROVE` are already frozen values in the Product Owner-approved taxonomy (Milestone 2, Decision 3) and already accepted by `AiUsageEvent`'s DB check constraint — **reserved for exactly this milestone, never used by any caller until now.** |
| AI pipeline (`lib/ai/rag.ts`, `prompt-builder.ts`, `llm-provider.ts`, `context/gateway.ts`, `usage-metering.ts`) | Real, fully wired, provider-agnostic (OpenAI/Anthropic). `getMatterContext()` (AI Context Gateway) already assembles a Matter's real structured context (chronology, participants, proceedings, summary) for any AI feature that supplies a `matterId` — directly reusable for draft generation grounded in a real Matter. |
| `lib/domain/*.ts` | Established pattern for structured, typed enums shared across routes (`MATTER_STATUSES`, `CASE_STATUSES`, etc.) — the precedent this milestone follows for the new Document Type entity. |

**Gaps this milestone must fill (minimum additive surface):**
1. No column stores *what kind* of legal document an envelope is (Plaint, Bail Application, etc.) — needed to display "Document Type" on the Matter Documents panel and to drive the drafting form.
2. No endpoint generates AI drafting content — `DRAFT_CREATE`/`DRAFT_IMPROVE` have never had a caller.
3. No UI exists for `/documents/new` or `/documents/[id]` — both 404 today.
4. The Matter page's Documents section is `ComingSoonPanel` — a static placeholder.

---

## 2. Approved Scope

1. **`/documents/new`** — progressive drafting flow: Category → Document Type → Matter Association (optional) → Progressive Facts → Generate Draft → Review → Save Draft.
2. **`/documents/[id]`** — read-only document detail: metadata, version history, preview/download, upload a new version, "Improve Draft" (AI-assisted revision → saved as a new version).
3. **Matter page Documents section** — replaces `ComingSoonPanel` with a real, read-only list sourced from the existing `GET /api/documents?matter_id=` endpoint, plus a "Prepare New Document" entry point into `/documents/new?matter_id=`.
4. **`POST /api/ai/draft`** — the only new API route. Generates `DRAFT_CREATE`/`DRAFT_IMPROVE` text through the existing AI pipeline. **Never writes to any table except the usage ledger** (`AiUsageEvent`, via the existing `recordAiUsageEvent`) — generation and persistence stay fully separate, per the Product Owner's explicit constraint.
5. **Persistence reuses the existing upload/version endpoints unchanged in mechanism** — "Save Draft" and "Save Improved Version" both submit the reviewed text as a `.txt` file through the *same* `POST /api/documents/upload` / `POST /api/documents/[id]/versions` endpoints every other upload already uses, with one additive header (`x-document-type`) carrying the structured type. No parallel persistence path is introduced.

---

## 3. Explicit Exclusions (unchanged from the brief)

- No Home, Navbar, Login, Global Navigation, or Case Page changes.
- No Universal Search, no Typist Collaboration.
- No expansion of the 15 approved document types.
- No universal legal questionnaire — facts collection is category-scoped (Civil / Criminal / High Court), not one generic form and not 15 bespoke forms.
- No new document storage architecture, no duplicate persistence table.
- No redesign of the Matter page beyond the Documents section.
- No separate "SEO feature" — SEO/GEO readiness is architecture (clean URLs, metadata hooks, structured entities), not new pages or copy.

---

## 4. Data Model

### 4.1 Additive column — the only schema change

```sql
-- 4d. Document Type (Milestone 4, Prepare Document)
--
-- Nullable by design: every pre-existing DocumentEnvelope row (plain
-- uploads from Sprint 3 onward) has no drafting-flow type and must keep
-- reading exactly as it does today — NULL means "general upload," not
-- "unknown error." Only documents created through the new /documents/new
-- drafting flow ever populate this column. A TEXT + CHECK constraint
-- (not a Postgres ENUM) matches this file's existing convention for
-- every other fixed-vocabulary column (index_status, AiUsageEvent
-- .operation_type) — appending a 16th type later is one CHECK-constraint
-- edit, never a column-type migration.
ALTER TABLE "DocumentEnvelope" ADD COLUMN IF NOT EXISTS "document_type" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'documentenvelope_document_type_check'
    ) THEN
        ALTER TABLE "DocumentEnvelope" ADD CONSTRAINT documentenvelope_document_type_check
            CHECK ("document_type" IS NULL OR "document_type" IN (
                'PLAINT', 'WRITTEN_STATEMENT', 'AFFIDAVIT', 'INTERIM_APPLICATION', 'LEGAL_NOTICE',
                'BAIL_APPLICATION', 'ANTICIPATORY_BAIL_APPLICATION', 'CRIMINAL_COMPLAINT', 'OBJECTION_STATEMENT', 'PETITION',
                'WRIT_PETITION', 'WRIT_APPEAL', 'REVISION_PETITION', 'REVIEW_PETITION', 'MEMO'
            ));
    END IF;
END
$$;
```

No new table. `DocumentVersion`, `DocumentEnvelope.storage_structure`, indexing, access-audit, and delete semantics are entirely unchanged — a drafted-and-saved document is, from the moment it is saved, indistinguishable in the data model from an uploaded one, and flows through every existing route (`versions`, `download`, `preview`, `PATCH`, `DELETE`, search indexing) with zero code changes to those routes.

### 4.2 Structured Document Type entity (Legal Knowledge Graph readiness)

New module `apps/web/src/lib/domain/document-type.ts`, following the exact pattern already established by `lib/domain/matter.ts`/`legal-case.ts`:

```ts
export const DOCUMENT_CATEGORIES = ['CIVIL', 'CRIMINAL', 'HIGH_COURT'] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export interface DocumentTypeDefinition {
  slug: string;           // stable identifier — DocumentEnvelope.document_type value
  label: string;          // display name
  category: DocumentCategory;
  factSections: FactSectionKey[]; // which progressive-fact sections apply
}

export const DOCUMENT_TYPES: readonly DocumentTypeDefinition[] = [ /* the 15 approved types */ ];
```

This is a plain in-repo constant (no new table) — correct for a fixed, Product-Owner-frozen 15-item vocabulary, matching how `MATTER_ENGAGEMENT_TYPES` is modeled. It is deliberately structured (slug + label + category), not a free-text string scattered across the UI, so a future Legal Knowledge Graph migration promotes it to a real `DocumentType` table by moving this exact literal array into a seed script — no call site changes. `Courts`, `Practice Areas`, `Acts`, `Sections`, `Jurisdictions` are **not** touched by this milestone: they predate it as free-text fields on `Matter`/`LegalCase` from Milestones 1–2, and restructuring them is out of scope for "one milestone only" — noted here so it isn't silently forgotten, not attempted now.

---

## 5. AI Drafting Flow

**`POST /api/ai/draft`** — the only new route, mirroring `POST /api/ai/ask`'s exact security/pipeline shape:

- `requireSession` + `isTrustedOrigin`, identical to every other mutating/AI route.
- Body: `{ document_type, category, matter_id?, facts: Record<string,string>, mode: 'CREATE' | 'IMPROVE', existing_content?, improve_instruction? }`.
- `mode: 'CREATE'` → `operationType: 'DRAFT_CREATE'`. `mode: 'IMPROVE'` → `operationType: 'DRAFT_IMPROVE'` (requires `existing_content`).
- When `matter_id` is present: `getMatterContext(tenantId, userId, matterId, { operationType })` (the existing AI Context Gateway — Milestone 2) supplies real Matter context, exactly as `askQuestion` already does. A cross-tenant/nonexistent `matter_id` fails closed with 404 before any provider call, same as `/api/ai/ask`.
- Prompt assembly reuses `buildPrompt()` (`lib/ai/prompt-builder.ts`), extended with one new **optional** layer (`existingDraft`) for the IMPROVE path — additive, so `AI_CHAT`'s existing call site is untouched.
- `getLLMProvider()` + `recordAiUsageEvent()` (`DRAFT_CREATE`/`DRAFT_IMPROVE`, `SUCCESS`/`FAILED`) — identical instrumentation contract as `AI_CHAT`.
- Response: `{ content, provider, model }` only. **No database write besides the usage ledger** — the drafting endpoint never silently saves a draft, per the Product Owner's explicit constraint. The generated `content` lives only in the browser's review step until the advocate explicitly clicks Save.

**Save Draft** is a client-side action, not a new server route: the reviewed text is wrapped as a `.txt` `Blob` and submitted to the *existing* `POST /api/documents/upload` (new document) or `POST /api/documents/[id]/versions` (Improve Draft → new version) endpoint — the same code path a real file upload already takes, plus the one additive `x-document-type` header. This is what "generation and persistence remain separate" and "reuse the existing backend completely" mean concretely: two independent calls, two independent user actions (Generate, then Save), no route that does both.

---

## 6. Matter Documents Panel

Replaces the `Documents` `ComingSoonPanel` in `matters/[id]/page.tsx` with a real section, sourced from `GET /api/documents?matter_id={id}` (existing route — extended, §7, to also return `document_type`, `version_count`, `updated_at`). Displays, per document: Document Name, Document Type (resolved through `DOCUMENT_TYPES` for a human label; "Uploaded" fallback when `document_type` is `NULL`), Updated Date, Version Count, an "Open" link to `/documents/[id]`, and a "Prepare New Document" link to `/documents/new?matter_id={id}`. `Evidence` and `Drafts & Research` panels are untouched.

---

## 7. API Changes

- **NEW** `POST /api/ai/draft` (§5).
- **CHANGED (additive)** `POST /api/documents/upload` — accepts optional `x-document-type` header (validated against `DOCUMENT_TYPES` slugs; rejects an unrecognized value with 400; omitted header behaves exactly as today — `document_type` stays `NULL`).
- **CHANGED (additive)** `GET /api/documents`, `GET /api/documents/[id]` — SELECT list extended with `document_type`, plus a `version_count`/`latest_version_created_at` computed via a `DocumentVersion` subquery/join. Every existing field and existing caller is unaffected; both are additive JSON fields.
- **UNCHANGED** `POST /api/documents/[id]/versions`, `PATCH /api/documents/[id]`, `DELETE /api/documents/[id]`, `GET/download`, `GET/preview` — reused exactly as-is.

---

## 8. Final Text Wireframe

### 8.1 `/documents/new`

```
┌──────────────────────────────────────────────┐
│ Breadcrumb: Documents › Prepare New Document   │
│ PREPARE NEW DOCUMENT                    (h1)   │
├──────────────────────────────────────────────┤
│ Step 1 — Category                              │
│   ( ) Civil   ( ) Criminal   ( ) High Court    │
├──────────────────────────────────────────────┤
│ Step 2 — Document Type            (progressive)│
│   [ dropdown of the 5 types in chosen category]│
├──────────────────────────────────────────────┤
│ Step 3 — Matter Association (optional)         │
│   [ dropdown: my Matters, or "No Matter" ]     │
├──────────────────────────────────────────────┤
│ Step 4 — Facts                    (progressive)│
│   category-scoped fields, e.g. Civil:          │
│     Plaintiff/Petitioner · Defendant/Respondent│
│     Facts & Cause of Action · Reliefs Sought   │
│     Court/Forum · Additional Instructions      │
├──────────────────────────────────────────────┤
│           [ Generate Draft ]                   │
├──────────────────────────────────────────────┤
│ Step 5 — Review (shown after generation)       │
│   [ editable textarea, pre-filled with draft ] │
│   [ Regenerate ]           [ Save Draft ]      │
└──────────────────────────────────────────────┘
```

### 8.2 `/documents/[id]`

```
┌──────────────────────────────────────────────┐
│ Breadcrumb: Documents › {title}                │
│ {TITLE}                                 (h1)   │
│ Type: Plaint · Matter: {link} · v3             │
├──────────────────────────────────────────────┤
│ [ Download ]  [ Preview ]  [ Upload New Version│
│ [ Improve Draft (AI) ] — text-eligible only    │
├──────────────────────────────────────────────┤
│ VERSION HISTORY                                │
│   v3 — 12 Jul 2026 — current                   │
│   v2 — 05 Jul 2026                             │
│   v1 — 01 Jul 2026                             │
└──────────────────────────────────────────────┘
```

### 8.3 Matter page — Documents section (replaces ComingSoonPanel)

```
┌──────────────────────────────────────────────┐
│ DOCUMENTS                    [Prepare New →]  │
│  Plaint — Civil               v2  · 12 Jul    │
│    [Open]                                      │
│  Bail Application — Criminal  v1  · 05 Jul     │
│    [Open]                                      │
└──────────────────────────────────────────────┘
```

---

## 9. SEO / GEO Hooks Added This Milestone

Per the standing instruction: no separate SEO feature, no redesign — only forward-compatible architecture on the two new routes and the new entity. Both new pages are authenticated, session-gated application screens (same as every existing `/matters/[id]`-style route), so they are **not** intended to rank publicly today; the hooks below are the *seams* a future public-facing layer (e.g., a public "What is a Bail Application?" knowledge page) would plug into, without any of today's private document content ever being exposed.

| Hook | What was added | Where |
|---|---|---|
| Clean URL structure | `/documents/new`, `/documents/[id]` — flat, noun-based, no query-string-only addressing | route folders |
| Metadata-ready architecture | A segment `layout.tsx` under `app/documents/` exports `generateMetadata`/`metadata`, kept separate from the client-rendered `page.tsx` (mirrors root `layout.tsx`'s existing metadata pattern) | `app/documents/layout.tsx`, `app/documents/[id]/layout.tsx` |
| Canonical support | `alternates.canonical` set per route in the same metadata objects | same |
| Open Graph readiness | `openGraph`/`twitter` fields present (title/description), `robots: noindex` since content is private | same |
| Breadcrumb support | Reusable `<Breadcrumbs>` component, semantic `<nav aria-label="breadcrumb"><ol>` | `components/Breadcrumbs.tsx`, used by both pages |
| JSON-LD insertion point | `lib/seo/json-ld.ts` — `buildBreadcrumbJsonLd()` helper, rendered via a `<script type="application/ld+json">` in the layout shell; a `LegalDocument`/`DocumentType` schema.org builder is a documented future extension point, not emitted today (would leak private content if emitted client-side) | `lib/seo/json-ld.ts` |
| Semantic HTML | `<main>`, `<header>`, `<nav>`, `<section>` used in both new pages, replacing the ad hoc `<div>`-only structure of older Matter/Case pages | `app/documents/new/page.tsx`, `app/documents/[id]/page.tsx` |
| Crawlable server-rendered shell | The breadcrumb nav + JSON-LD render from the server-component `layout.tsx`, independent of the client-rendered data-fetching body — the page shell is real markup even though document content itself is fetched client-side post-auth (consistent with the rest of this app's architecture; true full-page SSR of authenticated content is out of scope) | same |
| Internal-link readiness | All internal navigation uses `next/link`, never a raw `<a>` | new pages, Matter Documents panel |
| Legal Knowledge Graph entity | `lib/domain/document-type.ts` — structured `DOCUMENT_TYPES`/`DOCUMENT_CATEGORIES` (§4.2), directly promotable to a real graph node type later | `lib/domain/document-type.ts` |

`Courts`, `Practice Areas`, `Acts`, `Sections`, `Jurisdictions`, `Matter Types` are pre-existing free-text fields this milestone does not touch (§4.2) — flagged, not silently left inconsistent.

---

## 10. Test Strategy

- `POST /api/ai/draft`: auth required; origin-check enforced; `DRAFT_CREATE` vs `DRAFT_IMPROVE` operation type recorded correctly; cross-tenant/nonexistent `matter_id` → 404 (`MatterNotFoundError`) with no usage event recorded; provider-not-configured → 503; never writes to `DocumentEnvelope`/`DocumentVersion` (asserted directly).
- `POST /api/documents/upload`: existing test suite extended — valid `x-document-type` persists; invalid slug → 400; omitted header leaves `document_type` `NULL` (backward compatibility).
- `GET /api/documents` / `GET /api/documents/[id]`: `document_type`, `version_count`, `updated_at` present and correct; existing assertions on prior fields unchanged.
- Matter Documents panel: renders real documents, empty state when none, "Prepare New Document" link carries `matter_id`.

## 11. Runtime Verification Plan

Local dev server + Playwright: complete the `/documents/new` flow end to end for one Civil and one Criminal type (with and without a Matter association), confirm Generate never creates a row until Save is clicked, confirm the saved document appears on `/documents/[id]` and on the originating Matter's Documents panel, confirm Improve Draft produces a new version without altering the prior one.

## 12. Migration Strategy

Additive-only: one nullable column + one CHECK constraint on `DocumentEnvelope`, no table rename, no data backfill required (existing rows simply read `document_type = NULL`). Rollback is dropping the column/constraint and the two new routes — no destructive change to any existing table.

## 13. Acceptance Criteria

1. `/documents/new` and `/documents/[id]` exist, function end to end, and generation never persists without an explicit Save.
2. Matter page Documents section shows real data via the existing backend; Home, Navbar, Login, Global Navigation, and Case Page are byte-for-byte unchanged.
3. Only the 15 approved document types are selectable.
4. Lint, typecheck, full test suite, production build, and Playwright verification all pass before PR.
