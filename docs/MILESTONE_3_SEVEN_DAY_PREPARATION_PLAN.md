# MILESTONE 3 — SEVEN-DAY CASE PREPARATION WORKFLOW — PLAN

**Status: Approved by the Product Owner (Open Decisions 1–4 resolved) and implemented, tested, and verified.** See the implementation report for commit/PR details, test results, and browser verification.

---

## 1. Read-Only Audit — Existing-State Findings

**Governing source text.**
- `docs/PRODUCT_DIRECTION.md`, "CASE PREPARATION CYCLE" (lines 148–161): *"Seven days before hearing, automatically prepare the advocate (NOT merely remind), showing: Hearing Date, Previous Court Note, Current Stage, Pending Documents, Pending Tasks, Preparation Checklist, AI Recommendations, Open Draft Documents."*
- `docs/PRODUCT_DIRECTION_IMPLEMENTATION_PLAN.md`, Milestone 3 (lines 200–207): objective is a proactive preparation view, not just a reminder; scope is a scheduled job (reusing `Notification` delivery, adding the scheduling trigger) plus a preparation view page; exclusions state no AI recommendations "unless a reviewed, provider-backed workflow exists — a plain checklist ships first"; data model calls for "a dedup/idempotency marker per (Proceeding, hearing_date) to avoid duplicate reminders on hearing-date changes"; dependencies are Milestones 1 and 2 — **both now shipped and merged.**
- `docs/ADVOCATE_OS_UX_BLUEPRINT.md` §11 (Seven-Day Preparation Experience): recommends "a single preparation card per upcoming hearing (surfaced on Home when within 7 days, and as a Matter-level view)"; confirms all fields already exist except "a scheduling/notification trigger, which is the actual new work Milestone 3 must build"; reiterates no AI recommendation claims until a reviewed, provider-backed workflow exists.
- Blueprint §22 sequencing lists Milestone 3 as depending on Milestone 2 (done). It also lists "Home screen" as its own, separate, not-yet-built sequencing item (§22 item 2) — the current Home page has **not** been rebuilt to the Blueprint's recommended IA. Every UI directive so far for Milestones 1–2 has explicitly forbidden touching Home ("Do NOT modify Home"). I am treating Home as out of scope for this milestone unless explicitly authorized (**Open Decision 1**, below) — the preparation card would otherwise be surfaced on a page that doesn't yet exist in its planned form.

**Current repo state, verified by direct inspection (not assumed):**

| Building block | State |
|---|---|
| `Notification` table | Real schema (`id, tenant_id, user_id, type, title, message, read_at, created_at`), RLS-protected. `GET /api/notifications` and `PATCH /api/notifications/[id]` are real and wired to the UI bell. **Confirmed by repo-wide search: nothing anywhere currently writes a row into this table.** It is a fully real read/mark-read surface with zero producers today. Milestone 3 would be the first feature ever to insert into it. |
| Scheduling/cron infrastructure | **None exists anywhere in the repo.** No `vercel.json`, no GitHub Actions `on: schedule` workflow, no queue backend (Redis/BullMQ). `apps/workers/src/index.ts` is an unrelated, non-deployed simulation of an OCR ingestion pipeline (in-memory `EventEmitter`, a `ts-node` dev-only script with no Dockerfile/Procfile/CI wiring) — it is never invoked automatically today. Milestone 3 is the first feature requiring a real recurring trigger. |
| Deployment target | Vercel (confirmed via the "Vercel Preview Comments" / Vercel deployment CI checks on every PR). Vercel's native, additive way to run something on a schedule is a **Vercel Cron Job** (`vercel.json` `crons` array invoking a Next.js API route) — no new hosting dependency, no new queue, consistent with this codebase's "reuse existing infrastructure" pattern. |
| `LegalCase.hearing_date` | TEXT, `YYYY-MM-DD` (Milestone-1-era precedent, deliberately not `DATE`) — usable directly for 7-day windowing without a timezone-conversion footgun. |
| `CourtNote` (Milestone 1) | Gives "Previous Court Note", `stage`, `court_forum_display`, `next_actions` per Proceeding — already correctly aggregable by `case_id`/`matter_id`. |
| `MatterTask` (Milestone 2) | Gives "Pending Tasks"/checklist base — `PENDING`/`COMPLETED`/`DISMISSED`, already traceable to its source Court Note. |
| `DocumentEnvelope` / `DocumentVersion` | `case_id` and `matter_id` are both nullable FKs — documents can already be listed per Proceeding/Matter. **No "draft vs. final" status column exists on `DocumentEnvelope` itself** — flagged as **Open Decision 2** below (what "Pending Documents"/"Open Draft Documents" concretely means with the data that actually exists). |
| `MatterParticipant` | Keyed on `matter_id` + `user_id`. A Proceeding (`LegalCase`) with no `matter_id` has no participant list — flagged as **Open Decision 3** (who receives the notification). |
| `executeSystem()` (`lib/db/db-client.ts`) | Explicitly documented as "only safe against tables without RLS enabled" (`Tenant`, `User`). Every table Milestone 3 needs to read/write (`LegalCase`, `CourtNote`, `MatterTask`, `Notification`) has `FORCE ROW LEVEL SECURITY`. **A cron job cannot bulk-query across tenants against these tables via `executeSystem`** — doing so would either fail or require weakening RLS, which is explicitly out of scope. The correct, security-model-preserving approach is: fetch the tenant id list via `executeSystem` against `"Tenant"` only (no RLS table touched), then loop and run the normal `db.execute(tenantId, ...)` tenant-scoped path once per tenant — identical to every existing endpoint's security model, just iterated. This is a new *pattern* (the first tenant-iterating job in the codebase) but introduces no new *security primitive*. Flagged as a risk (§15) for the case where the tenant count grows large, not as a security concern. |

**AI Recommendations:** explicitly excluded from this milestone by both governing docs. Milestone 3 will ship a plain, data-derived checklist only — no AI-generated content, matching Milestone 1's "advocate remains in control" precedent and §22a of the Blueprint.

---

## 2. Proposed Scope (pending confirmation)

1. A tenant-scoped **scheduled trigger** (Vercel Cron → one protected API route) that, once daily, finds every Proceeding whose `hearing_date` falls within the next 7 days and has not yet been notified for that exact `hearing_date`, and writes exactly one `Notification` row per qualifying Proceeding.
2. A read-only **Preparation View** — one new API endpoint plus one new Matter-page UI section — assembling, per qualifying Proceeding: Hearing Date, Court/Forum, Current Stage, Last Court Note, Pending Actions (open `MatterTask` rows), and linked Documents. No AI Recommendations.
3. A **duplicate-prevention/idempotency** table so the same Proceeding + hearing_date combination is never notified twice, and a hearing-date change (adjournment) correctly produces a fresh reminder for the new date rather than being suppressed — matching the Implementation Plan's explicit requirement.
4. **UI placement:** Matter-level only for this pass — a new, conditionally-rendered panel on the existing Matter page, shown only when that Matter has a Proceeding with a hearing in the next 7 days (see §8 wireframe). **Not** on Home (Open Decision 1).

---

## 3. Explicit Exclusions

- No Home page changes — Home's rebuild is its own, separate, not-yet-approved Blueprint item.
- No AI Recommendations of any kind.
- No email/SMS/push delivery — in-app `Notification` row only, matching the Implementation Plan's "reuse Notification delivery."
- No navigation unification, no Navbar changes, no login-flow changes.
- No changes to Court Note, Matter Task, or any Milestone 1/2 Matter-page section beyond adding one new, conditionally-rendered section.
- No Prepare Document, Universal Search, or Typist Collaboration work (Milestones 4–6 remain not started).
- No new job-queue/worker infrastructure (no Redis-backed queue, no BullMQ) — a single daily cron-triggered HTTP endpoint only.
- No change to RLS, tenant isolation, or `executeSystem`'s documented contract — the cron job reads the tenant list only from the one RLS-free table (`Tenant`) and does everything else through the existing tenant-scoped `execute()` path.

---

## 4. Open Decisions Requiring Product Owner Confirmation

**Open Decision 1 — Where does the preparation card live?**
Recommendation: Matter-level only, for now. The Blueprint's "surfaced on Home" recommendation presumes a Home rebuild that hasn't been approved or built. Adding it to today's legacy Home would be a Home change, which every prior directive has forbidden. Once Home is rebuilt under its own approved milestone, surfacing the same data there becomes a small additive follow-up, not a redo.

**Open Decision 2 — What do "Pending Documents" / "Open Draft Documents" mean concretely?**
`DocumentEnvelope` has no draft/final status column today. Recommendation: for this milestone, "documents" in the preparation view means simply *every `DocumentEnvelope` linked to this Proceeding or its Matter* (a plain list, no draft/final distinction claimed) — accurate to what the data actually supports, rather than inventing a status field as a side effect of this milestone. A real draft/final distinction would be Milestone 4 (Prepare Document) territory, where documents first get an authoring lifecycle.

**Open Decision 3 — Who receives the notification?**
A Proceeding only reliably has an author on its most recent `CourtNote` (`author_user_id`) and, if linked to a Matter, that Matter's `MatterParticipant` list. Recommendation: notify every `MatterParticipant` of the linked Matter if one exists; if the Proceeding has no Matter yet, fall back to the most recent `CourtNote.author_user_id` (mirrors Milestone 1/2's own established fallback style for matter-less Proceedings). If neither exists (no Court Note has ever been logged and no Matter is linked), skip notifying and only surface it in the Preparation View when someone visits the case page directly — never silently fail.

**Open Decision 4 — Vercel Cron availability.**
Vercel Cron Jobs are plan/tier-gated (frequency and count limits vary). I cannot see the account's current Vercel plan from inside the repo — confirming a daily cron is actually available on the deployed plan is a five-minute check outside my visibility, flagged rather than assumed.

---

## 5. Proposed Data Model

```sql
CREATE TABLE IF NOT EXISTS "MatterPreparationReminder" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "case_id" UUID NOT NULL REFERENCES "LegalCase"("id") ON DELETE CASCADE,
    "hearing_date" TEXT NOT NULL,
    "notification_id" UUID NOT NULL REFERENCES "Notification"("id"),
    "created_at" TIMESTAMPTZ DEFAULT now(),
    UNIQUE ("case_id", "hearing_date")
);
```
- RLS + `FORCE ROW LEVEL SECURITY` + tenant isolation policy, same pattern as every prior table.
- Append-only (`REVOKE UPDATE, DELETE ... FROM nextcase_app`), same pattern as `CourtNote`/`AiUsageEvent` — a reminder record shouldn't be editable after the fact, only ever inserted once per (case, hearing_date).
- No changes to `Notification`, `MatterTask`, `CourtNote`, `LegalCase`, or `DocumentEnvelope` — all already have what this milestone needs.

---

## 6. Derived "Within 7 Days" Rule

A Proceeding qualifies when `hearing_date` is between today and today+7 inclusive (plain string/date comparison on the existing `YYYY-MM-DD` text, same as the rest of the codebase already does), **and** no `MatterPreparationReminder` row exists yet for `(case_id, hearing_date)`.

This makes the job safe to run as often as needed (daily, or even re-triggered manually) without duplicate notifications, and self-healing if a run is ever missed — it still fires on the next run as long as the hearing remains inside the window. `hearing_date` is a plain date string with no timezone component (matching its existing, deliberate design); "today" is computed once per run in UTC calendar-date terms, consistent with the fact that no per-tenant timezone support exists anywhere else in the codebase today — Milestone 3 does not introduce one.

---

## 7. API Changes

- **NEW** `POST /api/cron/seven-day-preparation` — internal-only. Authenticated via a shared-secret header checked against `process.env.CRON_SECRET`, **not** `requireSession` (no advocate is logged in when Vercel's scheduler calls it). Fetches the tenant id list via `executeSystem` against `"Tenant"` (the one RLS-free table), then for each tenant runs the qualifying-Proceedings query and inserts `Notification` + `MatterPreparationReminder` rows through the normal tenant-scoped `db.execute(tenantId, ...)` path — identical security posture to every existing write, just iterated per tenant. Returns only an aggregate count in its response, never per-tenant data.
- **NEW** `GET /api/matters/[id]/preparation` — tenant-scoped exactly like every Milestone 2 endpoint (`requireSession` + `db.execute(tenantId, ...)`). Returns the Preparation View payload (qualifying Proceedings for that Matter, each with last Court Note / pending actions / linked documents), or an empty array if nothing is due.
- **NEW** `vercel.json` at repo root, adding a `crons` entry invoking the new cron route once daily.

---

## 8. Proposed UI Placement (Wireframe) — For Approval Before Any Code

Building on the Milestone 2 hierarchy (`Matter Header → Matter Health → Recent Court Note → Pending Actions → Matter Overview → Proceedings → Matter Timeline → Documents → Participants`), one new section is proposed, **conditionally rendered — entirely absent when no Proceeding on this Matter has a hearing in the next 7 days** (so a Matter with no imminent hearing looks exactly as it does today; no added clutter):

```
┌─────────────────────────────────────────────┐
│ MATTER HEADER                                │   (unchanged)
│  [NEEDS ATTENTION]  Stage · Next Hearing      │
├─────────────────────────────────────────────┤
│ ⏰ PREPARE FOR HEARING           (NEW)        │   <- only when within 7 days
│  Hearing: 24 Jul 2026 · Delhi High Court      │
│  Stage: Arguments                             │
│  Last Court Note: "Adjourned for evidence..." │
│  Pending Actions (2):                         │
│    ☐ File rejoinder                           │
│    ☐ Collect medical records                  │
│  Documents (3): [Affidavit] [Notice] [Plaint]  │
├─────────────────────────────────────────────┤
│ MATTER HEALTH                                 │   (unchanged)
├─────────────────────────────────────────────┤
│ RECENT COURT NOTE                             │   (unchanged)
├─────────────────────────────────────────────┤
│ PENDING ACTIONS                               │   (unchanged)
├─────────────────────────────────────────────┤
│ MATTER OVERVIEW                               │   (unchanged)
├─────────────────────────────────────────────┤
│ PROCEEDINGS                                   │   (unchanged)
├─────────────────────────────────────────────┤
│ MATTER TIMELINE                               │   (unchanged)
├─────────────────────────────────────────────┤
│ DOCUMENTS / PARTICIPANTS                      │   (unchanged)
└─────────────────────────────────────────────┘
```

Placement rationale: it is placed immediately after Matter Header and before Matter Health because it is the single most time-urgent, actionable piece of information on the page when it applies — the "Workflow information must always appear before administrative information" rule the Product Owner set for Milestone 2 applies with even more force here (an imminent hearing outranks the Matter's general health snapshot). It deliberately repeats data already visible further down the page (Pending Actions, Last Court Note, Documents) rather than introducing a new source of truth — the same "surface, don't duplicate storage" principle used throughout Milestones 1–2 — because that repetition is the entire point of a preparation view: one place that answers "what do I need before this hearing" without scrolling.

No change to Case page, Court Note page, Home, Navbar, or navigation. Mobile layout: single column, same card styling as the existing Matter Health card; desktop: same single-column stack (Matter page today is single-column at all viewport widths, per Milestone 2's implementation).

---

## 9. Security Model

- Cron endpoint: shared-secret header only, never reachable with a user session token, never exposed to the browser. Every actual data read/write inside it still goes through the normal tenant-scoped `execute(tenantId, ...)` path per tenant — no blanket cross-tenant query against any RLS-protected table.
- Preparation-view GET endpoint: identical pattern to every existing Matter sub-resource endpoint — `requireSession`, tenant-scoped `db.execute`.
- No new write path reachable by an end-user; the only mutating endpoint requires the server-only secret.

---

## 10. Duplicate-Prevention / Idempotency

`UNIQUE (case_id, hearing_date)` + `ON CONFLICT DO NOTHING` in the insert, exactly like Milestone 2's `MatterTask` `ON CONFLICT (court_note_id) DO NOTHING` pattern — safe to invoke the cron route as many times as needed without duplicate notifications. A rescheduled hearing (`hearing_date` changed) is a new dedup key and correctly produces a new reminder — read literally, that is what the Implementation Plan's "avoid duplicate reminders on hearing-date changes" requires (suppress same-date repeats, not genuine date changes).

---

## 11. Migration Strategy

Additive-only: one new table (`MatterPreparationReminder`), no `ALTER` on any existing table. Same idempotent `CREATE TABLE IF NOT EXISTS` + RLS + `FORCE ROW LEVEL SECURITY` + policy + index + `REVOKE` pattern already used for `CourtNote`/`MatterTask`.

---

## 12. Test Strategy

- Cron endpoint: secret required and rejected without it; creates `Notification` + `MatterPreparationReminder` rows for qualifying Proceedings; idempotent on repeat invocation; correct behavior across multiple tenants (no cross-tenant leakage); correct behavior on a rescheduled hearing date.
- Preparation-view GET endpoint: RLS isolation (a second tenant's data never appears), correct 7-day windowing (boundary cases: today, today+7, today+8 excluded, yesterday excluded), empty array when nothing is due.
- Fresh `crypto.randomUUID()` tenant/user ids per test file, per established convention — never the shared `d1`/`d2` pattern.

---

## 13. Runtime Verification Plan

- Local: seed a `LegalCase` with `hearing_date` = today+7, invoke the cron route with the secret, confirm exactly one `Notification` row appears via `GET /api/notifications` and one `MatterPreparationReminder` row is written; invoke a second time, confirm no duplicate row.
- Playwright: open the Matter page for that Proceeding at a 390×844 mobile viewport, confirm the new "Prepare for Hearing" panel renders with the expected fields and that it is entirely absent on a Matter with no imminent hearing.

---

## 14. Rollback Approach

Same as Milestones 1–2: additive-only schema (one new table), so rollback is dropping the new table/route/UI section — no destructive change to any existing table or behavior to undo.

---

## 15. Risks

- **First scheduling subsystem in the codebase** — already flagged Medium risk by the Implementation Plan. Mitigated by the "within window, not yet reminded" rule (self-healing if a run is missed) rather than an exact-day match.
- **Per-tenant loop inside the cron job does not scale indefinitely** — correct and RLS-safe today, but at a large tenant count this is an N-query loop, not a single set-based query. Acceptable at current scale; flagged so it isn't silently assumed to scale forever.
- **Vercel Cron plan/tier availability** — Open Decision 4, outside my visibility.
- **Notification fan-out ambiguity** — Open Decision 3; affects both correctness (who gets notified) and blast radius (how many rows get written per hearing).

---

## 16. Acceptance Criteria

This plan is ready for implementation once the Product Owner confirms:
1. Open Decisions 1–4 above (or overrides them with different direction).
2. The §8 wireframe and its placement (immediately after Matter Header, before Matter Health) as the approved UI placement.
3. The scope in §2–3 as the complete, correct first-cut scope for Milestone 3 — no additions before it ships once.
4. No implementation begins until this sign-off happens, consistent with Milestones 1 and 2's own review process.
