# Dashboard Workspace Architecture Proposal

Read-only architectural deliverable per Product Owner direction (see `docs/BUILD_LEDGER.json` → `ux_4_dashboard_experience_redesign`). **No code changes, no prototypes.** This document analyzes the current dashboard, proposes a new Legal Research Workspace architecture, and identifies implementation phases small enough to each ship as one isolated PR — none of which are approved to begin yet.

## 1. Current Dashboard Analysis

The authenticated dashboard shell (`apps/web/src/app/dashboard/layout.tsx`) wraps 8 routes: `/dashboard`, `/dashboard/ai-chamber` (both render `TriPaneChamber`), plus 6 sibling pages (`cases`, `search`, `evidence`, `draft-builder`, `audit`, `settings`) that are simple, single-purpose forms/lists unrelated to `TriPaneChamber`.

**Shell** (fixed for both current and proposed architecture, per UX-1): a left sidebar (now off-canvas below `md`, static above it) with 7 nav items, a header with session status/notification bell/logout, and a main content region.

**`TriPaneChamber.tsx`** (`/dashboard`, `/dashboard/ai-chamber`) is three equal-width columns (25% / 45% / 30%), each independently tabbed:

| Panel | Tabs | Content |
|---|---|---|
| Left (25%) | Ledger / Chronos / Graph | Evidence exhibit list, chronology timeline with contradiction flagging, entity relationship graph |
| Center (45%) | Dialogue / Reasoning Engine / Contradictions | AI chat (real, calls `POST /api/ai/ask`), static legal-reasoning breakdown cards, evidentiary contradiction tracker |
| Right (30%) | Canvas / Hearing Prep / Readiness | Document drafting canvas, hearing-prep checklist + cross-exam outline, filing/trial readiness progress bars |

On mobile, only one of the three panels shows at a time (bottom tab bar), so a user is two navigation layers deep (panel, then that panel's own 3 tabs) to reach any given piece of content — 9 addressable views in total behind 2 stacked tab bars.

**Notable existing duplication:** the right panel's "Canvas" tab overlaps with the separate `/dashboard/draft-builder` page; the left panel's "Ledger" overlaps with `/dashboard/evidence`. These sibling pages and `TriPaneChamber`'s internal tabs evolved independently and were never reconciled.

**Relationship to `/matters/[id]`:** the existing Matter detail page (`apps/web/src/app/matters/[id]/page.tsx`) already provides a real, server-backed Matter workspace — Matter Health, Court Note History, Pending Actions, Proceedings, Matter Timeline, Documents, Team — built across Product Direction Milestones 1–3. `TriPaneChamber` is a **separate, parallel, mock-data surface** with no wiring to real Matter/Proceeding/Document data. This is the single most important fact for this proposal: **the new workspace must be designed as an extension of the real `/matters/[id]` data model, not as a second, disconnected "AI chamber."**

## 2. Why the Three-Column Workflow Is Inefficient for Legal Research

- **Forced horizontal scanning.** Three equal-width columns mean a user reading AI analysis, checking evidence, and referencing a draft must continuously move their eyes left-center-right — appropriate for a chat app, not for reading dense legal analysis or drafting prose.
- **No column is ever full width.** At 45%, even the "main" center column caps reading line-length awkwardly on a laptop screen and forces excessive scrolling for anything document-length.
- **Two-level tab nesting hides content.** 9 views behind 3 panels × 3 tabs each means a first-time user has no way to discover most of the workspace's actual capability.
- **Equal visual weight regardless of task.** Hearing-prep checklists, relationship graphs, and readiness bars all compete for the same fixed 25–30% sliver whether or not they're relevant to the task at hand.
- **Disconnected from real Matter data.** Every column shows mock/sample data (`evidenceList`, `chatMessages` seed, hard-coded checklist) unrelated to whatever real Matter the advocate actually has open — a structural gap, not just a layout one.

## 3. Proposed Information Architecture

Adopting the Product Owner's approved direction: a **reading-first, single-dominant-workspace** layout, matter-scoped and backed by real data.

```
+----------------------------------------------------------------------+
| Top Bar: Search | Matter Switcher | AI | Notifications | User        |
+----------------------------------------------------------------------+
+------------------+---------------------------------+-----------------+
|                  |                                 |                 |
| Matter Navigator |     Main Research Workspace      | Context Drawer  |
| (left, ~240px,   |     (center, dominant, 60-70%)   | (right,         |
|  off-canvas      |                                 |  collapsed by   |
|  <md, reuses     |  - AI Analysis (reading view)    |  default)       |
|  UX-1 pattern)   |  - Case Law / Statutes           |                 |
|                  |  - Draft Document                |  - Citations    |
| - Matters        |                                 |  - Related Cases|
| - Documents      |                                 |  - History      |
| - Notes          |                                 |  - AI Sources   |
| - Evidence       |                                 |  - References   |
| - Timeline       |                                 |                 |
+------------------+---------------------------------+-----------------+
```

**Key structural change from the current model:** the left rail becomes **Matter-scoped navigation** (Matters/Documents/Notes/Evidence/Timeline — the same conceptual sections `/matters/[id]` already has real data for), not app-level sections (Cases/Search/Audit/Settings). The 6 existing sibling pages (`cases`, `search`, `audit`, `settings`, etc.) are **explicitly out of scope for this redesign** — they remain app-level pages reachable from wherever primary navigation already lives; this proposal only concerns the `TriPaneChamber` surface (`/dashboard`, `/dashboard/ai-chamber`).

## 4. Desktop Workspace (≥1024px)

- Top bar: full-width, persistent, ~56–64px.
- Matter Navigator: fixed left column, ~240–280px, always visible (same visual treatment as today's sidebar, repurposed content).
- Main Research Workspace: fills remaining width minus the drawer's collapsed sliver (a slim, always-visible tab/toggle strip, not full drawer width) — target 60–70% of total viewport width when the drawer is closed.
- Context Drawer: closed by default; opens as an overlay or as a resizable panel pushing the Main Workspace narrower (not stacking a third permanent column) — implementation choice deferred to the first content-mapping milestone (§9).

## 5. Tablet Workspace (768–1023px)

- Matter Navigator: collapses to the UX-1 off-canvas pattern (hamburger-triggered slide-in, backdrop, Escape-to-close) — **directly reusing the exact mechanism already built and merged in PR #108**, just re-pointed at the new nav items.
- Main Research Workspace: takes the full remaining width.
- Context Drawer: opens as a slide-over from the right (same off-canvas mechanism, mirrored), never a permanent column at this breakpoint. This is also the fix for the already-logged `tripane_chamber_768px_tightness` residual — a workspace with at most one off-canvas panel open at a time cannot produce the current three-column squeeze.

## 6. Mobile Workspace (<768px)

- Matter Navigator: off-canvas (UX-1 pattern, reused as-is).
- Main Research Workspace: full-screen, single view — the only surface visible by default.
- Context Drawer: full-screen slide-over (or bottom sheet) triggered from the Main Workspace, not a third tab-bar destination — replaces `TriPaneChamber`'s current bottom tab bar entirely, since there is no longer a third permanent panel to switch to.

## 7. Reading-First Design Principles

1. One dominant workspace at a time — never three competing columns.
2. Navigation and reference material stay hidden until requested (progressive disclosure), not permanently visible "just in case."
3. Line length and typography for the Main Workspace should target actual reading/drafting ergonomics (comparable to `documents/[id]`'s existing prose layout), not a chat-bubble column.
4. Every visible element must justify its screen space for the *current task* — no permanently-reserved space for content that's only sometimes relevant (hearing prep, readiness bars, relationship graphs).
5. Minimize eye travel: related actions (open a citation, see AI's sources) surface next to what triggered them, not in a fixed distant column.

## 8. Component Inventory

### Reuse unchanged
- UX-1's off-canvas nav mechanism in `dashboard/layout.tsx` (state-driven show/hide, hamburger button, backdrop, Escape-to-close, route-change auto-close) — reused for **both** the Matter Navigator and the Context Drawer.
- `components/Breadcrumbs.tsx`, `components/EmptyState.tsx`, `components/BrandBackground.tsx`.
- The notification bell + sliding drawer pattern already in `dashboard/layout.tsx`'s header — same visual/interaction language as the proposed Context Drawer.
- `handleSendMessage`'s AI-chat logic and its real `POST /api/ai/ask` integration (extract into a hook, reuse verbatim — this is real, working functionality, not mock data, and must not be lost).
- `components/ui/*` (Badge, Card, Accordion, Tabs) — the underlying design system is unaffected by this redesign.
- All 6 sibling dashboard pages (`cases`, `search`, `evidence`, `draft-builder`, `audit`, `settings`) — untouched, out of scope.

### Modify
- `dashboard/layout.tsx`: sidebar nav items change from app-level sections to Matter-scoped sections; header gains a Matter switcher and search entry point (top bar).
- `apps/web/src/app/dashboard/page.tsx` / `dashboard/ai-chamber/page.tsx`: currently trivial `TriPaneChamber` wrappers — become the entry points that select/load a real Matter context instead of rendering static mock data.

### Replace
- `TriPaneChamber.tsx`'s three-equal-column layout — replaced by the Main Workspace + Context Drawer structure. Its **content is not discarded**; it is redistributed:
  - Dialogue (AI chat) → Main Workspace, "AI Analysis" mode.
  - Reasoning Engine, Contradictions → Main Workspace reading views, or Context Drawer reference material (open question, §9).
  - Ledger (evidence), Chronos (timeline), Graph (relationships) → Matter Navigator sections (Evidence, Timeline) and/or Context Drawer, replacing mock data with real `DocumentEnvelope`/`MatterEvent`/`CourtNote` queries already used by `/matters/[id]`.
  - Canvas (drafting) → consolidates with the existing, already-real `/documents/new` and `/documents/[id]` drafting flow rather than maintaining a second, mock drafting surface.
  - Hearing Prep, Readiness → most likely Matter Navigator (Timeline/Evidence-adjacent, actionable) rather than Context Drawer (passive reference) — flagged as an open placement question for Product Owner sign-off before Phase 2 (§9), not decided here.

## 9. Migration Strategy

The redesign is **also a data migration**, not just a layout change: `TriPaneChamber` currently has zero connection to real Matter data. Content-mapping decisions (where Hearing Prep/Readiness/Graph land, how AI chat's Matter scoping works) should be resolved in a short, dedicated design pass **before** Phase 2 below begins, not assumed silently.

Explicit open questions for Product Owner decision, not resolved in this document:
- Should the redesigned workspace fully replace `/dashboard` + `/dashboard/ai-chamber`, or should it become a new mode reachable from `/matters/[id]` directly (given the two surfaces' data now overlaps)?
- Where do Hearing Prep and Readiness belong — Matter Navigator or Context Drawer?
- Does the Context Drawer's "Related Cases" imply new citation/precedent search capability, or only surface what the existing AI chat already cites?

## 10. Implementation Phases (each a single isolated PR)

1. **Phase 1 — Shell only.** Rebuild the outer layout (Top Bar, Matter Navigator off-canvas skeleton, Main Workspace region, collapsed Context Drawer toggle) in `dashboard/layout.tsx`, with the Main Workspace continuing to render the **existing, unmodified `TriPaneChamber`** inside it temporarily. Zero content redistribution — proves the new shell, navigation, and responsive behavior in complete isolation before any content decisions are made. Lowest risk, smallest diff, fully reversible.
2. **Phase 2 — Matter Navigator real data.** Wire the Matter Navigator's Matters/Documents/Notes/Evidence/Timeline sections to real data (reusing `/matters/[id]`'s existing queries), still with `TriPaneChamber` occupying the Main Workspace unchanged.
3. **Phase 3 — Main Workspace content migration.** Move AI chat (Dialogue) into the new Main Workspace as the primary reading view, retiring `TriPaneChamber`'s center panel. Left/right panel content not yet touched.
4. **Phase 4 — Context Drawer.** Build the collapsible drawer and migrate whichever content the Phase-9 open questions resolve to "reference material" (Reasoning/Contradictions/Citations).
5. **Phase 5 — Retire `TriPaneChamber`.** Once all content has a new home, delete the old component and its mock data entirely.

Each phase leaves the app in a fully working state; none requires the next to already exist. Sequencing (which phase first) and scope of each phase remain subject to Product Owner approval — this is a proposed decomposition, not a committed plan.

## Risks

- **Losing real, working functionality during extraction** (`handleSendMessage`'s live AI integration is the one genuinely load-bearing piece of `TriPaneChamber` today) — mitigated by extracting it as a reusable hook before any layout change, verified by test, not rewritten from scratch.
- **Building a second overlapping Matter-view surface** if the redesigned workspace and `/matters/[id]` aren't explicitly reconciled (§9) — the highest-severity risk in this proposal, worth resolving before Phase 2.
- **Scope creep into a full visual redesign.** Per the Product Owner's explicit instruction, this must stay a workflow/IA change, reusing the existing design system (colors, typography, `components/ui/*`) — not an opportunity to also re-skin the app.
- **Mobile Context Drawer UX** (slide-over vs. bottom sheet) needs real device testing before Phase 4 locks in an approach.

## Components That Can Remain Unchanged

`dashboard/layout.tsx`'s off-canvas mechanism (mechanism, not content), notification bell/drawer, `Breadcrumbs`, `EmptyState`, `BrandBackground`, all `components/ui/*`, all 6 non-`TriPaneChamber` dashboard pages, `/matters/[id]`, `/documents/new`, `/documents/[id]`, and the `POST /api/ai/ask` backend contract.

## Components That Require Redesign

`TriPaneChamber.tsx` (replaced across Phases 3–5), `dashboard/layout.tsx`'s sidebar nav items and header (Phase 1), `dashboard/page.tsx` / `dashboard/ai-chamber/page.tsx` (Phase 2, become real Matter-context entry points instead of static wrappers).

---

**No implementation, prototypes, or code changes are included in or authorized by this document.** Awaiting Product Owner approval before Phase 1 begins.
