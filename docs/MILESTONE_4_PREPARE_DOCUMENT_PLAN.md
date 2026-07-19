# MILESTONE 4 — PREPARE DOCUMENT ENTRY POINT — PLAN

**Status: DRAFT — read-only audit, gap analysis, and plan only. No production code has been written. Awaiting Product Owner approval of scope and UI placement before implementation begins.**

---

## 1. Read-Only Audit — Existing-State Findings

**Governing source text.**
- `docs/PRODUCT_DIRECTION.md`, "THE TWO ENTRY POINTS" → "Entry Point 1 — Prepare Document" (lines 104–109): *"Examples: Memo, Affidavit, Interim Application, Caveat, Plaint, Written Statement, Legal Notice, Agreements, practice-specific documents. Document preparation is one of the biggest product strengths."*
- `docs/PRODUCT_DIRECTION_IMPLEMENTATION_PLAN.md`, Milestone 4 (lines 209–214): objective is a "mobile-first 'start a document' flow… optionally linked to a Matter"; scope "reuses `DocumentEnvelope`/`DocumentVersion`/storage/AI Gateway entirely; adds a document-type picker and draft-first UX"; exclusions: "No new storage/versioning mechanism; no auto-finalization."
- `docs/ADVOCATE_OS_UX_BLUEPRINT.md` §9 (Prepare Document Experience) and §21.4: confirms **no real Prepare Document UI exists anywhere** — `/dashboard/draft-builder` is legacy, fully local-state, zero backend connection. Lays out the 8-step recommended flow (entry → category/type picker → minimal facts with optional Matter link → draft generation/guided template → review → versioning via the existing mechanism → export/print deferred to a future commercial milestone → resume-later). §10 item 3 separately notes the Matter page's "Documents" section should show "linked `DocumentEnvelope`s, reusing existing list/preview/download" — still a `ComingSoonPanel` stub today.
- `docs/PRODUCT_DIRECTION.md` "FOUNDATIONAL PRODUCT PRINCIPLES": §3 Zero Duplicate Work (don't re-ask for information already on record — e.g. Matter/Client party names), §5 Trust Before Automation (never auto-finalize; the advocate reviews and confirms), §6 One Question Test.

**Current Draft Builder assessment (`/dashboard/draft-builder/page.tsx`), verified by direct inspection:**
- 3 hardcoded `DraftTemplate` objects (India/US/UK jurisdictional pleadings) in a local array — no backend query of any kind.
- "AI Canvas Refiner" is a `setTimeout(…, 1000)` that string-concatenates a canned sentence onto the draft — not a real AI call, no provider, no context, no `fetch()`.
- "Save Draft" button's only action is `alert('Legal Draft generated successfully and committed to compliance audit log.')` — no `DocumentEnvelope` row, no storage write, nothing persisted.
- Zero connection to `DocumentEnvelope`/`DocumentVersion`/object storage/AI Gateway/search indexing. Confirmed: **this is a genuine clean-slate build, not a refactor of something existing** — nothing here is reusable except as a rough visual reference for the pleading-canvas look.
- Reachable only via the legacy `/dashboard/*` shell, itself already flagged (Blueprint §21.2) as a marketing-style menu superseded by the new IA — not a page any other milestone has touched or extended.

**Existing backend capability audit — what already exists and is real, verified route-by-route:**

| Capability | State |
|---|---|
| `POST /api/documents/upload` | Real. Persists a `DocumentEnvelope` + version-1 `DocumentVersion` atomically (one CTE), streams the raw request body to S3-compatible storage via `putObject`, accepts `x-case-id`/`x-matter-id` (both optional, cross-validated for Proceeding/Matter consistency, tenant-ownership re-verified via RLS-scoped SELECTs since FK checks bypass RLS by Postgres design). **Zero existing UI calls this today** — the only two source hits for the string are static mock/documentation text on `/admin` and `/docs`, not a real caller. This would be the first real UI consumer of an otherwise fully-backend capability. |
| `POST /api/documents/[id]/versions` | Real. Same binary-stream contract as upload, computes the next version number atomically, re-indexes synchronously. Also currently uncalled by any UI. |
| `GET /api/documents/[id]` / `PATCH .../[id]` / `DELETE .../[id]` | Real. **`PATCH` already supports changing `case_id`/`matter_id` after creation** — meaning "create with no Matter, link one later" (Blueprint §9 step 2's "Decide later") requires **zero new backend work**; it's already exactly this endpoint. |
| `GET /api/documents/[id]/preview`, `.../download` | Real, already handle the orphaned-object failure case cleanly. |
| `.txt` (`text/plain`) file type | **Already in `ALLOWED_DOCUMENT_EXTENSIONS`** (`lib/storage/document-key.ts`) and already in `PREVIEW_ELIGIBLE_CONTENT_TYPES` — a plain-text document is already a fully first-class, previewable, storable, versionable document type today, no schema/storage change needed. |
| `extractPlainText()` (`lib/search/text-extraction.ts`) | **Already branches on `contentType === 'text/plain'`** — a saved draft is already indexed and hybrid-searchable through the exact same pipeline an uploaded file goes through, with no new code. |
| AI Context Gateway (`lib/ai/context/gateway.ts`) | Real, Matter-scoped (`getMatterContext`), the single mandatory checkpoint (Authorization → `enforceEntitlement()` → cached Context Builder → Context Ranking) every AI feature must go through. |
| `enforceEntitlement()` | Real, always returns `allowed: true` today (no trial/credit/subscription state exists yet to check) — Milestone 4 needs no new entitlement logic; it flows through the existing checkpoint unchanged. |
| Prompt Builder (`lib/ai/prompt-builder.ts`), LLM Provider (`lib/ai/llm-provider.ts`), `askQuestion()` (`lib/ai/rag.ts`) | Real, provider-agnostic, and — critically — `askQuestion()`/`POST /api/ai/ask` is a complete, working, tested **reference implementation of the exact pipeline shape** a draft-generation feature needs (Authorization → entitlement → context → prompt → provider call → usage metering → audit log), just answering a question instead of drafting a document. |
| `AI_OPERATION_TYPES` (`lib/ai/operation-types.ts`) | **`DRAFT_CREATE`, `DRAFT_IMPROVE`, and `TEMPLATE_GENERATION` are already frozen, reserved values** in this Product-Owner-approved taxonomy, explicitly commented *"reserved for a future milestone's own feature (Draft Builder, Evidence Workspace, etc.) to use once it exists."* Milestone 4 is that milestone — no new operation type needs to be invented or approved; these three already are. |
| Document-type/practice-area vocabulary | **Does not exist anywhere.** No enum, no domain module, no UI list of document types or practice-area groupings — confirmed via `lib/domain/` inspection (only `court-note.ts`, `legal-case.ts`, `matter-task.ts`, `matter.ts`, `preparation.ts` exist) and via `Matter.practice_area` being a free `TEXT` column, not a controlled list. This is genuinely new, matching `lib/domain/court-note.ts`'s established controlled-vocabulary-with-"Other"-fallback pattern. |
| Matter page "Documents" section | Still `<ComingSoonPanel title="Documents" .../>` (Milestone 2's placeholder, untouched by Milestone 3). No route anywhere lists a Matter's or Case's linked documents today. |
| Top-level routes | No `/documents`, `/prepare`, or any real (non-`/dashboard`) document route exists. No Home page exists yet either (Blueprint §22 item 2, still not built) — so the Blueprint's "reachable in one tap from anywhere via Home/FAB" recommendation has no Home to attach to yet, the same situation Milestone 3 encountered with its preparation card. |
| Commercial/export gating | Confirmed unbuilt (Blueprint §15): `enforceEntitlement()` always allows, no wallet/credit UI exists. Per the Blueprint, export/print-formatted download is the future chargeable action, sequenced **after** Prepare Document exists — not part of this milestone. |

---

## 2. Gap Analysis

| Approved requirement | Exists today? | Gap |
|---|---|---|
| Document-type / practice-area picker | No | New: pure UI/domain vocabulary (`lib/domain/document-type.ts`), no schema change |
| Minimal-facts intake, Matter optional | Partial | `PATCH /api/documents/[id]` already supports later Matter linking — no gap on the backend; the intake **screen** itself is new |
| Draft generation grounded in Matter context when linked | No real caller | Gateway/Prompt Builder/Provider/entitlement/usage-metering all real and reusable as-is; only the draft-specific prompt + one new stateless endpoint is missing |
| Plain guided template when no Matter is linked | No | New: a small set of static per-document-type template strings (no AI call), mirroring today's Court Note "manual" path philosophy — never blocks the advocate for lack of a Matter |
| Review before anything is final | N/A (nothing persists today) | Satisfied by design: generation returns text only; nothing is written to `DocumentEnvelope` until the advocate explicitly saves |
| Versioning reuses `DocumentVersion` exactly | Real mechanism exists, unused by any UI | No gap in the mechanism — the gap is purely "nobody calls it yet" |
| Resume-later / "Continue drafting" | Backend: yes (`GET /api/documents/[id]`) | UI gap only; "Continue drafting" on Home is explicitly deferred (Home doesn't exist — see Open Decision 1) |
| Typist handoff | N/A | Explicitly out of scope (Milestone 6, not started) |
| Export/print/premium formatting | N/A | Explicitly out of scope (future commercial milestone, per Blueprint §15) |
| "Documents" section on Matter page | Still a stub | In scope to wire to real data, since it is the immediate visible home for what this milestone produces (see Open Decision 4) |

**No gap requires a new storage system, a new versioning concept, a new AI provider integration, or a new entitlement model.** Every gap above is either a pure UI/domain-vocabulary addition or "an existing, real, but never-yet-called backend capability."

---

## 3. Proposed Scope

1. **Document-type vocabulary** (`lib/domain/document-type.ts`): practice-area/forum groupings (Civil, Criminal, High Court, Supreme Court, Other) each containing a document-type list (Memo, Affidavit, Interim Application, Caveat, Plaint, Written Statement, Legal Notice, Agreement), plus an "Other" free-text fallback per group — mirrors `court-note.ts`'s established pattern exactly. UI grouping only, not a schema enum (per Blueprint §9 step 1), so adding a document type later never requires a migration.
2. **One new, stateless AI drafting endpoint** — returns generated or template draft text; **persists nothing itself** (Trust Before Automation: generation and saving are two distinct, explicit steps). Reuses `getMatterContext`/`buildPrompt`/`getLLMProvider`/`recordAiUsageEvent` exactly as `askQuestion()` does, with `operationType: 'DRAFT_CREATE'` (initial generation) or `'DRAFT_IMPROVE'` (refining already-drafted text). When no `matter_id` is given, returns a plain static per-document-type template instead of calling the LLM provider at all — never blocks the advocate for lack of a Matter, and never claims AI grounding it doesn't have.
3. **Zero new persistence endpoints.** The reviewed draft text is saved by having the client construct a `text/plain` blob and POST it through the **existing, unmodified** `POST /api/documents/upload` (first save) and `POST /api/documents/[id]/versions` (subsequent saves) — the exact same contract, headers, and code path a real file upload already uses today. `.txt` is already an allowed, preview-eligible, search-indexed type. This is the literal reuse of the existing mechanism the Implementation Plan calls for, not an adaptation of it.
4. **New UI:** a standalone `/documents/new` entry flow (category → type → minimal facts → draft editor) plus a **draft editor/detail screen** at `/documents/[id]` (real version history via the existing `GET .../versions`, real preview/download links).
5. **Matter page "Documents" section wired to real data** — replaces the `ComingSoonPanel` stub with a plain list of linked `DocumentEnvelope`s (title, date, View/Download using the existing preview/download endpoints) and a "+ Prepare Document" entry point that deep-links into `/documents/new` with `matter_id` pre-filled. (Open Decision 4.)
6. **Case page:** left untouched, per the established "no redesign outside approved scope" pattern from Milestones 2–3, unless the Product Owner wants the same Documents list added there too (flagged, not assumed).

---

## 4. Open Decisions Requiring Product Owner Confirmation

**Open Decision 1 — Global reachability ("from anywhere").**
The Blueprint recommends Prepare Document be reachable in one tap from Home/a FAB. Home does not exist yet (same situation Milestone 3 faced). Recommendation: ship `/documents/new` as a directly-linkable standalone route plus the Matter-page entry point (Open Decision 4) for this milestone; defer any Home/FAB placement until Home itself is built under its own approved milestone. No Navbar or navigation change is proposed.

**Open Decision 2 — Document-type list and grouping for v1.**
Recommendation: exactly the list named in `PRODUCT_DIRECTION.md`'s Entry Point 1 (Memo, Affidavit, Interim Application, Caveat, Plaint, Written Statement, Legal Notice, Agreement) plus "Other" (free text), grouped by the five categories named in Blueprint §9 step 1 (Civil, Criminal, High Court, Supreme Court, Other). Confirm this is the correct v1 list before it's encoded.

**Open Decision 3 — Minimal-facts fields.**
Recommendation: Title (required), Parties (free text, optional), one-line description (optional), Matter link (existing Matter picker or "Decide later"). Per Zero Duplicate Work, if the advocate arrives via the Matter page's "+ Prepare Document" button, the Matter is pre-selected and this whole screen is skipped. Confirm this is the right minimum, not more.

**Open Decision 4 — Wiring the Matter page's "Documents" section.**
Not explicitly named in the directive's deliverable list, but it is the immediate, obvious place a saved draft becomes visible, and Blueprint §10 item 3 already calls for it. Recommendation: include it as a small, additive, read-only list (same visual pattern as "Recent Court Note"/"Pending Actions"), since leaving it a permanent stub would make this milestone's own output invisible from the Matter workspace. Flagging for explicit confirmation since it's an inference, not a literal instruction.

**Open Decision 5 — Case page.**
Recommendation: no change. Confirm, or state if the same Documents list should also appear on `/cases/[id]`.

---

## 5. UI Wireframe — Exact Page/Component Placement

### 5.1 New route: `/documents/new` — Step 1 (Category → Type)
```
┌─────────────────────────────────┐
│ ← Back to Matters/Home           │
│                                   │
│  PREPARE A DOCUMENT               │
│  Start a new draft                │
│                                   │
│  CATEGORY                          │
│  [Civil] [Criminal] [High Court]  │
│  [Supreme Court] [Other]           │
│                                   │
│  (selecting a category reveals    │
│   its document-type list below,   │
│   in place — no navigation)       │
│                                   │
│  DOCUMENT TYPE                     │
│   ○ Memo                          │
│   ○ Affidavit                     │
│   ○ Interim Application            │
│   ○ Caveat                        │
│   ○ Plaint                        │
│   ○ Written Statement              │
│   ○ Legal Notice                   │
│   ○ Agreement                     │
│   ○ Other (free text)              │
│                                   │
│        [ Continue → ]              │
└─────────────────────────────────┘
```

### 5.2 `/documents/new` — Step 2 (Minimal Facts; skipped if arriving pre-linked from a Matter)
```
┌─────────────────────────────────┐
│ ← Back            MEMO           │
│                                   │
│  TITLE *                          │
│  [_____________________]          │
│                                   │
│  PARTIES (optional)                │
│  [_____________________]          │
│                                   │
│  ONE-LINE DESCRIPTION (optional)   │
│  [_____________________]          │
│                                   │
│  LINK TO A MATTER                  │
│  ( ) [ Select a Matter ▾ ]          │
│  ( ) Decide later                  │
│                                   │
│        [ Generate Draft → ]        │
└─────────────────────────────────┘
```

### 5.3 `/documents/[id]` — Draft editor (real, persisted once first saved)
```
┌─────────────────────────────────┐
│ ← Back        MEMO                │
│  Matter: State vs Doe              │
│  (or: Not linked · [Link now])     │
│                                   │
│  ┌─────────────────────────────┐  │
│  │ (editable draft text area)   │  │
│  │                               │  │
│  │  Grounded in this Matter's    │  │
│  │  Court Note / Proceeding      │  │
│  │  context, or a plain guided   │  │
│  │  template if not linked.      │  │
│  └─────────────────────────────┘  │
│                                   │
│  ✨ IMPROVE WITH AI                 │
│  [ e.g. "add a limitation        │
│    paragraph" ] [ Apply ]          │
│                                   │
│        [ Save Draft ]              │
│                                   │
│  VERSION HISTORY                   │
│   v2 · saved just now              │
│   v1 · saved 3 min ago              │
└─────────────────────────────────┘
```
No auto-finalization anywhere on this screen — "Save Draft" always produces one more plain `DocumentVersion`, never a distinct "final" state (export/finalization is explicitly out of scope, §15).

### 5.4 Existing page, extended: Matter page (`/matters/[id]`) — Documents section
Replaces today's `<ComingSoonPanel title="Documents" .../>` in place, same position in the established hierarchy (after Matter Timeline, before the sidebar Participants panel — unchanged position, only the stub's content changes):
```
┌─────────────────────────────────┐
│ DOCUMENTS              (2)        │
│                    [+ Prepare]     │
│  ────────────────────────────     │
│  📄 Memo on Limitation Period      │
│     Saved 2 days ago               │
│     [ View ]  [ Download ]          │
│  ────────────────────────────     │
│  📄 Affidavit of Evidence          │
│     Saved 5 days ago               │
│     [ View ]  [ Download ]          │
└─────────────────────────────────┘
```
"[+ Prepare]" deep-links to `/documents/new` with `matter_id` pre-filled, skipping Step 2's Matter picker. No other Matter-page section is touched; the established Milestone 2/3 hierarchy (Header → Prepare for Hearing → Matter Health → Recent Court Note → Pending Actions → Matter Overview → Proceedings → Matter Timeline → **Documents** → Participants) is otherwise unchanged.

No changes anywhere to Home, Navbar, login flow, Case page (pending Open Decision 5), or Court Note page.

---

## 6. Proposed Data Model

**No schema changes.** `DocumentEnvelope`, `DocumentVersion`, `CountryPack`/`CourtPack` (unrelated), and every RLS/index/grant already in place are sufficient. The only new code is:
- `lib/domain/document-type.ts` — a plain TypeScript module (constants + labels), no table.
- No new `AiOperationType` values — `DRAFT_CREATE`/`DRAFT_IMPROVE` already exist in the frozen taxonomy.

---

## 7. API Changes

- **NEW** `POST /api/documents/draft/generate` — stateless. Body: `{ document_type, category, matter_id?, case_id?, parties?, description?, mode: 'CREATE' | 'IMPROVE', existing_text?, instruction? }`. When `matter_id` is present, calls `getMatterContext()` + `buildPrompt()` + `getLLMProvider()` exactly as `askQuestion()` does, with `operationType: 'DRAFT_CREATE'` or `'DRAFT_IMPROVE'`; records usage via `recordAiUsageEvent()` on both success and failure, matching `rag.ts`'s existing pattern precisely. When `matter_id` is absent, returns a static per-document-type template string with no provider call and no usage event (nothing chargeable happened). Returns `{ text }` only — never writes to `DocumentEnvelope`/`DocumentVersion`.
- **No changes** to `POST /api/documents/upload`, `POST /api/documents/[id]/versions`, `GET/PATCH/DELETE /api/documents/[id]`, `.../preview`, `.../download`, `.../index` — all reused exactly as they are today. The client saves a draft by sending its text as a `text/plain` body through the existing upload/versions contract, precisely as the Implementation Plan's "reuses `DocumentEnvelope`/`DocumentVersion`/storage/AI Gateway entirely" requires.
- **NEW** `GET /api/matters/[id]/documents` — small, tenant-scoped, read-only list of `DocumentEnvelope`s linked to the Matter (directly via `matter_id`, matching the same denormalized-linkage pattern `CourtNote.matter_id` already established), for the Matter page's Documents section. Mirrors `GET /api/matters/[id]/court-notes`'s shape exactly.

---

## 8. Security Model

- `POST /api/documents/draft/generate`: `requireSession` + `isTrustedOrigin`, identical to every other mutating/AI-adjacent route. A `matter_id` cross-tenant or nonexistent fails closed via the existing `MatterNotFoundError` path inside `getMatterContext()` — no new authorization code needed.
- Saving a draft: identical security posture to today's upload/versions endpoints — nothing changes, since nothing changes in those routes.
- `GET /api/matters/[id]/documents`: tenant-scoped `db.execute(tenantId, …)`, matching every other Matter sub-resource endpoint.
- No new entitlement logic; `enforceEntitlement()` is reached through the same single checkpoint as every other AI operation.

---

## 9. Audit Model

Every AI-assisted draft generation/improvement is recorded via the existing `recordAiUsageEvent()` (`AiUsageEvent`, append-only) with `operationType: 'DRAFT_CREATE'`/`'DRAFT_IMPROVE'` — no new audit table. A saved document version is already covered by `DocumentVersion.created_by`/`created_at` — no new provenance tracking required.

---

## 10. Test Strategy

- `lib/domain/document-type.ts`: unit tests for the vocabulary/grouping/label resolution, mirroring `court-note.ts`'s test style.
- `POST /api/documents/draft/generate`: with `matter_id` (grounded generation, `DRAFT_CREATE` usage event recorded, cross-tenant `matter_id` → 404), without `matter_id` (static template, no usage event, no provider call), `mode: 'IMPROVE'` path, AI-provider-not-configured/-failure paths (mirroring `rag.ts`'s existing failure-path tests).
- `GET /api/matters/[id]/documents`: RLS isolation, correct filtering by `matter_id`, empty state.
- End-to-end save path: exercised via the existing, already-tested `upload`/`versions` routes — no new persistence tests needed beyond confirming a `.txt` body round-trips correctly (already implicitly covered by existing file-type-allowlist tests).
- Fresh `crypto.randomUUID()` tenant/user ids per test file, embedding the id into any DB-unique email, per established convention (and the concrete rerun-safety lesson from Milestone 3's own test files).

---

## 11. Runtime Verification Plan

- Local: generate a draft with a linked Matter (confirm Court Note context appears in the output), generate one without a Matter (confirm the static template, no `AiUsageEvent` row), save a draft via the existing upload contract (confirm `DocumentEnvelope`/`DocumentVersion` rows and that it is immediately previewable/downloadable/searchable), edit and re-save (confirm a new version, not an overwrite).
- Playwright (mobile viewport): full flow from `/documents/new` through save, and from the Matter page's "+ Prepare" button through to a document appearing in that Matter's Documents list.

---

## 12. Rollback Approach

Additive-only: no schema change, no modification to any existing route. Rollback is removing the new route/endpoint/domain module and the Matter page's Documents section addition — nothing to undo in existing tables or existing endpoints since none are touched.

---

## 13. Explicit Exclusions

- No Home page build, no Navbar/navigation change, no login-flow change.
- No new storage or versioning mechanism — `DocumentEnvelope`/`DocumentVersion`/object storage are reused exactly as built.
- No new AI provider integration — the existing provider abstraction, Context Gateway, Prompt Builder, and entitlement checkpoint are reused exactly as built.
- No auto-finalization, no auto-filing, no auto-sent communications — matches Trust Before Automation and Milestone 1's own precedent.
- No export/print/premium-formatted download, no wallet/credit UI — deferred to the future commercial milestone per Blueprint §15.
- No Typist Collaboration (Milestone 6, unstarted).
- No Universal Search frontend work (Milestone 5, unstarted).
- No change to Court Note page, and no change to the Case page unless Open Decision 5 is answered otherwise.

---

## 14. Risks

- **First real UI consumer of the upload/versions endpoints** — low risk (the endpoints are already tested and used in this exact shape by the test suite; this milestone is "give them a caller," not "change their contract"), but worth flagging since it is a genuine first.
- **Document-type list completeness** — the v1 list (Open Decision 2) is deliberately the exact set named in the approved direction, not an attempt at a comprehensive taxonomy; adding more later is a pure data change (UI grouping, not a schema enum), not a migration.
- **AI-grounded draft quality** — same class of risk as `/api/ai/ask` already carries (LLM output quality/hallucination), mitigated the same way: mandatory human review before save, never auto-finalized, and the "no Matter linked" path never claims AI grounding it doesn't have.

---

## 15. Acceptance Criteria

This plan is ready for implementation once the Product Owner confirms:
1. Open Decisions 1–5 above (or overrides them with different direction).
2. The §5 wireframes and their placement (standalone `/documents/new` + `/documents/[id]`, plus the Matter page's Documents section) as the approved UI.
3. The "zero new persistence endpoints, one new stateless drafting endpoint" architecture in §3/§7 as the approved reuse strategy.
4. The scope in §3 as the complete, correct first-cut scope for Milestone 4 — no additions before it ships once.
5. No implementation begins until this sign-off happens, consistent with Milestones 1–3's own review process.
