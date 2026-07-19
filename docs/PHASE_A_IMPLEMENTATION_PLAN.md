# Phase A Implementation Plan — Matter Workspace Shell

Read-only planning deliverable per Product Owner direction, following approval of `docs/MATTER_WORKSPACE_DEPENDENCY_MAP.md` (PR #113) and the final routing decision (Matter Workspace lives under `/matters/[id]`; `/dashboard` becomes a lightweight launch page). **No code changes, no prototypes.** This document is the concrete Phase A plan the Product Owner must approve before implementation begins.

## New Fact Established During Planning

`/matters/[id]/page.tsx` and `/matters/page.tsx` currently have **no shared authenticated shell at all** — no sidebar, no off-canvas nav, nothing from `dashboard/layout.tsx`. They are standalone pages under the root `layout.tsx` only, and `components/NavbarWrapper.tsx` currently renders the **public marketing `Navbar`** on both routes (its hide-list is `['/login', '/organization']` plus `/dashboard`, `/admin`, `/system` prefixes — `/matters` is not in it).

This means Phase A is not "add a drawer to an existing shell" — it is "give `/matters/[id]` a shell for the first time," reusing UX-1's off-canvas mechanism rather than `/dashboard`'s literal component. This is now reflected in the file list below.

## Files to Modify

| File | Change | Risk |
|---|---|---|
| `components/NavbarWrapper.tsx` | Add `/matters` to the hide-list (prefix match, matching the existing `/dashboard`/`/admin`/`/system` pattern) so the public marketing Navbar no longer renders on Matter Workspace routes. | Low — one-line, additive condition, no existing route's behavior changes. |
| `apps/web/src/app/matters/page.tsx` | No structural change in Phase A. Continues to render the Matter List exactly as it does today; only affected indirectly by the Navbar removal (loses the marketing nav, gains nothing yet — Phase A does not add the new shell here, only to `/matters/[id]`, per the routing decision's explicit scope: "Matter Workspace" is the `[id]` page, `/matters` is the list). | Low — visual only (one fewer nav bar), reversible by reverting the `NavbarWrapper.tsx` change. |
| `apps/web/src/app/matters/[id]/page.tsx` | Wrap existing content in the new Top Bar / Matter Navigator / Main Workspace / Context Drawer shell. **All 9 existing data-fetching sections (Matter Health, Prepare for Hearing, Recent Court Note, Pending Actions, Matter Overview/Edit, Proceedings, Matter Timeline, Documents, Team) are relocated into the new shell's regions, not rewritten** — same `fetch` calls, same state, same handlers, only their container changes. Matter Navigator surfaces section links (Overview, Facts, Parties, Documents, Timeline — reusing the Health/Overview/Team data already fetched here); Context Drawer starts collapsed and initially empty (Citations/AI/Related Cases wiring is Phase B, not Phase A). Main Workspace's default (no active task) state reserves the search bar + Action Card zone described below — non-functional/placeholder in Phase A, per the Mock Data Policy (no new UI built around fabricated results). | Medium — largest diff of Phase A, but zero data-flow change; risk is layout/CSS regression, not logic regression. |
| `apps/web/src/app/dashboard/layout.tsx` | Not modified in Phase A. Its off-canvas mechanism is read and replicated (same hook pattern: `isMobileNavOpen` state, Escape-key handler, `translate-x` transform, backdrop) into the new `matters/layout.tsx` below — copied, not imported, since the two shells' nav content differs enough that a shared abstraction is a Phase A non-goal (avoid coupling `/dashboard`'s launch-page shell to `/matters`' workspace shell before both are proven). | None — file untouched. |

## Files to Add

| File | Purpose |
|---|---|
| `apps/web/src/app/matters/layout.tsx` (new) | The Matter Workspace shell: Top Bar (redesigned search entry point per `MATTER_WORKSPACE_DEPENDENCY_MAP.md` §7, Matter switcher placeholder, notifications, user menu — notification bell/drawer content reused verbatim from `dashboard/layout.tsx`), Matter Navigator (off-canvas <lg, static ≥lg, reusing UX-1's exact mechanism), and a collapsed-by-default Context Drawer toggle (structure only — empty state in Phase A, populated in Phase B). Wraps both `/matters` and `/matters/[id]`, consistent with Next.js layout nesting; `/matters` (the list) renders inside it with just the Top Bar relevant, no Matter Navigator (no active Matter to scope it to) until a specific Matter is opened. |

## Files to Retire

**None in Phase A.** Per the Mock Data Policy, Phase A must still retire at least one mock implementation — this is satisfied by making **`TriPaneChamber`'s continued existence explicitly provisional**, not by deleting anything yet:

- `apps/web/src/app/dashboard/page.tsx` and `dashboard/ai-chamber/page.tsx` are updated in Phase A to stop being the primary workspace entry points (per the routing decision) — they become the lightweight launch/activity page (recent matters, quick search, notifications), and **`TriPaneChamber` is no longer mounted by default on first authenticated load**. This is the Phase A mock-retirement: `TriPaneChamber`'s mock-data surface goes from "the first thing every advocate sees" to "no longer reachable from the primary navigation path," even though the component and route are not yet deleted (full deletion is Phase C, once its content has real homes per the Dependency Map §8).
- `TriPaneChamber.tsx` itself, `dashboard/evidence/page.tsx`, `dashboard/draft-builder/page.tsx`, and `dashboard/search/page.tsx`'s mock array are **not touched** in Phase A — their retirement is Phase B (connect to real APIs) and Phase C (delete), per the priority order the Product Owner set. Attempting any of that in Phase A would violate "one isolated PR."

## APIs Reused (no new endpoint, no schema change)

All from the existing surface already documented in `MATTER_WORKSPACE_DEPENDENCY_MAP.md` §6 — Phase A wires no new section to them beyond what `/matters/[id]/page.tsx` already calls today:

`GET /api/matters/[id]`, `GET /api/matters/[id]/participants`, `GET /api/matters/[id]/court-notes`, `GET /api/matters/[id]/events`, `GET /api/matters/[id]/tasks`, `GET /api/matters/[id]/preparation`, `GET /api/matters/[id]/health`, `GET /api/documents?matter_id=`, `GET /api/cases?matter_id=`.

Phase A's job is purely to re-house calls that already exist; it introduces zero new fetch calls.

## Mock Code Removed in This Phase

- `TriPaneChamber` demoted from default authenticated landing surface to a still-reachable-but-no-longer-primary route (see "Files to Retire" above) — satisfies "every implementation phase must retire at least one mock implementation" without requiring the higher-risk work of rewiring or deleting its internals in the same PR as a shell rebuild.
- No mock data structures are deleted from the codebase yet in Phase A — that is Phase B/C, once each mock section has a confirmed real replacement wired in its new home.

## Rollback Plan

- **`components/NavbarWrapper.tsx`**: one-line revert restores the marketing Navbar on `/matters/*`; no data or state implications.
- **`apps/web/src/app/matters/layout.tsx`**: new file — rollback is deletion of the file plus reverting `matters/[id]/page.tsx`'s wrapping changes; since no data fetching changes, this is a pure UI revert.
- **`apps/web/src/app/matters/[id]/page.tsx`**: every existing `fetch` call, state hook, and handler is preserved unchanged; only JSX nesting/layout classes change. A revert is a straightforward `git revert` of the Phase A commit with no follow-on cleanup (no new tables, no new API contracts to also unwind).
- **`dashboard/page.tsx` / `dashboard/ai-chamber/page.tsx`**: reverting restores `TriPaneChamber` as the default `/dashboard` view exactly as it exists today — the component itself is never modified in Phase A, so this revert has zero risk of losing work.
- No database migration, no new environment variable, and no API contract change occurs in Phase A, so rollback never requires anything beyond a code revert and redeploy.

## Search Experience & Action Cards — Design Requirements for the Main Workspace

Per Product Owner direction, these are design requirements the Phase A shell must accommodate structurally, not functionality to build now. Both extend `MATTER_WORKSPACE_DEPENDENCY_MAP.md` §7 (Search Experience) with further detail and add a new element (Action Cards) to the Main Workspace's default state.

### Search Experience ("Command Center")

Google's search-first minimalism is the inspiration, not the UI to copy — this is a legal-research search, not a general web search:

- Large, distraction-free search field is the primary visual focus of the Matter Workspace's default (no active task) state.
- No traditional "Search" button — a subtle arrow/send icon inside the field, right-aligned.
- Enter or arrow-click both submit, matching the existing `dashboard/search/page.tsx` form's `onSubmit` semantics (§7 of the dependency map already specifies pointing this at the real `GET /api/search`).
- Generous whitespace around the field; sized for long legal queries, not a short keyword box.
- Placeholder text establishes the box's scope to the user, e.g. *"Search cases, Acts, Sections, judgments, or ask AI about your matter..."*
- **Future-ready, not built now**: the field's markup/component boundary must not preclude later additions — natural-language research, AI assistant, matter/document/citation search, Act & Section lookup, voice input, document upload, OCR search, saved searches, search history. None of these are implemented in Phase A or authorized by this document; the requirement is only that Phase A's component structure doesn't force a rebuild to add them later (consistent with `/api/search`'s existing `type`/provider-registry design already anticipating this).

### Action Cards

Compact quick-action affordances beneath the search bar, above the main content area, to reduce clicks to the Matter's most common next actions:

- Examples: Ask AI, Search Case Law, Search Acts & Sections, Upload Documents, Draft Petition/Notice/Written Statement, Summarize Documents, Compare Judgments, Build Case Timeline, Hearing Preparation, Evidence Review, Research History.
- Cards are **quick actions, not a navigation menu** — distinct from the Matter Navigator's section links.
- Show only the 4–6 most relevant cards at a time; adapt to the current Matter and the user's workflow; prioritize frequently used actions.
- Compact, unobtrusive — recede once the user starts working (e.g. once a document is open or an AI conversation is underway), consistent with the reading-first principle already established in `DASHBOARD_WORKSPACE_ARCHITECTURE.md` §7.

### Intelligent Action Cards

Cards are context-aware workflow accelerators, not static shortcuts — the set shown depends on the Matter's workflow stage, not a fixed list:

- Prioritization inputs: Matter status, current user activity, recent history, workflow stage.
- Illustrative stage-based sets (still only 4–6 shown at a time):
  - **New Matter**: Upload Documents, Add Parties, Ask AI, Search Case Law.
  - **Research Stage**: Related Judgments, Search Acts, Search Sections, Compare Cases.
  - **Drafting Stage**: Draft Petition, Draft Notice, AI Review, Export Draft.
  - **Hearing Stage**: Hearing Preparation, Evidence Bundle, Timeline, Oral Arguments.
- Cards remain workflow accelerators, never a second navigation system — the Matter Navigator stays the single place for Matter section navigation.
- Once meaningful work begins, cards become secondary so the reading workspace stays dominant (same recede-on-engagement behavior as the non-intelligent version above, now driven by workflow stage rather than only "a document is open").

**Phase A scope**: identical to the base Action Cards scope above — reserve the layout region and component boundary only. Determining workflow stage, matching it to a card set, and reprioritizing by recent history is real product logic (Matter-status inference, activity tracking) and is explicitly **Phase B or later**, not Phase A. Phase A's placeholder may show a fixed illustrative set (e.g. the New Matter set) without any stage-detection logic behind it.

### Reading Experience (governing principle)

The central Main Workspace must never feel like a dashboard — its purpose is reading, research, drafting, reviewing, and comparing authorities; every other element (Matter Navigator, Context Drawer, search bar, Action Cards) supports that experience rather than competing with it. Where a future addition (a widget, a card, a panel) would conflict with reading clarity, reading clarity wins. This principle governs every subsequent phase's design decisions, not just Phase A's shell.

**Phase A scope**: no code implication beyond what's already planned above — recorded here as the standing design principle that Phase A's shell (and every later phase) must be judged against.

## Validation Strategy

1. **Typecheck, lint, production build** — standard gate, matching every prior milestone in this engagement.
2. **Focused Playwright regression** across `/matters`, `/matters/[id]` (with at least one Matter that has Proceedings/Documents/Events/Tasks data, and one with none, to exercise both populated and empty states) at 4 viewports (mobile/tablet/desktop/wide), verifying:
   - Every one of the 9 existing data sections still renders its real data unchanged.
   - The new Matter Navigator's off-canvas open/close/Escape/backdrop behavior matches UX-1's already-verified behavior (reusing the same test approach that caught the `isVisible()`/transform false-negative during UX-1 — checking `boundingBox()` position, not just `isVisible()`).
   - The Context Drawer toggle opens/closes to an empty placeholder state without erroring (content wiring is Phase B).
   - `/dashboard` renders the new lightweight launch page, not `TriPaneChamber`, on first load.
   - `/dashboard/ai-chamber` still renders `TriPaneChamber` unchanged (not yet retired) for any user who navigates there directly.
3. **axe-core accessibility scan** on `/matters`, `/matters/[id]`, and the new `/dashboard` launch page, at minimum re-running the `color-contrast` and landmark-uniqueness checks established in UX-2, since a new shell risks reintroducing a nested `<main>` or contrast regression if not built carefully against that baseline.
4. **Manual keyboard-navigation pass**: Tab order through Top Bar → Matter Navigator → Main Workspace → Context Drawer toggle, matching the keyboard-accessibility bar already set in UX-2.
5. **No backend test changes expected** — since no API route changes, the existing Jest suite for `/api/matters/*` and `/api/documents/*` should show zero delta; confirmed via the same before/after count comparison method used throughout this engagement (UX-2's `git stash` baseline-diff technique) to prove Phase A introduces no regression.

---

**No implementation, prototypes, or code changes are included in or authorized by this document.** Awaiting Product Owner approval before Phase A begins.
