# Matter Workspace Dependency Map

Read-only architectural deliverable per Product Owner direction following approval of `docs/DASHBOARD_WORKSPACE_ARCHITECTURE.md` (PR #112). This document identifies every component, data flow, route, and API dependency touched by the Matter Workspace redesign, and defines the migration sequence and rollback strategy for Phases A–C. **No code changes, no prototypes.**

## Product Direction Recap

- The dashboard evolves into a **Matter Workspace**: the primary working environment for advocates, structured around a single active Matter (Overview, Facts, Parties, Documents, Research, AI Assistant, Hearings [Preparation/Checklist/Strategy/Notes], Evidence, Timeline, Drafts, Tasks, Notes).
- The current `/dashboard` route becomes a **lightweight launch/activity page** — no longer the primary working surface.
- AI is **contextual assistance** surfaced in the collapsible right drawer alongside Citations, Authorities, Related Cases, Sources, References — it does not permanently occupy a third of the screen.
- Related Cases initially reuses existing search/AI capability; no new citation engine is built now.

## 1. Components Reused Unchanged

| Component | Why it carries over as-is |
|---|---|
| `dashboard/layout.tsx`'s off-canvas mechanism (state, hamburger, backdrop, Escape-to-close, route-change auto-close) — built in UX-1 (PR #108) | Directly reused for both the Matter Navigator (mobile/tablet) and the Context Drawer (all breakpoints below desktop). No new interaction pattern needed. |
| `handleSendMessage`'s AI chat logic in `TriPaneChamber.tsx`, and its `POST /api/ai/ask` contract | Real, working functionality — the route already accepts an optional `matter_id` (see §6), so it is natively matter-scoped with zero backend change. |
| `components/Breadcrumbs.tsx`, `components/EmptyState.tsx`, `components/BrandBackground.tsx` | Presentational, layout-agnostic. |
| Notification bell + slide-out drawer pattern in `dashboard/layout.tsx`'s header | Same interaction language proposed for the Context Drawer — proven, accessible, already shipped. |
| `components/ui/*` (Badge, Card, Accordion, Tabs, etc.) | Design system is unaffected by an information-architecture change. |
| `/matters/[id]/page.tsx` and its API-backed sections (Matter Health, Court Notes, Proceedings, Team) | Already the real, server-backed Matter workspace this redesign extends — not rebuilt, reused as the data backbone. |
| `/documents/new`, `/documents/[id]` | Existing real drafting/document flows; the Matter Workspace's "Drafts" section wraps these rather than reintroducing `TriPaneChamber`'s mock "Canvas" tab. |
| Backend routes: `/api/matters/[id]`, `/api/matters/[id]/court-notes`, `/api/matters/[id]/events`, `/api/matters/[id]/tasks`, `/api/matters/[id]/preparation`, `/api/matters/[id]/participants`, `/api/matters/[id]/health`, `/api/documents/*`, `/api/ai/ask`, `/api/search` | All already exist, are tenant-scoped via RLS, and already return exactly the shape the Matter Workspace sections need (see §6). No new endpoint is required to reach Phase A/B functionally. |

## 2. Components Requiring Modification

| Component | Change required |
|---|---|
| `dashboard/layout.tsx` | Sidebar nav items change from app-level sections (Dashboard, Cases, Search, Evidence, Draft Builder, Audit, Settings) to Matter-scoped sections once a Matter is active; header gains a Matter switcher and the redesigned search entry point (§7). The launch/activity page keeps a simpler, app-level nav. |
| `dashboard/page.tsx` / `dashboard/ai-chamber/page.tsx` | Currently 10-line `TriPaneChamber` wrappers. `dashboard/page.tsx` becomes the lightweight launch/activity page (recent matters, quick actions, notifications) — not a Matter Workspace itself. `ai-chamber` is retired as a standalone route once its content is absorbed into the Matter Workspace's AI Assistant section. |
| `dashboard/search/page.tsx` | Currently renders a **hardcoded mock `legalDatabase` array** filtered client-side — it does not call any backend route today. Must be rewired to call the real `GET /api/search` (Universal Search, `runSearch()`) instead of removing/replacing that backend, per the "no new backend logic" instruction. This is a correction of an existing gap, not new scope. |
| `dashboard/evidence/page.tsx`, `dashboard/draft-builder/page.tsx` | Both currently local-state-only (mock evidence list, mock draft templates), same as `TriPaneChamber`. Their content migrates into the Matter Workspace's Evidence and Drafts sections, wired to `/api/documents/*` instead of local mock state. |
| `TriPaneChamber.tsx` | Not deleted outright — its content is redistributed section-by-section into the Matter Workspace across Phases A–C (see §8, §9). |

## 3. Components to Retire

- `TriPaneChamber.tsx`'s three-equal-column layout shell (retired at the end of Phase C, once every tab's content has a new home in the Matter Workspace).
- `TriPaneChamber.tsx`'s mock data structures (`evidenceList` seed, `chatMessages` seed, hardcoded `checklist`) — replaced by real API-backed data as each corresponding Matter Workspace section goes live.
- The standalone `/dashboard/ai-chamber` route (once its one distinct piece of real functionality — the AI chat — is absorbed into the Matter Workspace's AI Assistant section; `/dashboard` and `/dashboard/ai-chamber` currently render the identical component, so this removes a redundant route, not a capability).
- `dashboard/search/page.tsx`'s in-memory `legalDatabase` mock array (replaced by a real `/api/search` call — the UI route itself is not retired, only its current mock data source).

## 4. Data Flows

**Current state:** `TriPaneChamber`, `dashboard/evidence`, `dashboard/draft-builder`, and `dashboard/search` are four independent, mock-data-only surfaces with no connection to each other or to real Matter data. `/matters/[id]` is the one existing surface with real, tenant-scoped, RLS-protected data.

**Target state:** the Matter Workspace becomes a single consumer of the Matter's existing real data sources:

```
Matter Workspace (matter-scoped)
├── Overview / Facts / Parties  → GET /api/matters/[id]  (+ /participants)
├── Documents                   → GET /api/documents (matter-scoped), /api/documents/[id]
├── Research                    → GET /api/search?matter_id=... (Universal Search, matter-scoped)
├── AI Assistant                → POST /api/ai/ask { matter_id }  (unchanged contract)
├── Hearings
│     ├── Preparation           → GET /api/matters/[id]/preparation  (Seven-Day Case Preparation)
│     ├── Checklist / Strategy / Notes → GET/POST /api/matters/[id]/tasks, /court-notes
├── Evidence                    → GET /api/documents (matter-scoped, evidence-tagged)
├── Timeline                    → GET/POST /api/matters/[id]/events
├── Drafts                      → existing /documents/new, /documents/[id] flow
├── Tasks                       → GET /api/matters/[id]/tasks
└── Notes                       → GET/POST /api/matters/[id]/court-notes
```

No new data flow is introduced; the redesign's job is to route the Matter Workspace's UI sections at existing, already-shipped endpoints instead of `TriPaneChamber`'s local mock state.

## 5. Routing Changes

- `/dashboard` → becomes the lightweight launch/activity page (new content, not a redirect).
- `/dashboard/ai-chamber` → retired once AI Assistant is absorbed into the Matter Workspace (Phase C); until then it continues to render unchanged `TriPaneChamber` per Phase A.
- New route family for the Matter Workspace itself: most naturally an extension of the existing `/matters/[id]` route (e.g. `/matters/[id]/workspace` or tabs within `/matters/[id]`) rather than a new top-level `/workspace/[id]` — **this exact routing decision is flagged as an open question for Phase A design**, consistent with Decision 1 in the approved architecture (the Matter Workspace replaces the dashboard experience, but the precise URL structure is an implementation detail, not decided here).
- `/dashboard/evidence`, `/dashboard/draft-builder`, `/dashboard/search`, `/dashboard/cases`, `/dashboard/audit`, `/dashboard/settings` remain reachable independently during migration (Phase A/B); `evidence` and `draft-builder`'s content is absorbed into the Matter Workspace by Phase B, at which point those standalone routes can redirect into the Matter Workspace's Evidence/Drafts sections.

## 6. API Dependencies

All API dependencies already exist; none require modification for Phase A or B:

| Endpoint | Method | Existing purpose | Matter Workspace use |
|---|---|---|---|
| `/api/matters/[id]` | GET/PATCH/DELETE | Core Matter record | Overview/Facts/Parties |
| `/api/matters/[id]/participants` | GET | Matter participants | Parties |
| `/api/matters/[id]/court-notes` | GET/POST | Court note history | Notes, Hearings/Notes |
| `/api/matters/[id]/events` | GET/POST | Manual chronology | Timeline |
| `/api/matters/[id]/tasks`, `/tasks/[taskId]` | GET/PATCH | Structured pending actions | Tasks, Hearings/Checklist |
| `/api/matters/[id]/preparation` | GET | Seven-Day Case Preparation (read-only, derived) | Hearings/Preparation |
| `/api/matters/[id]/health` | GET | Matter Health score | Overview |
| `/api/documents/*` | GET/POST | Document CRUD, upload, versions, preview, download | Documents, Evidence, Drafts |
| `/api/ai/ask` | POST | RAG answer generation, optional `matter_id` scoping | AI Assistant (contextual drawer) |
| `/api/search` | GET | Universal Search (Milestone 5, `runSearch()`), optional `matter_id` scoping, provider `type` filter | Research section and the redesigned search entry point (§7) — **not currently called by any UI**; `dashboard/search/page.tsx` must be pointed at it |

No new backend endpoint, schema change, or migration is required to implement Phases A and B.

## 7. Search Experience (folded in per Product Owner direction)

This is a core requirement of the Matter Workspace architecture, not a separate initiative:

1. Remove the current "Execute Search" button (`dashboard/search/page.tsx:152-157`).
2. Replace it with a compact arrow/send icon positioned inside the right end of the search field — subtle, not a large call-to-action.
3. Support both Enter-to-submit and arrow-click submit, matching modern AI-interface conventions.
4. The search box becomes the primary entry point of the Matter Workspace (Research section and, longer-term, a persistent top-bar search per the approved desktop layout), sized for long legal queries rather than short keyword input.
5. Preserve full keyboard accessibility, visible focus states, and screen-reader accessible names (`aria-label` on the submit affordance, form semantics unchanged) — consistent with the UX-2 accessibility baseline already shipped.
6. **No new backend search logic.** The existing `GET /api/search` (`runSearch()`, Universal Search, Milestone 5) already supports `matter_id` scoping and a `type` filter across Documents/Matters/Proceedings/Clients/Court Notes providers — the fix here is UI-level (button/icon/submission behavior) plus wiring `dashboard/search/page.tsx` to the route it should have been calling already, not new capability.
7. **Extensibility, not implementation now:** the search box's visual and interaction design should not preclude later additions — natural-language legal research, matter search, document search, AI prompts, case-citation lookup, Act/Section lookup — since `/api/search`'s `type` parameter and provider-registry design (`SEARCH_PROVIDER_TYPES`) already anticipate exactly this kind of extension without a UI contract change. No UI work for these future capabilities is scoped or authorized here.
8. No implementation yet — this is a requirement to carry into Phase A's design, not a separate PR.

## 8. Migration Sequence

Unchanged in spirit from the prior proposal, restated against the approved Phase A/B/C structure:

**Phase A — Matter Workspace shell.**
Build the new shell (Top Bar with redesigned search entry point, Matter Navigator, Main Workspace region, collapsed Context Drawer) as an isolated addition, with the Main Workspace initially still able to render existing content (e.g. embedding today's `/matters/[id]` sections or an unmodified `TriPaneChamber`) inside it. Zero data-flow changes. `/dashboard` in its lightweight launch/activity form can also be introduced in this phase, since it has no dependency on the new shell. Fully reversible: deleting the new shell components leaves the app exactly as it is today.

**Phase B — Move existing functionality into the new workspace.**
Wire each Matter Workspace section (Overview, Facts, Parties, Documents, Research, Hearings, Evidence, Timeline, Drafts, Tasks, Notes) to its existing API (§6), replacing `TriPaneChamber`/`evidence`/`draft-builder`/`search`'s mock data section-by-section. AI Assistant moves into the Context Drawer, reusing `handleSendMessage` and `/api/ai/ask` verbatim. Each section can ship as its own isolated PR within this phase rather than one large PR — sequencing left to Phase A's design outcome.

**Phase C — Retire `TriPaneChamber`.**
Once every section has a real home in the Matter Workspace, delete `TriPaneChamber.tsx`, its mock data, and the now-redundant `/dashboard/ai-chamber` route. `/dashboard/evidence`, `/dashboard/draft-builder`, `/dashboard/search` are updated to redirect into the Matter Workspace (or, for `search`, simply corrected to call the real API — it isn't retired, since global cross-matter search remains a legitimate standalone use case).

Each phase leaves the app fully working and production-ready; none requires the next phase to already exist, satisfying the "no big-bang rewrite" instruction.

## 9. Rollback Strategy

- **Phase A** is purely additive (new shell components, new lightweight `/dashboard` content) — rollback is a plain revert of the Phase A PR with no data or route implications, since nothing existing is deleted in this phase.
- **Phase B** changes are per-section and per-PR — each section's migration (e.g. "wire Timeline to `/api/matters/[id]/events`") can be reverted independently without affecting sections already migrated, because every target API already exists and is unchanged; a revert simply restores that one section's prior mock-data rendering path.
- **Phase C** is the only phase that deletes code (`TriPaneChamber.tsx`, `/dashboard/ai-chamber`). It is scheduled last specifically so that rollback of any Phase B section remains possible for as long as `TriPaneChamber` still exists as a reference implementation; Phase C should not begin until Phase B has been in production long enough to confirm no section needs its old path restored.
- No database migration is introduced by any phase, so no rollback here ever requires a data migration rollback — a plain git revert plus redeploy is sufficient at every stage.

## Risks (carried forward, unchanged from the prior proposal)

- Losing `handleSendMessage`'s real AI integration during extraction — mitigated by extracting it as a reusable hook verified by test before any layout change touches it.
- Building a second, overlapping Matter-view surface if the Matter Workspace and `/matters/[id]` aren't explicitly reconciled — this document resolves that risk directly: the Matter Workspace is an extension of `/matters/[id]`'s existing data model, not a parallel surface (§4, §5).
- Scope creep into a full visual re-skin — out of scope per Product Owner instruction; this document only concerns information architecture and data wiring, reusing the existing design system throughout.

---

**No implementation, prototypes, or code changes are included in or authorized by this document.** Awaiting Product Owner approval before Phase A begins.
