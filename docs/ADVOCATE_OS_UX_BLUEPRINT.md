# NEXTCASEHQ — ADVOCATE OS UX BLUEPRINT
**TO:** Founder, Product Owner, Engineering
**FROM:** Chief Product Engineer
**STATUS:** Draft for review — read-only architecture exercise. No code changed. Milestone 2 implementation blocked on approval of this document.
**SCOPE:** Translates the approved Product Direction (`docs/PRODUCT_DIRECTION.md`) and Implementation Plan (`docs/PRODUCT_DIRECTION_IMPLEMENTATION_PLAN.md`) into a single, stable UX architecture, grounded in the actual current repository — not a theoretical redesign.

---

## How this document was produced

Every claim about "what exists today" below was verified directly against the repository, not assumed. Specifically inspected: `apps/web/src/app/layout.tsx`, `components/Navbar.tsx`, `components/NavbarWrapper.tsx`, `app/login/page.tsx`, `app/organization/page.tsx`, `app/dashboard/layout.tsx` and its sub-pages, `app/matters/page.tsx` and `app/matters/[id]/page.tsx`, `app/cases/page.tsx` and `app/cases/[id]/page.tsx` and `app/cases/[id]/court-note/page.tsx`, `app/search/page.tsx` and `app/dashboard/search/page.tsx`, `lib/ai/entitlement.ts`, `lib/ai/context/gateway.ts`, `lib/search/hybrid-search.ts`, `components/BrandBackground.tsx`/`EmptyState.tsx`/`Logo.tsx`, `db/schema.sql`, `docs/BUILD_LEDGER.json`, `docs/PENDING_INTEGRATION_REGISTER.md`, and `docs/UI_UX_SENTINEL_AUDIT_REPORT.md`.

No file named "Engineering Constitution" exists in the repository. `AGENTS.md` references "the approved Constitution, Master Blueprint, Product Lifecycle and Development Roadmap" as historical context from the Modules 1–20 build phase (now long complete); the closest living equivalent today is the accumulated set of conventions enforced in code and recorded in `docs/BUILD_LEDGER.json`/`docs/PENDING_INTEGRATION_REGISTER.md` — tenant RLS on every table, append-only audit tables by grant, `requireSession`+`isTrustedOrigin` on every mutation, additive-only migrations. This blueprint treats those conventions as the constitution and does not propose anything that conflicts with them.

**One important calibration**: `docs/UI_UX_SENTINEL_AUDIT_REPORT.md` (dated February 2026) describes an indigo/violet color system and a `TriPaneChamber`-centered workspace as the primary product surface. That is now stale. The brand has since moved to the gold/maroon/deep-forest-green/cream palette (`docs/BUILD_LEDGER.json`'s `brand_color_uniformity_and_landing_fixes` milestone), and the real, database-backed advocate workspace is now `/matters` and `/cases`, not `TriPaneChamber` (which survives only inside the legacy `/dashboard/ai-chamber` shell — see §21). This blueprint is grounded in the current state, not that report.

---

## 1. Executive UX Direction

NextCaseHQ's UX has one job: make the advocate's next 30 seconds of work obvious. Every screen answers one question a real advocate is asking at that moment in their day (see §3). The two entry points — **Record Court Note** and **Prepare Document** — are not menu items competing with a dozen others; they are the product's front door. Everything else (Matters, Search, Home) exists to help the advocate get back to one of those two actions faster, or to show them the state Court Notes and Documents have already built for them without re-entry.

The single biggest risk to this direction today is not a missing feature — it is that **the product currently has two competing "front doors"** (see §21.1): the real, brand-aligned `/matters`↔`/cases` surface this blueprint builds on, and a legacy `/dashboard/*` shell that authenticated users are still routed into by default. This blueprint's first and most urgent recommendation is to stop that drift before any further feature work compounds it.

## 2. Product Entry-Point Model

Unchanged from the approved direction: **Prepare Document** and **Record Court Note** are the two primary entry points. Everything else in the information architecture (§5) is in service of one of three things:
1. Getting to one of those two actions in the fewest possible steps.
2. Showing the advocate state those actions already built (Matter Health, Court Note history, hearing timeline).
3. Finding something (Search) — itself usually in service of #1 or #2.

No third primary entry point is introduced. "Matters" is not a competing entry point — it is where Court Notes and Documents accumulate into a Matter's record; an advocate lands there to *read* state, not to *start* work (starting work is always Prepare Document or Record Court Note, optionally pre-filled with a Matter already selected).

## 3. Full Advocate Daily Journey

| Time of day | Question the screen must answer | Primary surface |
|---|---|---|
| Morning | "What must I be ready for today?" | Home |
| During court | "What do I need for this hearing right now?" | Matter (Prepare view once Milestone 3 lands; today, Matter summary) |
| Immediately after a hearing | "What happened, and what must happen next?" | Court Note quick entry |
| Between sessions | "What useful work can I complete before the next session?" | Home / Prepare Document / Search |
| After court / office | "What must I finish today so I'm ready for tomorrow?" | Home ("Continue drafting", pending actions) |
| 7 days before a hearing | "What must I prepare before this hearing?" | Matter preparation view (Milestone 3, not built yet) |

This table is the acceptance test for every screen proposed below: if a screen doesn't help answer one of these six questions, it does not belong in the primary product.

## 4. First 60-Second Onboarding Flow

**Today's actual first-run flow** (verified): `POST /api/auth/session` → hard redirect to `/organization`, a fully mock tenant-picker (`mockTenants` hardcoded array, a `NEXTCASE_CURRENT_TENANT_ID_CONTEXT` cookie the real backend never reads) → 1-second fake "binding session" animation → `/dashboard`, the legacy shell. A first-time advocate's first 60 seconds today are spent picking a fake tenant from a hardcoded list and watching a skeleton loader, then landing in an ERP-style sidebar that has never heard of Court Note or Matters.

**Recommended first 60 seconds:**
1. **Second 0–5:** Login succeeds → land directly on **Home** (§7). No tenant picker (a session already carries exactly one real tenant; multi-tenant/firm-switching is a future, separate concern — see §16, Law Firm Partner persona — not a step every advocate sees on day one).
2. **Second 5–20:** Home shows exactly two large actions front and center — **Record Court Note** and **Prepare Document** — with one line of supporting copy each ("Log what just happened in court" / "Start a Memo, Affidavit, or Notice"). No empty-state dashboard widgets, no "0 Matters, 0 Documents" counters that make a new account look broken.
3. **Second 20–60:** The advocate taps either action once. If they tap Prepare Document, they see a practice-area/document-type picker (§9) — no Matter required yet. If they tap Record Court Note, they see the Court Note screen with a lightweight "which matter is this?" picker that also supports "skip for now, I'll link it later" (this one small addition to today's Court Note flow — see §8 — removes the only forced setup step: needing a Matter/Proceeding to exist before the very first Court Note can be recorded).

**Minimum information required before first useful action:** email + password (already required to authenticate) and nothing else. No firm name, no practice area selection, no client list, no billing details, no Matter creation. A Matter is created lazily — the first time an advocate actually needs one (attaching a Court Note or a Document to something), not as an onboarding gate.

## 5. Recommended Information Architecture

Reviewed the example structure in the request (Home, Prepare, Court Note, Matters, Search) against the current repository rather than accepting it automatically. Conclusion: it is *almost* correct, with one adjustment — **Court Note should not be a persistent top-level destination alongside Prepare**, because it is not a place an advocate browses; it is an action they fire from wherever they already are (see §6's mobile navigation recommendation for the reasoning). The primary IA is therefore:

**Persistent primary destinations (4, not 5):**
1. **Home** — today's hearings, matters needing attention, continue drafting, quick actions. Exists because every session should start by answering "what must I be ready for/finish today."
2. **Prepare** — the document-preparation entry point (practice-area grouped picker → draft). Exists because it's a primary, named product entry point per the approved direction, and needs to be reachable in one tap from anywhere, not buried inside a Matter.
3. **Matters** — the list of Matters, each opening into Matter Health (§10). Exists because "find my ongoing engagement and see its state" is a distinct, frequent task from either primary action.
4. **Search** — Universal Search entry (§12). Exists because the approved direction names it a primary navigation method, not a secondary feature — and because it is currently the single biggest built-but-unreachable piece of the product (real hybrid-search backend, zero working front-end — see §21.3).

**Contextual, not persistent:**
- **Record Court Note** is a floating/contextual action (see §6), not a fifth tab — reachable from Home, from a Matter, and from Search results, always pre-filled with whatever Matter/Proceeding context the advocate was already looking at.
- Document version history, Matter participants/team, account/settings, notifications — all one level deeper, inside the destination they belong to.

**What must not appear in primary navigation:** Features/Solutions/Pricing (marketing pages — currently mixed into the same `Navbar.tsx` menu array as Matters/Cases, see §21.2), a generic "Dashboard" link to the legacy shell, raw database-module names ("Evidence Register," "Compliance Audit," "Draft Builder" as currently labeled in `dashboard/layout.tsx`'s sidebar) that describe backend tables instead of advocate tasks.

**Desktop vs. mobile:** the same four destinations, same order, same meaning — a persistent left rail on desktop (≥1024px) with the same four items plus the Record Court Note contextual action always visible as a secondary button in the rail's header; a persistent bottom bar on mobile (§6). No desktop-only or mobile-only destination — the biggest source of "navigation drift" the product already exhibits (§21) is exactly this: today's mobile hamburger menu and desktop nav are identical copies of a marketing-page menu, while the real advocate surface (`/matters`, `/cases`) has no persistent chrome of its own at all.

**How this avoids duplication:** one Navbar, one meaning per destination, one Court Note entry mechanism (contextual, everywhere) instead of the current two unconnected "workspace" surfaces (`/matters`+`/cases` vs. `/dashboard/*`) each with their own, different navigation model.

## 6. Mobile Navigation — Final Recommendation

Evaluated three patterns for Court Note specifically, as requested:

| Pattern | Verdict |
|---|---|
| Permanent bottom-nav item (5th tab) | **Rejected.** Competes visually with Prepare/Matters/Search for the same reach zone every single screen, for an action only relevant a few times a day (right after a hearing) — violates "no competing primary actions" and wastes permanent screen real estate on an intermittent action. |
| Central floating action button (FAB) | **Recommended.** |
| Purely contextual (only inside a Matter/Case screen) | **Rejected as the only mechanism** — it would force the advocate to first find and open the right Matter *before* they can record what just happened, adding steps to the one flow that must complete in ~30 seconds. A FAB works everywhere immediately; the Matter/Case screen additionally exposes the same action inline (already built — the "Record Court Note" button on `/cases/[id]`) as a convenience once a Matter is already open. |

**Final recommendation:** a single, persistent, gold-accented circular FAB, centered on the bottom bar, reachable one-thumb from any screen in the product, that opens Court Note quick entry pre-filled with whatever Matter/Proceeding context is currently on screen (or the lightweight picker from §4 if none). The bottom bar itself carries three items either side of the FAB: **Home**, **Matters** | *(FAB)* | **Prepare**, **Search** — five visual elements total, but only four are "destinations"; the FAB is unambiguously the odd, distinct, elevated one, exactly the treatment Court Note deserves as the product's stated "heart."

```
┌───────────────────────────────┐
│                               │
│         (screen content)      │
│                               │
├───────┬───────┬───┬───────┬───┤
│  🏠   │  📁   │ ⊕ │  ✍️  │ 🔍 │
│ Home  │Matters│CN │Prepare│Sear│
└───────┴───────┴───┴───────┴───┘
```

Large touch targets (≥48px), labels always visible (not icon-only — advocates are not always young power-users; unexplained icons are explicitly excluded by the design principles), no animation beyond the FAB's existing subtle interaction feedback.

## 7. Home Experience

Not a dashboard. A short, single-column, mobile-first stack, each element justified against "does this support an immediate likely action":

1. **Today's hearings** (0–3 cards) — Matter title, court/forum, time, one-tap into that Matter. *Justification:* directly answers the Morning question (§3). Empty state: "No hearings scheduled for today" — not hidden, since its absence is itself useful information ("I'm free today").
2. **Record Court Note** and **Prepare Document** — the two primary actions, always visible, always the two largest tappable elements on the screen after the hearings list. *Justification:* they are the product's stated entry points; Home must not bury them below status widgets.
3. **Matters needing attention** (0–3 cards) — no next hearing date set, or a preparation item overdue (once Milestone 2/3 land — see §22). *Justification:* surfaces exactly what Matter Health (§10) is for, without requiring the advocate to open every Matter to find out.
4. **Continue drafting** (0–2 cards) — most recent in-progress document. *Justification:* answers the Between-Sessions and After-Court questions directly; resuming beats starting over.
5. **Recent activity** (collapsed by default, "View all") — last few Court Notes/documents across all Matters. *Justification:* reassurance and quick re-entry, not primary — hence collapsed, matching progressive disclosure.

Explicitly excluded from Home: credit/wallet balance widgets (no commercial UI exists yet, and even once it does, cost visibility belongs at the point of a chargeable action — §15 — not ambient on Home), a generic activity feed of every system event, any raw list of "all Matters" (that's what the Matters destination is for), settings/account controls.

## 8. Court Note Experience

**Review of the completed Milestone 1 implementation** (`apps/web/src/app/api/cases/[id]/court-notes/route.ts`, `apps/web/src/app/cases/[id]/court-note/page.tsx`, `db/schema.sql`'s `CourtNote` table):

**What is already correct — keep unchanged:**
- The append-only design (`REVOKE UPDATE, DELETE`) and its consequence that a correction is always a *new* Court Note, never an edit. This is the right model and this blueprint does not propose changing it.
- Atomic save: one Court Note write + Proceeding `hearing_date`/`stage`/`court` refresh + conditional `MatterEvent` (`source_type='HEARING'`) insert, in one transaction.
- The mobile screen's shape: primary fields above the fold, progressive disclosure for Next Hearing Date/Next Actions, sticky one-thumb save bar, feature-detected dictation with no false AI-extraction claim.
- Structured Court/Forum quick-select + "Other" free text preserving exact wording (`court_forum_display`).

**UX refinements for future, isolated milestones (not implemented here):**
- **Matter/Proceeding entry point is currently case-only.** Today's only path in is `/cases/[id]/court-note` — an advocate must already have navigated to a specific Proceeding. §4 and §6 both assume a lightweight, standalone Court Note entry (FAB from anywhere) that starts with a Matter/Proceeding picker; that picker does not exist yet and is the one concrete gap between the current implementation and the recommended navigation model. This is additive UI work only — no backend change (`POST /api/cases/[id]/court-notes` already takes any valid `case_id`).
- **No visible acknowledgment that a save also updated the Matter timeline.** The save currently redirects straight to the case page; a one-line confirmation ("Saved — Matter timeline updated") would make the "system remembers, advocate doesn't re-enter" promise visible, not just true.
- **"Skip Matter for now" path** (§4) does not exist — every Court Note today requires an existing Proceeding.

**How Court Note connects to the wider system:** it is the sole producer of `MatterEvent` rows with `source_type='HEARING'` (the chronology mechanism was built in the Matter Workspace Foundation milestone but sat unused until Milestone 1). Nothing else in the system currently writes a Court Note or reads one except the case detail page's history panel and the Matter/case's own `hearing_date`/`stage`/`court` columns.

**Court Note history display:** already correct at the Proceeding level (reverse-chronological, on `/cases/[id]`). Not yet surfaced at the **Matter** level (a Matter with several Proceedings has no single place to see all their Court Notes together) — recommended for Milestone 2 (§22), read-only aggregation, no schema change (`CourtNote.matter_id` already exists for exactly this).

**Corrections/supplements without destroying history:** already solved — a correction is simply a new Court Note against the same Proceeding; the history list shows every entry, newest first, and the Proceeding's denormalized `hearing_date`/`stage`/`court` always reflect the latest. No UI currently frames a second Court Note as "correcting" the first one, which is honest (it isn't a correction, it's a new event) but a future UX nicety could let the advocate optionally tag a note as "correction to the previous entry" purely for display grouping — cosmetic only, not a schema concern, and not recommended until real usage shows advocates want it.

**Next Actions → structured tasks:** by design, still plain text today (Milestone 1's own documented, deliberate exclusion). Milestone 2 ("Hearing-Driven Matter Record Building," already sequenced in the implementation plan) is where a `MatterTask`-shaped entity should read `CourtNote.next_actions`, not before.

**Preparation reminders deriving from Court Notes:** not built (Milestone 3). The data needed already exists (`CourtNote.next_hearing_date`, `stage`, `note`) — Milestone 3 is a read/schedule layer on top, not a Court Note change.

## 9. Prepare Document Experience

**Current state (verified):** no real "Prepare Document" UI exists anywhere in the product. The closest surface, `/dashboard/draft-builder`, is legacy: a hardcoded template array, local React state only, zero `fetch()` calls to any backend — fully disconnected from `DocumentEnvelope`/`DocumentVersion`/AI Gateway/storage, which are otherwise real and solid (`POST /api/documents/upload`, `GET/POST /api/documents/[id]/versions`, `GET /api/documents/[id]/preview`). This is a genuine, clean-slate build, not a refactor of something existing.

**Recommended flow:**
1. **Entry** (Prepare destination or Home CTA) → a practice-area/forum grouping (Civil, Criminal, High Court, Supreme Court, Other — per the approved direction; extensible without a rebuild since it's a UI grouping, not a schema enum) → a document-type list within that group (Memo, Affidavit, Interim Application, Caveat, Plaint, Written Statement, Legal Notice, Agreement).
2. **Minimal initial facts** — only what's needed to start a draft (parties, one-line matter description). Matter association is **optional at this step** ("Link to a Matter now" / "Decide later") — matching §4's onboarding principle and the approved direction's "permit later Matter association when appropriate."
3. **Draft generation or guided preparation** — reuses the existing AI Context Gateway (`lib/ai/context/gateway.ts`) when a Matter is linked (so the draft can be grounded in real Court Note/Proceeding context, not a blank template) and the existing Prompt Builder; when no Matter is linked yet, a plain guided template with no AI context is used instead of blocking the advocate.
4. **Review** — the advocate always sees and can edit before anything is treated as final, consistent with §17 (Trust and Legal Control) — no auto-finalization.
5. **Versioning** — reuses the existing `DocumentVersion` mechanism exactly as built; no new versioning concept.
6. **Premium preview / export-print entitlement** — see §15. A draft is always fully readable and editable in-app; **export/print/final-formatted-download** is the natural chargeable/entitled action (not viewing your own draft), matching the approved "never charge for opening or viewing your own records" rule.
7. **Resume-later** — the draft persists as a normal `DocumentEnvelope`/version; "Continue drafting" on Home (§7) is the resume entry point.
8. **Typist handoff** — explicitly a future extension (Milestone 6, already sequenced), not part of this flow's first build.

## 10. Matter Health Experience

Recommended hierarchy, top to bottom, each a distinct scroll section (progressive disclosure, not one flat form) — extending, not replacing, the current `/matters/[id]` page structure (Title → Overview → Proceedings → Chronology → Team, verified in the live file):

1. **Matter summary / Health** — the six-question answer set from the approved direction (stage, next hearing, what happened last, what's pending, what to prepare next, needs-attention flag), computed from the most recent Court Note across the Matter's Proceedings plus any Milestone-2 derived tasks. This is new content, not present today (today's "Matter Overview" section shows static fields — status, engagement type, opposing party — not a derived health summary).
2. **Court Note history** (aggregated across all Proceedings — see §8) and **Hearing timeline** — the two most relevant "what happened" views, kept adjacent since they're both chronological.
3. **Documents** — linked `DocumentEnvelope`s, reusing existing list/preview/download.
4. **Tasks / next actions** — once Milestone 2 builds the structured entity; until then, the plain-text `next_actions` from the latest Court Note per Proceeding.
5. **Preparation** — the Milestone-3 seven-day view, when built; a Matter-level entry point into it.
6. **Research** — future; no current backend.
7. **Participants and metadata** — today's existing "Team" sidebar and Proceedings-add form; least frequently needed, correctly already de-emphasized as a sidebar rather than the main flow.

This ordering matches actual frequency of need: an advocate opens a Matter far more often to check "what's the status" than to edit team membership, but today's page gives both equal visual weight.

## 11. Seven-Day Preparation Experience

Not built (Milestone 3, correctly sequenced after this). Recommended shape only, reusing existing data with no new source of truth: a single preparation card per upcoming hearing (surfaced on Home when within 7 days, and as a Matter-level view) showing Hearing Date/Court-Forum/Stage/Last Court Note/Pending Documents/Pending Actions — all fields already exist (`CourtNote`, `DocumentEnvelope`) except a scheduling/notification trigger, which is the actual new work Milestone 3 must build. No AI recommendation claims until a reviewed, provider-backed workflow exists, per the approved direction.

## 12. Universal Search Experience

**Current state (verified):** `hybridSearch()`/`GET /api/search` is real (pgvector + keyword hybrid, tenant-scoped, `case_id`/`matter_id` filters) but **document-content-only** — it does not index Matters, Proceedings, Clients, judges, or citations. The top-level `/search` route is a single-line static stub. A second, more complete-looking search UI exists at `/dashboard/search` (300 lines, real component state) but **calls no backend at all** — it is local-only, disconnected, inside the legacy shell.

**Recommended target experience** (Milestone 5, per the implementation plan — not started):
- **Global entry:** the persistent Search destination (§5/§6), plus a search affordance available from Home and from within a Matter (pre-scoped to that Matter, reusing the existing `matter_id` filter).
- **Suggestions/recent searches:** client-side only at first (no new backend), remembering the advocate's last few queries locally.
- **Mobile result layout:** single-column cards, grouped by entity type (Matter / Document / Court Note) with a type icon and a one-line snippet — never a dense table.
- **Result grouping:** exactly the entity types named in the approved direction (client, opponent, matter, case number, court/forum, judge, hearing date, document, citation, statute, keyword) — extending `hybridSearch()` to also query `Matter`/`LegalCase`/`Client` (additive), not replacing the document path.
- **Empty state:** "No results for '…' — try a case number, client name, or court" (teaches the advocate what search understands, since this is genuinely new capability).
- **Permissions/tenant isolation:** identical to every existing query — RLS via `DatabaseClient.execute(tenantId, …)`, nothing new required.
- **No Elasticsearch** — continues Postgres + pgvector, per the approved direction and the existing `DocumentChunkVector` infrastructure.

## 13. Court / Forum Selection Experience

Already correctly solved by Milestone 1 (`lib/domain/court-note.ts`'s `COURT_FORUM_TYPES`/`COURT_FORUM_LABELS`, the `<select>` + conditional "Other" text input in `/cases/[id]/court-note/page.tsx`). This blueprint's only recommendation is to **reuse the exact same component/pattern** everywhere a Court/Forum needs to be captured in the future (Prepare Document's practice-area step, a future Matter-creation form) rather than re-implementing it — a single source of truth for the quick-select list, so the 12-item list never silently overwhelms a screen: a native `<select>` (or, on larger future lists, a searchable combobox) with "Other" always last and always free-text, exactly as built. No change needed today.

## 14. Voice and Manual Input Experience

Reviewed against Milestone 1's implementation (native `SpeechRecognition`, feature-detected, no backend, no AI-extraction claim):

- **Where voice adds real value:** the Note and Next Actions fields, immediately after leaving a courtroom, hands occupied with papers/a phone in one hand — exactly Milestone 1's current scope. Not recommended for structured fields (dates, Court/Forum selection) — those are faster and safer as taps.
- **Where manual is safer/faster:** short, structured fields, and any noisy environment where dictation accuracy degrades (see below).
- **Switching:** the existing "Dictate" button toggles listening on the same field the advocate can also type into directly — already correct; no separate "voice mode" screen.
- **Review of dictated content:** already shown as plain editable text in the same textarea before save — never auto-submitted.
- **Speech recognition unavailable:** the Dictate button is already hidden entirely (feature detection) rather than shown-and-failing — correct, keep.
- **Noisy court corridor:** no mitigation exists or is recommended beyond what's already true — a failed/garbled dictation simply produces text the advocate reviews and edits before save, same as any other manual correction; no false confidence should ever be implied (e.g., no confidence score or "AI understood this correctly" messaging).
- **Language/accent extensibility:** inherited entirely from the browser's native implementation — no product-level configuration exists or is proposed; a locale/language selector for dictation is a reasonable, small future addition (out of scope here).
- **Privacy:** browser-native `SpeechRecognition` sends audio to the browser vendor's own recognition service (e.g., Google's, in Chrome) — this is an existing browser-platform behavior, not something NextCaseHQ controls or should misrepresent; no audio is ever stored or transmitted to NextCaseHQ's own servers.
- **Permission/failure states:** browser mic-permission prompts are native OS/browser UI, outside the app's control; `onerror`/`onend` already stop the "listening" state cleanly in the current implementation.

## 15. Commercial Journey

**Current state (verified):** almost entirely unbuilt. `TenantWallet`/`WalletTransactionRecord` exist as backend ledger tables; `enforceEntitlement()` (`lib/ai/entitlement.ts`) is a real, always-called checkpoint that **always returns `allowed: true`** today (no trial/credit/subscription state exists to check). No wallet, credit, subscription, or paywall UI exists anywhere in the product — only `/api/wallet`, `/api/billing/checkout`, `/api/billing/webhook` backend routes with no frontend consumer.

**Recommended target UX** (a future milestone, sequenced after Prepare Document exists — there is nothing to charge for yet):
- **Trial:** framed as time-limited full access, not a crippled preview — the advocate should feel the real product, not a demo.
- **Credit balance:** visible only where relevant — at the point of a chargeable action (a premium AI drafting operation, an export) and in a dedicated, low-traffic account/usage screen — never ambient on Home (§7).
- **Before any chargeable action:** show the expected cost, explain the value in the advocate's terms ("Premium formatted export — 2 credits"), require explicit confirmation, and make the request idempotent so a retry after a network blip cannot double-charge — matching the approved direction's explicit requirements.
- **Premium preview:** a clearly marked, watermarked, or export/print-restricted state for trial/insufficient-credit users — enforced server-side (already the pattern: RLS + `enforceEntitlement()`'s call site, not a client-side hide) — never a hostile dark pattern (no fake urgency timers, no disabled-but-visible-as-broken buttons per the existing `UI_UX_SENTINEL_AUDIT_REPORT.md` finding about the landing page's disabled search input, which this must not repeat).
- **Insufficient credits / failed payment:** a clear, specific message and a direct path to top up — never a silent failure or a generic error.
- **Usage history:** a plain, readable transaction list (already has a backend home: `WalletTransactionRecord`, `GET /api/wallet/transactions`) — success/failure/refund states all visible, matching the approved direction's requirement for "understandable usage history."
- **Firm expansion (multi-seat/multi-tenant):** explicitly future — the current mock `/organization` tenant-picker (§21) is not a preview of this; it should be removed, not extended, when real multi-tenant-per-firm work begins.

## 16. Persona Validation

| Persona | Most frequent tasks | Likely device | Tech comfort | Biggest friction today | Most valuable entry point | Permission boundary | Commercial value |
|---|---|---|---|---|---|---|---|
| **Independent Advocate** (primary persona — the product must stay simple for this user above all others) | Record Court Note, check today's hearings, prepare documents solo | Mobile, primarily | Low–medium | Being forced through the `/organization` mock tenant picker and landing in the legacy ERP dashboard instead of their real work | Court Note FAB | Full owner of their own tenant | Core subscriber |
| **Junior Advocate** | Court Notes on a senior's behalf, drafting support, research | Mobile | Medium | Same navigation drift; may also need to hand off drafts | Prepare Document, Court Note | `MatterParticipant` role (ASSOCIATE/CLERK already modeled in schema) | Usually covered under a senior's/firm's plan |
| **Senior Advocate** | Reviewing Matter Health across many matters, delegating, less hands-on data entry | Mobile between courts, desktop in office | Medium | Needs fast multi-Matter overview (Home's "needing attention" list) more than any single-Matter deep dive | Home, Matters list | LEAD role | Higher-value subscriber (volume) |
| **Chamber/office staff** | Organizing documents, entering chronology on an advocate's behalf, appointment prep | Desktop, primarily | Medium–high | No current UI role distinction exists at all — schema's `MatterParticipant.role` isn't enforced anywhere yet (documented, deliberate, in `MatterParticipant`'s own schema comment) | Matters, Documents | VIEWER/CLERK (modeled, not enforced) | Usually non-billed seat |
| **Law firm partner** | Oversight across many advocates/matters, firm-level reporting | Desktop | Medium–high | No multi-advocate/firm rollup view exists at all today | Matters (firm-wide, future) | Firm-admin role (not modeled yet) | Highest-value, multi-seat |
| **Typist/assistant (future, limited collaborator)** | Formatting a single shared draft, nothing else | Desktop | Medium | N/A — not built | A scoped share link (Milestone 6) | Single-document, time-boxed, revocable — explicitly least-privilege per the approved direction | Ecosystem-partner value, not a paid seat |

The Independent Advocate remains the product's simplicity bar: nothing recommended anywhere in this blueprint requires that persona to understand firm roles, multi-tenant switching, or delegation to use the product fully and immediately.

## 17. Accessibility and Real-World Usage Requirements

- **One-hand use:** every primary action reachable via the bottom FAB/bar (§6); no primary flow requires a second hand to hold the phone differently.
- **Outdoor glare:** the existing high-contrast warm-cream/near-black palette (already measured elsewhere in the repo's history at >10:1 contrast for body text) should be preserved; the one documented gap (`UI_UX_SENTINEL_AUDIT_REPORT.md`'s note on `text-neutral-400` secondary text falling to ~2.5:1) should be corrected wherever it's found to still exist, as ordinary accessibility hygiene, not a new initiative.
- **Noisy environments:** covered in §14 (dictation degrades gracefully to manual review/edit, never silently).
- **Slow mobile connections:** Court Note's form state must survive a slow or interrupted save (see §18 — Interrupted state) rather than silently losing what was typed.
- **Interruptions / resuming later:** drafts (§9) and in-progress Court Notes (§18) must both be resumable, not lost, if the advocate is called back into court mid-task.
- **Older users / reduced vision:** large touch targets (≥44–52px, already Milestone 1's standard), visible always-on labels (not icon-only nav, §6), no reliance on hover states (mobile-first already implies this).
- **Large text settings / screen readers / keyboard navigation:** every input already carries a paired `<label>` (Milestone 1's pattern); this must remain the standard for every future form, not a one-time fix.
- **Touch errors:** destructive actions (deleting a draft, discarding an unsaved Court Note) require explicit confirmation — already true for Matter/Case delete at the API level (409 conflict checks); the UI layer must carry the same discipline forward for any future destructive UI action.
- **Temporary offline/unstable connectivity:** not solved by any current screen; recommended as a Milestone-adjacent hardening item (§22) — local draft preservation (e.g., writing in-progress Court Note/Document form state to `localStorage` before submit) rather than a full offline-sync architecture, which would be a significant, unapproved scope expansion.

## 18. Empty, Loading, Error, and Interrupted States

- **Empty states:** the existing `EmptyState` component (`components/EmptyState.tsx`) is the correct, reusable primitive — already used on `/matters`. Recommendation: use it consistently for every list view this blueprint proposes (Home's "no hearings today," Matters' "no matters yet," Search's "no results") rather than inventing new empty-state patterns per screen.
- **Loading states:** the existing spinner pattern (seen on `/cases/[id]`, `/matters/[id]`) is adequate and should remain the standard — no skeleton-loader investment recommended beyond what exists, since it isn't the product's current UX risk.
- **Error states:** every mutation must show a specific, actionable message (already Milestone 1's pattern: `saveError` rendered with `role="alert"`) — never a silent failure and never a raw technical error string.
- **Interrupted/resume behavior:** the one genuine current gap — neither Court Note nor (once built) Prepare Document preserves in-progress form state if the advocate is interrupted (a call, a hearing called out of turn) before saving. Recommended: persist the in-progress form to `localStorage`, keyed by the entity id, cleared on successful save — small, additive, no backend change.
- **Destructive-action confirmation:** any future "discard draft" or "delete Court Note attempt" (there is currently no delete UI for Court Note, correctly, since it's append-only) must use an explicit confirm step, not a single accidental tap.

## 19. Desktop and Mobile Relationship

Mobile is the primary design target (per the approved direction), not a shrunk desktop layout. Desktop is the *same* information architecture (§5) rendered wider: the four persistent destinations become a left rail instead of a bottom bar; the Court Note FAB becomes a persistent button in the rail's header rather than a floating circle (a hover-capable, larger pointer surface doesn't need the same one-thumb-reach solution mobile does, but must remain equally fast to reach — never demoted to a nested menu). Every screen's *content* hierarchy (§7, §8, §10) is identical between breakpoints — only the chrome around it changes, matching the existing `md:` breakpoint convention already used throughout `/matters` and `/cases`.

## 20. Existing Components and Patterns to Reuse

- `components/BrandBackground.tsx`, `components/EmptyState.tsx`, `components/Logo.tsx` — direct reuse, no change needed.
- The warm gold/maroon/deep-forest-green/cream Tailwind palette already established across `/matters`, `/cases`, `/cases/[id]/court-note`.
- The mobile-first `md:`-breakpoint-override convention (base classes = mobile, `md:` = desktop) already used consistently on the new surface.
- `lib/domain/court-note.ts`'s Court/Forum pattern (§13) — reuse verbatim anywhere else a forum needs capturing.
- The zod-validated route-handler shape (`requireSession`/`isTrustedOrigin`/RLS-scoped queries) — not a UI component, but the contract every new screen's backing API must keep following.
- `lib/ai/context/gateway.ts` — the single mandatory entry point for any future AI-assisted drafting UI (§9), already built and proven in Milestone 2 (AI Chat).
- The client-side fetch-then-filter list pattern already used by `/matters/page.tsx` — reuse for any new list-and-search-locally UI before investing in a new backend query, exactly as Milestone 1 did for the Court Note case picker.

## 21. UX Gaps in the Current Product

Ranked by how directly each one threatens "fragmented screens, navigation drift, mobile clutter, duplicated workflows" — the exact risks this blueprint exists to prevent.

### 21.1 Two competing "front doors" (highest priority)
A real, logged-in advocate today is routed **`/login` → `/organization` (fully mock tenant picker, hardcoded `mockTenants`, a cookie the real backend never reads) → `/dashboard`** (the legacy `TriPaneChamber`-based ERP shell — sidebar items: AI Chamber, Cases/Litigation, Search Engine, Compliance Audit, Evidence Register, Draft Builder, System Settings — which does not link to `/matters` at all). Meanwhile, the real, brand-aligned, database-backed advocate workspace lives at `/matters` and `/cases`, reachable only via the marketing `Navbar`'s "Matters"/"Cases" links or a direct URL. These are two entirely separate surfaces with two different navigation models, and today's actual login flow drops the advocate into the wrong one.

### 21.2 The persistent Navbar is a marketing menu, not product navigation
`components/Navbar.tsx` renders on every page except `/login`, `/organization`, `/dashboard/*`, `/admin/*`, `/system/*` — meaning it sits above `/matters/[id]`, `/cases/[id]`, and `/cases/[id]/court-note` for an already-authenticated advocate. Its menu mixes real product destinations (Matters, Cases) with marketing pages (Features, Solutions, Pricing) and offers a "Sign In" button and a "Dashboard" link, but no logout, no account/tenant indicator, no Search, no Home. This is the single component most responsible for "navigation drift" as currently built.

### 21.3 Universal Search is real on the backend and absent on the frontend
`hybridSearch()`/`GET /api/search` is a solid, tenant-scoped, hybrid pgvector+keyword implementation. The top-level `/search` route is a one-line static stub. A second, fuller-looking search UI at `/dashboard/search` has real component state but calls no backend at all. An advocate today cannot actually search anything from a working UI.

### 21.4 "Prepare Document" has no real UI entry point at all
The only UI resembling document preparation, `/dashboard/draft-builder`, is a legacy, fully local-state mock with a hardcoded template array and zero connection to the real `DocumentEnvelope`/`DocumentVersion`/storage/AI Gateway backend, which is otherwise solid and already proven (upload, versions, preview, download, search-indexing).

### 21.5 No commercial UI exists anywhere
Backend primitives exist (`TenantWallet`, `WalletTransactionRecord`, `/api/wallet*`, `/api/billing*`) and `enforceEntitlement()` is a real, always-invoked checkpoint — but it always allows, and no screen anywhere shows a balance, a cost, a paywall, or a transaction history. This is expected at this stage (nothing chargeable has shipped yet) but should be tracked as a known, complete gap rather than assumed partially built.

### 21.6 Court Note's Matter-selection entry point is case-only
Per §8: today's only path into Court Note requires the advocate to already be on a specific Proceeding's page. The FAB-based, "record from anywhere" model this blueprint recommends (§6) needs a new, lightweight Matter/Proceeding picker as its first screen — additive UI only, no backend change required (`case_id` is already the only required identifier `POST /api/cases/[id]/court-notes` needs).

## 22. Sequenced UX Implementation Milestones

Ordered by dependency and by how directly each closes a gap in §21, consistent with (not replacing) `docs/PRODUCT_DIRECTION_IMPLEMENTATION_PLAN.md`'s existing Milestone 2–6 sequencing:

1. **Navigation unification** (new — should precede or accompany Milestone 2's first PR): retire the mock `/organization` tenant picker from the real login flow, redirect authenticated users to Home/Matters instead of `/dashboard`, and replace `Navbar`'s always-on marketing menu with the four-destination IA (§5) whenever a real session exists (marketing pages keep their own, separate nav when logged out). This is the single highest-leverage fix available — it costs no new backend work and removes the product's biggest structural inconsistency before any more screens are built on top of it.
2. **Home screen** (§7) — new build, no backend change beyond querying data that already exists (today's hearings from `LegalCase.hearing_date`, matters needing attention from existing Matter/Court Note fields).
3. **Court Note FAB + standalone Matter/Proceeding picker entry** (§6, §21.6) — additive UI, no backend change.
4. **Milestone 2 (already sequenced): Hearing-Driven Matter Record Building** — Matter-level Court Note history aggregation (§8, §10) and the first structured Task entity from `next_actions`.
5. **Prepare Document entry point** (§9, §21.4, already Milestone 4 in the implementation plan) — clean-slate build reusing the existing document/AI backend.
6. **Universal Search frontend** (§12, §21.3, already Milestone 5) — wire a real UI to the existing `hybridSearch()`, extend it to Matter/Client/Proceeding entities.
7. **Milestone 3: Seven-Day Preparation** and **Milestone 6: Typist Collaboration** — unchanged from the existing sequencing, both depend on Milestone 2 and 4/5 respectively landing first.

## 23. Explicit Exclusions

This blueprint does not propose: a redesign of the database schema or API contracts (every recommendation reuses existing tables/routes or names small, additive ones already implied by the approved direction); a new design system or component library; multi-tenant/firm-switching UI (deferred, §16); offline-first sync architecture (§17 recommends only local draft preservation, not full offline capability); any commercial/entitlement enforcement logic change (§15 describes target UX only — `enforceEntitlement()`'s real logic is separate, future work); AI-driven field extraction from voice (§14, explicitly excluded per the approved direction); removal or redesign of the legacy `/dashboard/*` shell's internals (only its role as the post-login destination is addressed, in §22's navigation-unification item — retiring it entirely is a separate decision, not assumed here).

## 24. Risks

- **Risk: navigation unification (§22 item 1) is described as "should precede Milestone 2" but is not itself part of the currently-approved Milestone 2 scope.** Treating it as a prerequisite could stall Milestone 2 unless the Product Owner explicitly folds it in as a small, isolated first PR. Flagged as a genuine decision point (§25).
- **Risk: the legacy `/dashboard/*` shell still has real, if partially mock, functionality** (notifications bell now wired to real `Notification` data, admin console, AI Chamber). Redirecting login away from it (§22 item 1) must not silently strand any real, working feature that has no equivalent yet on the new surface — an inventory of what in `/dashboard/*` is real vs. mock should be a five-minute check before that change ships, not assumed from this document alone.
- **Risk: introducing a FAB is a small but real visual pattern change** — it should be validated against the existing brand's "calm legal aesthetic, no unnecessary animation" principle in an actual build, not just this document, before being treated as final.
- **Risk of scope creep:** several sections here (Search frontend, Prepare Document, commercial UX) describe substantial future builds. Sequencing them (§22) is a recommendation, not an authorization to start; each remains its own future milestone requiring its own approval, exactly as Milestone 1 was.

## 25. Acceptance Criteria

This blueprint is ready for approval when the Product Owner confirms:
1. The four-destination IA (§5) and the FAB-based Court Note recommendation (§6) as the final navigation model, superseding the current dual-surface structure.
2. Whether navigation unification (§22 item 1) ships as its own small PR before Milestone 2, or is folded into Milestone 2's first PR, or is explicitly deferred (a real decision is required here — see §24).
3. The Home screen's five elements (§7) as the complete, correct first-cut scope — no additions before it ships once.
4. That Prepare Document (§9) and Universal Search frontend (§12) remain sequenced after Milestone 2 as currently planned, not pulled forward.
5. No engineering work begins against this document until this sign-off happens — consistent with Milestone 1's own review process.

---

**Genuine Product Owner decision required, called out explicitly (not resolved unilaterally here):** whether to fix §21.1/§21.2 (login routing + Navbar) as a prerequisite step before Milestone 2, bundle it into Milestone 2's first PR, or defer it — see §24's first risk. This blueprint recommends fixing it first, but does not treat that recommendation as already approved.
