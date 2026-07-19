# NEXTCASEHQ — PRODUCT DIRECTION IMPLEMENTATION PLAN
**TO:** Founder & Engineering
**FROM:** Chief Product Engineer
**STATUS:** Read-only audit complete. Milestone 1 approved for implementation; Milestones 2–6 sequenced, not started.
**SUPERSEDES:** Nothing — this is additive to `docs/PRODUCT_DIRECTION.md`, `docs/BUILD_LEDGER.json`, and the Engineering Constitution.

---

## 1. READ-ONLY IMPLEMENTATION AUDIT

### 1.1 What already exists

| Capability | State | Evidence |
|---|---|---|
| Tenant-isolated Matter (client engagement) | **Exists** | `db/schema.sql` `"Matter"` table — status, engagement_type, court/bench/judge, client_id |
| Proceeding (a Matter's litigation instance) with hearing fields | **Exists** | `"LegalCase"` table already has `hearing_date` (TEXT `YYYY-MM-DD`), `stage` (free text), `court`, `judge`, `status`, `notes`. `PATCH /api/cases/[id]` already accepts partial updates to all of these. |
| Manual Matter chronology / timeline | **Exists** | `"MatterEvent"` table + `GET`/`POST /api/matters/[id]/events`. `source_type` enum already reserves `'HEARING'` for automatic entries — built for exactly this, unused until now. |
| Matter ⇄ Proceeding linkage | **Exists** | `LegalCase.matter_id` nullable FK; Matter detail page (`apps/web/src/app/matters/[id]/page.tsx`) already lists linked Proceedings inline. |
| AI context cache keyed by Matter | **Exists** | `invalidateMatterContext(tenantId, matterId)` (`lib/ai/context/cache.ts`), already called by the Matter/Case/Event routes on every mutation. |
| Append-only, grant-restricted audit tables | **Exists as a pattern** | `AiUsageEvent`, `DocumentAccessEvent` — `REVOKE UPDATE, DELETE` at the DB grant level, not just convention. |
| AI usage entitlement/credit gating | **Exists, AI-scoped only** | `lib/ai/entitlement.ts` gates AI operations (drafting, research, chat). Nothing gates plain CRUD (creating your own record is never charged — `WalletTransactionRecord`/`TenantWallet` back the credit ledger for AI/premium actions only). |
| Universal / hybrid document search | **Exists, document-scoped** | `lib/search/hybrid-search.ts` + `/api/search` — pgvector + keyword hybrid search over `DocumentChunkVector`. It does **not** index Matters, Proceedings, clients, or judges — Milestone 5 territory. |
| Notification delivery (in-app) | **Exists, no scheduling** | `"Notification"` table + `/api/notifications` — real in-app bell, no reminder/scheduling engine behind it yet (Milestone 3 needs this). |
| Task / reminder / pending-action entity | **Absent** | No table. `MatterEvent.source_type` anticipates `'HEARING'`/`'ORDER'`/`'DOCUMENT'` but there is no standalone actionable-task record anywhere in the schema. |
| Voice / speech-to-text infrastructure | **Absent** | No `SpeechRecognition`, `MediaRecorder`, or vendor speech SDK anywhere in `apps/web/src`. |
| Court/Forum structured vocabulary | **Absent** | `LegalCase.court` and `Matter.court` are plain nullable `TEXT` — no enum, no "Other Forum" concept yet. |
| Court Note entity | **Absent** | Confirmed via schema + full-text search of the codebase — this is genuinely new. |

### 1.2 Two conflicting UI surfaces (pre-existing, out of scope to fix here)

There are two parallel front-end shells:

1. **The new Advocate Workspace surface** (`apps/web/src/app/matters/*`, `apps/web/src/app/cases/[id]/*`) — top-level routes, Tailwind mobile-first-ish (`md:` breakpoint overrides on mobile-default classes), warm parchment/gold brand palette (`#241E17`, `#3A3222`, `#8A6D2F`, `#B0A588`, `#F4EEE0`, `#FBF8F1`), `BrandBackground`/`EmptyState` shared components. This is where Sprint 3 (Matter/Document work) has been landing.
2. **The legacy `/dashboard/*` shell** (`apps/web/src/app/dashboard/layout.tsx`) — a fixed 256px desktop sidebar the file's own comment calls "High-density," hardcoded nav items, no responsive/mobile treatment, and **no link to `/matters` at all**.

This is exactly the "ERP-style" conflict the product direction warns against. Per the "do not redesign the architecture" / "do not refactor unrelated files" rule, **this plan does not touch `/dashboard/layout.tsx`**. Every new screen in this plan is built as a top-level route alongside `/matters` and `/cases`, matching surface (1), which is already the direction the last four sprints have been moving in. Reconciling or retiring the legacy shell is a separate, explicitly-out-of-scope decision for the Product Owner.

### 1.3 Conflicts / risks checked against completed work

- **Matter delete safety (PR #88):** `DELETE /api/matters/[id]` already 409s on linked `MatterEvent` rows. A Matter with Court Notes will also gain `MatterEvent` rows (Milestone 1 writes one HEARING event per Court Note when a Proceeding is matter-linked), so it is automatically covered by the existing block — no change needed there.
- **Document linkage/versioning (PR #92):** untouched: Court Notes never reference `DocumentEnvelope`.
- **AI Context Gateway / Usage Metering (PR #89–91):** untouched: Court Notes are not an `AiUsageEvent` operation type; no entitlement check is added for them (see §1.1 — this is deliberate, not an oversight).
- **Document search alignment / preview (PR #93–94):** untouched.
- **RLS:** every new table follows the existing `tenant_id` + `FORCE ROW LEVEL SECURITY` pattern; no exceptions needed.

### 1.4 Answering the audit's seven questions

1. **Capabilities that already exist:** Proceeding-level hearing fields, Matter chronology, AI context invalidation, append-only audit table pattern, tenant isolation/RLS, Matter↔Proceeding linkage, in-app notifications.
2. **Partially exist, to extend:** `MatterEvent.source_type = 'HEARING'` (reserved, unused) → Milestone 1 is its first producer. `LegalCase.hearing_date/stage/court` (exist, editable only via generic PATCH, no dedicated fast-entry flow) → Milestone 1 gives them a purpose-built entry point.
3. **Absent:** Court Note entity, structured Court/Forum vocabulary, Task/reminder entity, voice input, 7-day preparation view, Prepare Document entry point, cross-entity universal search.
4. **Conflicting screens:** the legacy `/dashboard` shell (see §1.2) — not modified by this plan.
5. **Reusable architecture:** `DatabaseClient.execute(tenantId, sql, params)` RLS pattern, zod-validated route handlers, `isTrustedOrigin`/`requireSession` guard pair, `invalidateMatterContext`, the `WITH ... RETURNING` atomic-update CTE style used in `PATCH /api/matters/[id]`, the append-only audit-table grant pattern, and the client-side list-then-filter UX already used by `/matters`.
6. **Data model support:** Yes, safely — Milestone 1 is additive only (one new table, zero destructive changes to `LegalCase`/`Matter`).
7. **Conflicts with completed work:** None identified (see §1.3).

---

## 2. MILESTONE SEQUENCE (approved priority order, unchanged from the directive)

1. **Court Note Quick Entry Foundation** ← this plan implements this one now
2. Hearing-Driven Matter Record Building
3. Seven-Day Case Preparation Workflow
4. Prepare Document Entry Point
5. Matter Health and Universal Search
6. Controlled Typist/Assistant Collaboration

Milestones 2–6 are sequenced below at the level of detail the directive requires, but **not started**. Only Milestone 1 is implemented in this change.

---

## MILESTONE 1 — COURT NOTE QUICK ENTRY FOUNDATION

### Objective
Give the advocate a single, mobile-first screen to record what just happened in court — in under 30 seconds — that durably captures the hearing and keeps the Proceeding's current state (next hearing date, stage, court/forum) in sync, without ever destroying prior hearing history.

### User problem solved
Today, updating a Proceeding after a hearing means opening the case detail page and editing a single freeform `notes` field with no structure, no history, and no connection to the Matter timeline. The advocate has nowhere to log "what happened, what's next" in a purpose-built, fast, one-thumb flow.

### Exact scope
- A new **`CourtNote`** table: one immutable row per hearing, scoped to a Proceeding (`LegalCase`), denormalized to its Matter when linked.
- `POST /api/cases/[id]/court-notes` — create a Court Note. Single atomic statement (CTE) that: inserts the `CourtNote` row, updates `LegalCase.hearing_date`/`stage`/`court`, and — only when the Proceeding has a `matter_id` — inserts one `MatterEvent` row (`source_type = 'HEARING'`) referencing the Proceeding and note, so the Matter timeline updates automatically with zero duplicate entry.
- `GET /api/cases/[id]/court-notes` — list a Proceeding's Court Notes, newest first (the hearing history view).
- A new mobile-first screen, `/cases/[id]/court-note`, reachable from the case detail page via a single prominent "Record Court Note" action, plus a top-level `/court-note` fast-entry route that starts with a lightweight Proceeding picker (title/case number/matter name, reusing the existing `GET /api/cases` list + client-side filter pattern already used by `/matters`) for the "I just walked out of court, which matter was that" case.
- Structured Court/Forum field: a fixed quick-select list (Supreme Court, High Court, Civil Court, Criminal Court, Family Court, Commercial Court, Consumer Commission, Labour Court, MACT, Arbitration, Revenue Court) plus "Other Forum" free text, with both the selected type and the advocate's literal wording stored (never lossy).
- Progressive-enhancement browser dictation (native `SpeechRecognition` Web API, feature-detected) on the note/next-actions text fields only — no backend, no vendor SDK, no claim of AI field-extraction. Hidden entirely where unsupported. Marks the note's `input_method` as `HYBRID` when used, `MANUAL` otherwise.
- Author, timestamp, tenant, and Proceeding/Matter provenance recorded on every row.

### Explicit exclusions (deliberately not in Milestone 1)
- **No standalone Task/reminder entity.** "Next actions" is captured as a reviewed text field on the Court Note itself, not a new mutable, assignable, notifiable Task system — that is Milestone 2/3 territory per the directive's own sequencing ("Hearing-Driven Matter Record Building" is where pending actions get built from Court Notes).
- **No AI-driven field extraction from dictation.** Voice only fills the text field the advocate then reviews; nothing is auto-parsed into hearing date/stage/etc. The directive explicitly forbids pretending this exists without a configured provider.
- **No 7-day preparation view, no reminders/notifications, no scheduling.** Milestone 3.
- **No changes to `Matter` table, `Matter.court`, or a Matter-level hearing field.** Hearings live on the Proceeding, matching existing data (Milestone 2 may add Matter-level rollups; this milestone does not).
- **No entitlement/credit charge.** Recording a Court Note is core free daily usage, not a premium/AI action.
- **No touch to `/dashboard/*` legacy shell, no visual redesign of `/cases/[id]` beyond adding one new call-to-action button.**
- **No Prepare Document, no typist collaboration, no universal search expansion.**

### Existing components reused
`DatabaseClient.execute` RLS pattern; `requireSession`/`UnauthenticatedError`; `isTrustedOrigin`; the atomic `WITH ... RETURNING` CTE style from `PATCH /api/matters/[id]`; `invalidateMatterContext`; the append-only audit-table grant pattern (`AiUsageEvent`/`DocumentAccessEvent`); `BrandBackground`/`EmptyState` components and the existing brand palette; the client-side fetch-then-filter picker pattern from `/matters`.

### Data-model changes
Additive only, in `db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS "CourtNote" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "case_id" UUID NOT NULL REFERENCES "LegalCase"("id") ON DELETE RESTRICT,
    "matter_id" UUID REFERENCES "Matter"("id"),
    "author_user_id" UUID NOT NULL REFERENCES "User"("id"),
    "hearing_date" DATE NOT NULL,
    "next_hearing_date" DATE,
    "court_forum_type" TEXT NOT NULL,
    "court_forum_other" TEXT,
    "court_forum_display" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "next_actions" TEXT,
    "input_method" TEXT NOT NULL DEFAULT 'MANUAL',
    "created_at" TIMESTAMPTZ DEFAULT now()
);
-- + CHECK constraints on court_forum_type and input_method
-- + RLS policy + FORCE ROW LEVEL SECURITY, matching every other tenant table
-- + REVOKE UPDATE, DELETE FROM the application role (append-only, same as AiUsageEvent/DocumentAccessEvent)
```

`case_id` is `RESTRICT` (not `CASCADE`), same lesson as `DocumentEnvelope.case_id` — a Proceeding with Court Notes must not silently vanish its hearing history via cascade; deleting a Proceeding with notes should be blocked, matching the existing `DELETE /api/cases/[id]` linked-records pattern (extended to check `CourtNote` too).

No change to `LegalCase` or `Matter` columns — the existing `hearing_date`/`stage`/`court` columns are reused, only now updated by a purpose-built endpoint instead of the generic PATCH.

### API changes
- `POST /api/cases/[id]/court-notes` (new) — validates payload with zod, requires session + trusted origin, verifies the Proceeding is in-tenant, single CTE insert+update+conditional-timeline-event, then `invalidateMatterContext`. Returns the created Court Note (with resolved `court_forum_display`) and the updated Proceeding snapshot.
- `GET /api/cases/[id]/court-notes` (new) — session-scoped list, newest first.
- `GET /api/cases/[id]` response gains no new fields (still returns the same `hearing_date`/`stage`/`court` columns, now sourced from Court Note saves as well as the generic PATCH).
- `DELETE /api/cases/[id]` gains one more linked-record check (`CourtNote` count) alongside its existing checks, returning the same `409 MATTER_HAS_LINKED_RECORDS`-style response — no breaking change to its response shape for callers who never hit that path.
- No changes to `/api/matters/*` request/response shapes — `POST .../events` continues to work unchanged; Court Note's auto-generated `MatterEvent` rows simply appear alongside manually-created ones with `source_type = 'HEARING'`.

### Mobile UX changes
- New screen `/cases/[id]/court-note` (and matter-agnostic entry `/court-note` that starts with the proceeding picker): one visible primary task, large date/select controls, a single scrollable form with progressive disclosure (Next Actions and dictation are below the fold, note/date/stage/forum are the primary above-the-fold fields), sticky "Save Court Note" confirmation bar so it's reachable one-thumb from anywhere in the scroll.
- New CTA button "Record Court Note" added to `/cases/[id]` (the only change to that existing page).
- Court Note history rendered as a simple reverse-chronological list on the case detail page, reusing that page's existing card styling.
- No changes to desktop layout beyond the same responsive component rendering wider (existing `md:` breakpoint convention).

### Desktop impact
None beyond the same responsive page rendering at a wider viewport — no separate desktop-only design, per the mobile-first directive.

### Security and tenant-isolation considerations
- `tenant_id` + RLS (`FORCE ROW LEVEL SECURITY`) on `CourtNote`, identical to every existing tenant table.
- Proceeding ownership re-verified through an RLS-scoped `SELECT` before insert (same defense used by `POST /api/matters/[id]/events` against FK-bypasses-RLS).
- `REVOKE UPDATE, DELETE` at the grant level — a Court Note cannot be silently altered or erased by any code path, intentional or buggy.
- `isTrustedOrigin` + `requireSession` on the mutating route, matching every other mutation endpoint in the codebase.
- No storage-provider or cross-tenant identifiers ever returned to the client.

### Commercial entitlement or credit implications
None. Recording a Court Note is not gated by `lib/ai/entitlement.ts` or charged against `TenantWallet` — it is core, free, daily-habit-forming usage, consistent with "we are not selling AI" and "never charge for viewing/creating your own records."

### Accessibility requirements
Large (≥44px) touch targets on all inputs/buttons; visible focus states; date and select inputs use native mobile pickers (no custom widgets that break screen readers); dictation button has an `aria-label` and a visible pressed/listening state (not color-only); all form fields have associated `<label>`s; error and save-confirmation states are announced via `aria-live`.

### Test plan
- Unit/route tests (Jest, mirroring `apps/web/src/app/api/matters/__tests__/events-route.test.ts` and `apps/web/src/app/api/cases/__tests__/route.test.ts`):
  - Unauthenticated → 401; untrusted origin → 403; invalid `case_id` → 400/404; cross-tenant `case_id` → 404 (RLS).
  - Valid create → 201, `LegalCase.hearing_date/stage/court` updated, `court_forum_display` resolved correctly for both quick-select and "Other" paths.
  - Proceeding **without** a `matter_id` → no `MatterEvent` row created (no orphaned/incorrect timeline entry).
  - Proceeding **with** a `matter_id` → exactly one `MatterEvent` row created, `source_type = 'HEARING'`, and `invalidateMatterContext` called.
  - Two sequential Court Notes on the same Proceeding → both rows persist unchanged (no destructive overwrite); `LegalCase` reflects only the latest.
  - Update/delete attempted directly against `CourtNote` at the DB layer → rejected by the grant (append-only proof).
  - `DELETE /api/cases/[id]` with existing Court Notes → 409, unchanged shape.
- No new E2E/browser test infra introduced; existing Jest suite is the bar. Manual runtime verification of the mobile screen via `/verify` skill flow (dev server, real create → confirm case detail + Matter timeline update) before reporting done.

### Acceptance criteria
1. An advocate can go from "just left the courtroom" to a saved Court Note in ≤ 30 seconds on a phone-sized viewport, using only the primary above-the-fold fields.
2. Saving a Court Note updates the Proceeding's `hearing_date`, `stage`, and `court` without requiring a second action.
3. If the Proceeding belongs to a Matter, the Matter's existing chronology (`MatterEvent`/`/api/matters/[id]/events`) shows the hearing automatically — no manual re-entry.
4. Prior Court Notes are never edited or deleted by this flow; the full hearing history is visible on the case page.
5. "Other Forum" entries preserve the advocate's exact wording while still being distinguishable from quick-select forums in storage.
6. All new endpoints reject unauthenticated, untrusted-origin, and cross-tenant requests exactly like existing endpoints.
7. Full test suite, typecheck, build, and lint all pass with zero regressions.

### Rollback approach
Additive-only migration (`CREATE TABLE IF NOT EXISTS`, one new grant/RLS block) — rollback is dropping the new table and route files; no existing table is altered destructively, so no backfill/down-migration risk exists for `LegalCase`/`Matter`. Reverting the commit alone is sufficient.

### Dependencies
None outside this repository. No new npm package, no new vendor/provider credential. Browser `SpeechRecognition` is used only if `window.SpeechRecognition`/`webkitSpeechRecognition` exists — zero install-time dependency.

### Risk level
**Low.** Additive schema, no changes to existing endpoints' request/response contracts (one endpoint gains one more read-only check), no new third-party dependency, no touch to billing/entitlement/security-critical paths beyond adding one more RLS-protected table following an already-proven pattern.

---

## MILESTONES 2–6 (sequenced, not started)

### Milestone 2 — Hearing-Driven Matter Record Building
**Objective:** Make the Matter page itself surface hearing history, current stage, and next hearing derived from Court Notes, without new manual entry.
**Scope:** Matter detail page reads and renders `CourtNote` history across all its Proceedings; a lightweight, correctable "Pending Actions" list is introduced here (first real Task-shaped entity), sourced from `CourtNote.next_actions`, editable/completable, traceable back to its originating Court Note.
**Exclusions:** No reminders/notifications yet (Milestone 3); no AI-generated recommendations.
**Data model:** New `MatterTask` table (or equivalent), FK to `CourtNote.id` for provenance, correctable (unlike `CourtNote` itself).
**Dependencies:** Milestone 1 must ship first — this milestone is read/derive-only against it.
**Risk:** Low-medium (first mutable derived-record entity; needs clear correction semantics).

### Milestone 3 — Seven-Day Case Preparation Workflow
**Objective:** Seven days before `next_hearing_date`, proactively surface a preparation view, not just a reminder.
**Scope:** Scheduled job (reuse `Notification` delivery, add the scheduling trigger), preparation view page assembling last Court Note + pending actions + documents.
**Exclusions:** No AI recommendations unless a reviewed, provider-backed workflow exists — a plain checklist ships first.
**Data model:** A dedup/idempotency marker per (Proceeding, hearing_date) to avoid duplicate reminders on hearing-date changes.
**Security:** Tenant-scoped scheduling, retry/failure handling, timezone correctness.
**Dependencies:** Milestones 1 and 2.
**Risk:** Medium (first scheduling/notification-timing subsystem).

### Milestone 4 — Prepare Document Entry Point
**Objective:** Mobile-first "start a document" flow (Memo, Affidavit, Interim Application, etc.), optionally linked to a Matter.
**Scope:** Reuses `DocumentEnvelope`/`DocumentVersion`/storage/AI Gateway entirely; adds a document-type picker and draft-first UX.
**Exclusions:** No new storage/versioning mechanism; no auto-finalization.
**Dependencies:** None on Milestones 2/3; could in principle run in parallel, but the directive's priority order places it after the Court Note-driven Matter record-building lands.
**Risk:** Medium (biggest scope of the remaining milestones; must not duplicate existing document upload flow).

### Milestone 5 — Matter Health and Universal Search
**Objective:** At-a-glance Matter status; search across clients/opponents/matters/case numbers/courts/judges/hearing dates in addition to today's document-only hybrid search.
**Scope:** Extend `hybridSearch`/`/api/search` to also query `Matter`/`LegalCase`/`Client`, not replace it; continue Postgres + pgvector, no Elasticsearch.
**Dependencies:** Benefits from Milestones 1–2 (Matter Health reads Court Note-derived state).
**Risk:** Medium (query performance across heterogeneous entity types).

### Milestone 6 — Controlled Typist/Assistant Collaboration
**Objective:** Least-privilege, explicit, revocable single-document sharing for formatting/correction help.
**Scope:** Scoped share token/grant on one `DocumentEnvelope`/`DocumentVersion`, not practice-wide access.
**Exclusions:** No broad multi-role/permissions system.
**Dependencies:** Milestone 4 (Prepare Document) should be stable first, per the directive.
**Risk:** Medium-high (new access-control surface — needs its own dedicated security review before implementation).

---

## SUMMARY FOR THE REQUIRED REPORT

See the implementation report posted after Milestone 1 lands for: exact files changed, migration SQL, API contract details, mobile UX walkthrough, security/tenant-isolation controls, test/build/lint results, commit hash, and remaining limitations.
