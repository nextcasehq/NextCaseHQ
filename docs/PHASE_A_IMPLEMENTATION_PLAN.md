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
| `apps/web/src/app/matters/[id]/page.tsx` | Wrap existing content in the new Top Bar / Matter Navigator / Main Workspace / Context Drawer shell. **All 9 existing data-fetching sections (Matter Health, Prepare for Hearing, Recent Court Note, Pending Actions, Matter Overview/Edit, Proceedings, Matter Timeline, Documents, Team) are relocated into the new shell's regions, not rewritten** — same `fetch` calls, same state, same handlers, only their container changes. Matter Navigator surfaces section links (Overview, Facts, Parties, Documents, Timeline — reusing the Health/Overview/Team data already fetched here); Context Drawer starts collapsed and initially empty (Citations/AI/Related Cases wiring is Phase B, not Phase A). | Medium — largest diff of Phase A, but zero data-flow change; risk is layout/CSS regression, not logic regression. |
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
