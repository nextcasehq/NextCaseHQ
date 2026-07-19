# MILESTONE 2 — HEARING-DRIVEN MATTER RECORD BUILDING
**STATUS:** Plan for implementation, following the mandatory read-only audit below.
**SCOPE:** Matter-level Court Note aggregation, structured pending actions, Matter Health summary, chronology review, and their read-only display on the Matter screen — nothing else. Milestone 3, Prepare Document, Universal Search, Typist Collaboration, commercial UI, and navigation unification are explicitly out of scope for this PR.

---

## 1. Read-Only Audit — Existing-State Findings

Verified directly against `db/schema.sql`, the current `apps/web/src/app/api/matters/*` and `apps/web/src/app/api/cases/[id]/court-notes/*` routes, `apps/web/src/app/matters/[id]/page.tsx`, and the two governing documents.

| Question | Finding |
|---|---|
| **1. Does a reusable task entity already exist?** | No. `Notification` (tenant-scoped, `type`/`title`/`message`/`read_at`) is the only entity in the schema that resembles a to-do item, but it has no Matter linkage, no Court Note linkage, no completion state beyond read/unread, and is a broadcast/alert mechanism, not a task list. No table anywhere is named or shaped like a Task. A new, minimal entity is required. |
| **2. Is `MatterEvent` sufficient for hearing chronology?** | Yes, unchanged. `MatterEvent` (`tenant_id`, `matter_id` `ON DELETE CASCADE`, `event_date` `DATE`, `description`, `source_type` — already constrained to `MANUAL`/`HEARING`/`ORDER`/`DOCUMENT`) already receives one `HEARING`-sourced row per Court Note save on a matter-linked Proceeding, wired in Milestone 1. It requires no schema change for this milestone. |
| **3. How can Matter-level Court Notes be aggregated without duplicating source records?** | `CourtNote.matter_id` is already populated (denormalized from `LegalCase.matter_id` at insert time, specifically so a Matter's full hearing history can be read without joining through `LegalCase`). Aggregation is therefore a pure, read-only `SELECT ... FROM "CourtNote" WHERE matter_id = $1` — no new table, no copy of Court Note content anywhere. |
| **4. Which fields should be derived versus persisted?** | Everything in Matter Health (current stage, next hearing date, last-activity summary, needs-attention flag, pending-action count) is derived at query time from existing rows (`CourtNote`, `LegalCase.hearing_date/stage/court` — already kept in sync by every Court Note save — and the one new `MatterTask` table's status column). Nothing about "health" is persisted as new Matter columns; a stale, un-invalidated health snapshot is a strictly worse failure mode than a live query, and the query cost here is small (bounded by a Matter's own Proceedings/Court Notes). |
| **5. How do repeated Court Notes affect Matter Health?** | Automatically and correctly, with no extra bookkeeping: because Matter Health is always computed live (not cached/persisted), the next Court Note save simply changes what the next read of Matter Health returns. There is no "recompute" step to forget to run. |
| **6. How must duplicate tasks be prevented?** | `MatterTask.court_note_id` is `NOT NULL UNIQUE`. A task is created exactly once, atomically, in the same transaction as the Court Note it derives from (extending the existing CTE in `POST /api/cases/[id]/court-notes`, exactly like the existing conditional `MatterEvent` insert), only when `next_actions` is non-empty and the Proceeding is matter-linked. The unique constraint makes a second insert attempt for the same Court Note fail at the database level rather than silently duplicate; since a Court Note is itself write-once (append-only), there is exactly one opportunity to ever attempt this insert. |
| **7. How should stale or superseded next actions be represented?** | They are not auto-resolved. A later Court Note's own `next_actions` produces its own, separate `MatterTask` row (linked to its own Court Note) — it never edits or completes an earlier task. An advocate marks a task `COMPLETED` or `DISMISSED` explicitly (`PATCH`); the system never infers completion from the mere existence of a newer Court Note, consistent with "the advocate remains in control" (Product Direction; UX Blueprint §22a). |
| **8. Is any schema change genuinely necessary?** | Yes, exactly one additive table: `MatterTask`. Nothing else — no change to `CourtNote`, `MatterEvent`, `Matter`, or `LegalCase`. |

**Existing conventions reused, not reinvented** (per the audit of RLS/grants/delete-restrictions/test fixtures): `tenant_id` + `FORCE ROW LEVEL SECURITY` + `tenant_isolation_policy` on every new table; `requireSession`/`isTrustedOrigin`/RLS-scoped ownership re-verification on every mutating route; the `WITH ... RETURNING` atomic-CTE style already used by `POST /api/cases/[id]/court-notes`; the existing linked-records 409 pattern used by `DELETE /api/matters/[id]` and `DELETE /api/cases/[id]`; the per-test unique-tenant-UUID discipline established after the shared-`d1`/`d2` race was found and recorded (`docs/PENDING_INTEGRATION_REGISTER.md`).

## 2. Exact Approved Scope

1. Matter-level Court Note aggregation (read-only, query-based).
2. Structured pending actions derived from Court Notes (`MatterTask` — the new table).
3. Matter Health summary (derived, read-only).
4. Matter chronology review — conclusion: no change needed; `MatterEvent` already correct (see §1, Q2).
5. Read-only display of all of the above on the Matter screen (`/matters/[id]`).
6. The backend, database, security, and test support all of the above requires.

Nothing else. No Prepare Document, no Search, no reminders/notifications engine, no navigation changes, no changes to `/cases/[id]`'s own Court Note screen beyond what's noted in §9 (Explicit Exclusions).

## 3. Proposed Data Model

Additive only, in `db/schema.sql`, immediately after `CourtNote`:

```sql
-- MatterTask — Hearing-Driven Matter Record Building (Product Direction,
-- Milestone 2). Structured, correctable pending actions derived from a
-- Court Note's next_actions. Unlike CourtNote, this table is NOT
-- append-only — its whole purpose is to be marked done — but it never
-- stores Court Note content itself (no copied text column): status/
-- lifecycle only, joined to CourtNote for display, so the action text
-- can never drift from the immutable record it was derived from.
CREATE TABLE IF NOT EXISTS "MatterTask" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "matter_id" UUID NOT NULL REFERENCES "Matter"("id") ON DELETE CASCADE,
    "case_id" UUID NOT NULL REFERENCES "LegalCase"("id"),
    "court_note_id" UUID NOT NULL UNIQUE REFERENCES "CourtNote"("id"),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMPTZ,
    "completed_by" UUID REFERENCES "User"("id"),
    "created_at" TIMESTAMPTZ DEFAULT now(),
    "updated_at" TIMESTAMPTZ DEFAULT now()
);
-- + CHECK ("status" IN ('PENDING', 'COMPLETED', 'DISMISSED'))
-- + FORCE ROW LEVEL SECURITY + tenant_isolation_policy, same as every table
-- + indexes: (matter_id, status), (tenant_id, created_at)
```

Design notes:
- **No `action_text` column.** The task's display text is always `CourtNote.next_actions`, read via the `court_note_id` join — this is the literal, deliberate reading of "do not copy Court Note content into another source-of-truth table," extended from aggregation (§1 of the approved scope) to this entity too. A `MatterTask` row's own persisted state is purely lifecycle metadata.
- **`matter_id` is `ON DELETE CASCADE`**, matching `MatterEvent.matter_id`'s existing precedent exactly — a task is scoped state belonging entirely to its Matter, not an independent audit trail, so `DELETE /api/matters/[id]`'s existing linked-records check needs one more count (see §5) rather than a new cascade concern.
- **`court_note_id` is `RESTRICT`** (no `ON DELETE` clause), matching `CourtNote.case_id`'s own precedent — a task's provenance must never point at a vanished source. In practice this is unreachable today (`CourtNote` has no `DELETE` grant at all), but it is the correct, defensive default.
- **`case_id` is denormalized** from `CourtNote.case_id` at insert time, same rationale as `CourtNote.matter_id` itself — lets the task list show "which Proceeding" without a second join.
- **No schema change to `CourtNote`, `MatterEvent`, `Matter`, or `LegalCase`.**

## 4. Derived-State Rules (Matter Health)

Computed live, on every read, never persisted:

- **Current stage:** `stage` from the Matter's most recently created `CourtNote` (across all its Proceedings, ordered by `hearing_date DESC, created_at DESC`) — `NULL` if the Matter has no Court Notes yet (a pre-litigation/advisory Matter, or one whose Proceedings haven't had a hearing recorded).
- **Next hearing date:** `MIN(LegalCase.hearing_date)` across every Proceeding linked to the Matter where `hearing_date IS NOT NULL` — reusing the field Milestone 1 already keeps in sync on every Court Note save, not re-deriving it from `CourtNote` directly.
- **Last activity:** the same most-recent `CourtNote` row used for "current stage" — its `hearing_date`, `court_forum_display`, `note`, and originating Proceeding title, so "what happened last" and "current stage" are always describing the same event, never two different queries that could disagree.
- **Pending action count:** `COUNT(*) FROM "MatterTask" WHERE matter_id = $1 AND status = 'PENDING'`.
- **Needs-attention flag:** `true` if the Matter has at least one linked Proceeding whose `status` is not `DISPOSED`/`APPEAL`-concluded and whose `hearing_date IS NULL` (an open Proceeding with no scheduled next step). This is stated explicitly as a first-cut heuristic, not a final rule — it is the simplest true statement of "this Matter has active litigation with nothing on the calendar," and is easy to widen later (e.g., also flagging old pending tasks) without a schema change, since it is computed, not stored.

## 5. API Changes

All new/changed routes follow the existing `requireSession` → `isTrustedOrigin` (mutations only) → RLS-scoped ownership re-verification → `DatabaseClient.execute(tenantId, …)` shape.

- **`GET /api/matters/[id]/court-notes`** (new) — `SELECT` joining `CourtNote` to `LegalCase` (for the originating Proceeding's title/case number) `WHERE CourtNote.matter_id = $1`, newest first. Read-only.
- **`GET /api/matters/[id]/tasks`** (new) — `SELECT` joining `MatterTask` to `CourtNote` (for `next_actions`, `hearing_date`, `court_forum_display`) and `LegalCase` (for the originating Proceeding's title) `WHERE MatterTask.matter_id = $1`, `PENDING` first then newest. Read-only.
- **`PATCH /api/matters/[id]/tasks/[taskId]`** (new) — body `{ status: 'PENDING' | 'COMPLETED' | 'DISMISSED' }`. Sets `completed_at`/`completed_by` when transitioning to `COMPLETED`, clears both otherwise. RLS-scoped ownership re-verification on `taskId` before update (same FK-bypasses-RLS defense used everywhere else). The only mutating endpoint in this milestone.
- **`GET /api/matters/[id]/health`** (new) — the derived-state rules in §4, as one small JSON object (`{ stage, next_hearing_date, last_activity: {...} | null, pending_action_count, needs_attention }`). Kept as its own endpoint rather than folded into the existing `GET /api/matters/[id]` response, so the well-established, already-tested `MatterRow` shape is not touched and existing tests/consumers of that endpoint are unaffected.
- **`POST /api/cases/[id]/court-notes`** (changed) — the existing atomic CTE gains one more conditional insert, `inserted_task`, mirroring `inserted_event` exactly: `INSERT INTO "MatterTask" (...) SELECT ... FROM target_case WHERE target_case.matter_id IS NOT NULL AND` the trimmed `next_actions` is non-empty, `ON CONFLICT (court_note_id) DO NOTHING` as defense-in-depth (the `UNIQUE` constraint already prevents a real duplicate; the clause only guards against this single statement being retried at the transport layer). No change to the route's request/response shape.
- **`DELETE /api/matters/[id]`** (changed) — its existing linked-records check gains one more `COUNT(*) FROM "MatterTask" WHERE matter_id = $1`. Given `MatterTask.matter_id` is `ON DELETE CASCADE` (§3), this is not required for correctness (the delete would simply cascade), but is added anyway for the same reason `MatterEvent`/`MatterParticipant` are already checked explicitly despite also being `CASCADE`: a Matter with real, unresolved pending work should not disappear silently without the advocate seeing what's still open, matching the existing `MATTER_HAS_LINKED_RECORDS` 409 pattern and its `linked: {...}` breakdown, extended with a `tasks` count.

## 6. UI Changes

All on the existing `/matters/[id]` page (`apps/web/src/app/matters/[id]/page.tsx`), extending its current hierarchy (Title → Overview → Proceedings → Chronology → Team) rather than replacing it, per the approved UX Blueprint §10:

1. **Matter Health** — a new card at the top of the main column, directly under the Title card: current stage, next hearing date, last activity (one line), pending action count, and a visible "Needs Attention" badge when the flag is true. Read-only.
2. **Court Note History** — a new card (Matter-wide aggregation), placed adjacent to the existing Chronology card per the Blueprint's "kept adjacent since they're both chronological" recommendation — each entry showing its originating Proceeding title, hearing date, court/forum, stage, note, and next actions (mirroring the card already built on `/cases/[id]`, reused as the same visual pattern, not reinvented).
3. **Pending Actions** — a new card listing `MatterTask` rows (text from the joined Court Note), each with a "Mark done" / "Dismiss" control (`PATCH`). Completed/dismissed items are visually de-emphasized, not hidden, so the advocate can see what was resolved.
4. **Chronology** — unchanged, per §1's audit conclusion.

No changes to `/cases/[id]/court-note` (the Court Note entry screen itself) and no changes to `/cases/[id]` (the Proceeding-level Court Note history built in Milestone 1) beyond what already exists.

## 7. Security Model

- `MatterTask`: `tenant_id` + `FORCE ROW LEVEL SECURITY` + `tenant_isolation_policy`, identical to every existing table.
- Every new `GET` re-verifies the Matter belongs to the caller's tenant via the existing RLS-scoped pattern before returning any joined data (a cross-tenant `matter_id` returns 404, never a permission-denied leak, matching the codebase's established convention).
- `PATCH /api/matters/[id]/tasks/[taskId]` re-verifies both the Matter and the specific task belong to the caller's tenant (FK-bypasses-RLS defense) before updating.
- No entitlement/credit gating — reading or updating your own Matter's derived state is core, free usage, same reasoning already applied to Court Note in Milestone 1.

## 8. Audit Model

- `CourtNote` itself is untouched — still append-only, still the sole permanent record of what happened.
- `MatterTask` is deliberately **not** append-only (it must be markable done) but carries no legally significant content of its own (no text column, §3) — completing or dismissing a task can never rewrite history, only change a checklist's state. `completed_at`/`completed_by` provide a lightweight, sufficient trail of who resolved it and when; a full `UPDATE`-history ledger is not proposed, since nothing legally consequential is being recorded here (the actual instruction's text and its provenance remain fixed and readable from `CourtNote` forever, regardless of the task's status).

## 9. Duplicate-Prevention Rules

Covered fully in §1 (Q6) and §5: `court_note_id UNIQUE` + one conditional insert per Court Note save, transactional, `ON CONFLICT DO NOTHING` as pure defense-in-depth. No polling job, no reconciliation step, and no possibility of two `MatterTask` rows ever describing the same Court Note.

## 10. Migration Strategy

Additive only (`CREATE TABLE IF NOT EXISTS`, new indexes, new RLS policy/grant) — no existing table altered. One deliberate backfill: a one-time `INSERT INTO "MatterTask" (...) SELECT ... FROM "CourtNote" WHERE next_actions IS NOT NULL AND next_actions <> '' AND matter_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "MatterTask" WHERE court_note_id = "CourtNote".id)`, idempotent and safe to re-run, so the small number of real Court Notes already saved since Milestone 1 merged get their pending actions surfaced too, matching the precedent set by prior backfills (e.g., `DocumentEnvelope`'s `INDEXED` backfill in PR 3B-1).

## 11. Test Strategy

Mirrors Milestone 1's established conventions exactly:
- Fresh, genuinely-unique tenant/user UUIDs per test file (`crypto.randomUUID()`), never the shared `d1`/`d2` pattern recorded as technical debt.
- `GET /api/matters/[id]/court-notes`: cross-Proceeding aggregation correctness, ordering, tenant isolation (RLS), 404 for cross-tenant/nonexistent Matter.
- `GET /api/matters/[id]/tasks` and `PATCH .../tasks/[taskId]`: creation-on-save (via the extended Court Note route), status transitions, `completed_at`/`completed_by` set/cleared correctly, tenant isolation, cross-tenant 404, duplicate-prevention (two Court Notes on the same Proceeding never collapse into one task; a retried insert attempt is rejected/no-opped, not duplicated).
- `GET /api/matters/[id]/health`: correct derivation across zero/one/many Proceedings and Court Notes, `needs_attention` true/false cases, empty-state (no Court Notes yet) returns nulls, not an error.
- `DELETE /api/matters/[id]`: new 409 case when `MatterTask` rows exist, using the same dedicated-tenant pattern already adopted for the Court-Note-linked case-delete test (never the shared tenant ids).
- Full existing 484-test suite re-run for zero regressions, `pnpm typecheck`, `pnpm build`.

## 12. Runtime Verification Plan

Real local PostgreSQL 16 + pgvector, migrated and role-provisioned identically to CI (established pattern). A Playwright browser pass (mobile viewport): seed a Matter with two linked Proceedings, record two Court Notes (one per Proceeding, at least one with `next_actions`), open `/matters/[id]`, and confirm Matter Health, the aggregated Court Note History (both Proceedings represented, correctly attributed), and the Pending Actions card (including marking one task done) all render and behave correctly.

## 13. Rollback Approach

Purely additive migration and two small, non-breaking extensions to existing endpoints (`POST /api/cases/[id]/court-notes` gains one more conditional insert; `DELETE /api/matters/[id]` gains one more check) — no existing response shape changes. Reverting the commit is sufficient; no backfill needs undoing (the backfilled rows are simply additive `MatterTask` rows, harmless if left in place, but disappear naturally with the table if ever dropped).

## 14. Explicit Exclusions

No changes to `/cases/[id]/court-note` (Court Note entry) or `/cases/[id]` (Proceeding-level history) beyond what Milestone 1 already built. No Task creation UI independent of Court Notes (a task is only ever created as a Court Note's derived side effect — there is no "add a task" button). No reminders, scheduling, or notifications (Milestone 3). No AI-generated recommendations. No changes to `CourtNote`'s append-only design or its columns. No navigation/IA changes (separate, Product-Owner-sequenced initiative per the UX Blueprint). No Prepare Document, Universal Search, Typist Collaboration, or commercial/entitlement UI.

## 15. Risks

- **Aggregation query cost** grows with a Matter's total Court Note count across all its Proceedings; at today's real usage volume this is trivial (bounded, indexed on `matter_id`), and materialization was explicitly not chosen without performance evidence, per the approved scope.
- **The `needs_attention` heuristic (§4) is a first-cut rule**, not a final specification — it may need widening (e.g., stale pending tasks) once real usage is observed; because it is computed and not persisted, changing it later requires no migration.
- **`MatterTask`'s no-text design (§3)** requires every reader to join `CourtNote` for display text — a small, deliberate cost in exchange for an absolute guarantee against content duplication/drift; flagged so it is a known, intentional tradeoff, not an oversight.

## 16. Acceptance Criteria

1. Opening a Matter shows, without navigating anywhere else: current stage, next hearing date, what happened last, pending action count, and whether the Matter needs attention.
2. Every Court Note across every Proceeding linked to a Matter appears in that Matter's aggregated history, correctly attributed to its originating Proceeding, with no content duplicated into a new source-of-truth table.
3. A Court Note with `next_actions` produces exactly one `MatterTask`; a Court Note with none produces zero; two Court Notes never produce one shared task, and one Court Note never produces two.
4. Marking a task done/dismissed never alters the originating Court Note.
5. All new endpoints enforce tenant isolation identically to existing ones (cross-tenant access returns 404, never a leak).
6. Full test suite, typecheck, and build pass with zero regressions; a real browser run confirms the Matter screen renders and behaves correctly end-to-end.
