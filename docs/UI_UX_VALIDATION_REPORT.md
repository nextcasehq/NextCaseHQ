# Production Validation & UI/UX Audit

Read-only validation of the application as of `main` @ `da424f5` (post PR #103/#104 — SEO/GEO Foundation Sprint + tracker update). No code was changed to produce this report. Screenshots referenced below live in `docs/ui-ux-audit-screenshots/` (uncommitted, per the audit's read-only scope).

## Method

A real local environment was stood up to make this audit evidence-based rather than inferred from source alone: PostgreSQL 16 + pgvector, Redis, `db/schema.sql` migrated, `db/seed.sql` applied, plus additional seed data (a Client, two Matters — one with a full Proceeding/Court Note/Document history, one intentionally empty to check empty-state handling — a Court Note, and a Document). A real session was created via `POST /api/auth/session` against a seeded dev user. Playwright (Chromium) then drove 33 routes × 4 viewports (1920×1080 desktop, 1366×768 laptop, 768×1024 tablet, 390×844 mobile) = 132 page loads, capturing: full-page screenshots, browser console messages, uncaught page errors, failed/4xx+ network responses, and (at desktop viewport) an `axe-core` accessibility scan plus heading-structure/missing-`alt` checks. Raw results: `audit-results.json` (scratchpad, not committed).

**Excluded as non-findings, confirmed and not reported below:** the `eval() is not supported... CSP` console error appearing on every page is React's own dev-mode debugging eval (the message itself states "React will never use eval() in production mode"), a side effect of this app's already-documented, deliberately strict CSP (`known_limitations.static_csp_no_inline_script_protection`, `docs/BUILD_LEDGER.json`) — not a defect. The floating red "N / 1 Issue" badge visible in several screenshots is Next.js's own built-in dev-mode indicator (fixed to the viewport corner, baked into full-page screenshots at scroll position zero) — not application UI, and absent from a production build. No hydration warnings were observed on any page/viewport.

---

## Findings

### 1. Authenticated dashboard shell has no mobile/tablet responsiveness
- **Location:** `apps/web/src/app/dashboard/layout.tsx` + `apps/web/src/components/TriPaneChamber.tsx` — affects every `/dashboard/*` route (`/dashboard`, `/dashboard/cases`, `/dashboard/search`, `/dashboard/evidence`, `/dashboard/draft-builder`, `/dashboard/ai-chamber`, `/dashboard/audit`, `/dashboard/settings`)
- **Severity:** Critical
- **User Impact:** On tablet (768px) and mobile (390px) viewports, the primary logged-in workspace overflows horizontally — the fixed sidebar and multi-column AI Chamber panels are clipped, tab labels overlap and are unreadable, and panel content visually overlaps other panel content. The workspace is effectively unusable below desktop width.
- **Root Cause:** `dashboard/layout.tsx`'s `<aside className="w-64 ... flex-none">` has no responsive breakpoint or collapse pattern (no hamburger/off-canvas drawer) — unlike `TriPaneChamber`'s own internal panels, which do have mobile-aware classes (`hidden md:flex`, a bottom tab bar). The outer shell was never brought in line with the component it wraps.
- **Recommended Fix:** Add an off-canvas/hamburger pattern to `dashboard/layout.tsx`'s sidebar below the `md` breakpoint, mirroring the pattern `TriPaneChamber` already uses internally.
- **Estimated Effort:** Medium (2–3 days) — one shell component, but it's the primary logged-in surface and needs careful cross-viewport regression testing.
- **Screenshot:** `02-dashboard-mobile-fullpage.png`, `03-dashboard-tablet-fullpage.png`

### 2. Home page's new Organization JSON-LD references a nonexistent logo asset (404)
- **Location:** `/` — `components/landing/LandingPageContent.tsx` → `components/seo/JsonLd.tsx` (`Organization` schema `logo` field)
- **Severity:** High
- **User Impact:** Not directly user-visible, but search engines/AI crawlers parsing the Organization structured data (added in PR #103) will fail to resolve the brand logo — undermining the very structured-data quality that sprint was meant to improve. This is a regression introduced by this session's own SEO/GEO Foundation Sprint, not pre-existing.
- **Root Cause:** `JsonLd.tsx` hardcodes `logo: \`${baseUrl}/assets/logo.png\`` — no file exists at `public/assets/logo.png`.
- **Recommended Fix:** Add a real logo asset at `public/assets/logo.png` (e.g., an exported PNG of the existing `Logo.tsx` mark) before search engines next crawl the page.
- **Estimated Effort:** Low (a few hours) — needs a real exported asset, not just a code change.
- **Screenshot:** N/A — network finding; confirmed via dev-server access log (`GET /assets/logo.png 404`) and direct `curl` verification.

### 3. `/api/admin/sentinels` endpoint does not exist — called by both `/admin` and `/system`
- **Location:** `apps/web/src/app/admin/page.tsx:114` (`fetchSentinelStatuses`); same 404 also fires from `/system`
- **Severity:** High
- **User Impact:** The Sentinel/DoD Governance status widget silently never populates on either page — the code checks `res.ok` and fails open, so an operator sees a permanently blank/stale governance-status widget with no visible error, creating a false impression that a check is running when it silently isn't.
- **Root Cause:** Frontend code calls `GET /api/admin/sentinels`, but no such route exists under `apps/web/src/app/api/admin/` (only `session`, `logout`, `health`, `deployment`, `system` do).
- **Recommended Fix:** Either implement the missing endpoint, or replace the dead fetch with an honest "not yet available" state — consistent with this codebase's own established no-fabricated-data convention (e.g., the Matter Workspace's honest "Not yet available" panels).
- **Estimated Effort:** Medium if building the real endpoint; Low if only honestizing the missing-data state.
- **Screenshot:** N/A — network finding; confirmed via dev-server logs (`GET /api/admin/sentinels 404`) on both pages.

### 4. Nested/duplicate `<main>` landmark on nearly every page
- **Location:** Sitewide — `apps/web/src/app/layout.tsx` (`<main>{children}</main>`) combined with almost every individual page's own `<main className="...">` wrapper. Confirmed on: `/about`, `/contact`, `/features`, `/pricing`, `/solutions`, `/resources`, `/privacy`, `/terms`, `/search`, `/dashboard` and 6 sibling `/dashboard/*` routes, `/matters`, both seeded `/matters/[id]` pages, `/cases`, `/cases/[id]`, `/cases/[id]/court-note`, `/documents/new`, `/documents/[id]`, `/docs`, `/admin` — 26 pages total.
- **Severity:** High
- **User Impact:** Screen-reader users navigating by landmark ("skip to main content") land on two nested `<main>` regions on almost every page — most assistive technology announces this ambiguously or skips it, defeating the purpose of the landmark.
- **Root Cause:** The root layout wraps all children in one real `<main>`; nearly every page-level component independently wraps its own content in a second `<main>`, unaware the outer one already exists.
- **Recommended Fix:** Standardize on one location for the `<main>` landmark — most likely, convert each page's own `<main className="...">` wrapper to a non-landmark element (e.g. `<div>`) and keep the styling, since the root layout already supplies the single real landmark.
- **Estimated Effort:** Medium — mechanical but touches 20+ files; needs a regression-safe rollout (visual classes must move to the replacement tag, not be dropped).
- **Screenshot:** N/A — structural/DOM finding; confirmed via `axe-core` (`landmark-main-is-top-level`, `landmark-no-duplicate-main`, `landmark-unique`).

### 5. Color contrast violations across nearly every page
- **Location:** Sitewide. Heaviest concentration: `/admin` (47 flagged nodes), `/cases/[id]` (24 nodes), home page (20 nodes); also present on every `/dashboard/*` route (~10 nodes each) and most marketing pages.
- **Severity:** High (`axe-core` rates this rule "serious")
- **User Impact:** Text/UI elements below WCAG AA contrast thresholds are hard to read for low-vision users and in bright-light mobile conditions.
- **Root Cause:** Not diagnosed to the individual color-token level in this read-only pass; the same violation recurring across otherwise-unrelated pages strongly suggests a small number of shared, muted-gold-on-cream utility classes/tokens are the repeat offenders, not isolated one-off mistakes.
- **Recommended Fix:** Run a dedicated contrast audit identifying the specific recurring token pairings (candidates: the `#B0A588`/`#8A7A56`-style muted label colors used throughout the brand palette) and adjust the lighter/muted shades to meet 4.5:1 for body text.
- **Estimated Effort:** Medium — likely a small number of shared tokens, but verifying every affected page afterward is nontrivial.
- **Screenshot:** N/A — best represented by the raw `axe-core` violation data in `audit-results.json`, not a single visual crop.

### 6. Critical-severity missing form labels / accessible names
- **Location:** `/dashboard/evidence` (a `<select>` with no accessible name), `/dashboard/draft-builder` and `/dashboard/settings` (form elements with no associated `<label>`)
- **Severity:** High (`axe-core` rates both rules "critical")
- **User Impact:** Screen-reader users cannot determine what these specific form controls are for — a blocking failure on real interactive controls, not just informational content.
- **Root Cause:** Not diagnosed to the specific JSX in this read-only pass; `axe-core` flags 2–3 nodes per page, suggesting a small, localized fix once the exact elements are found.
- **Recommended Fix:** Add `aria-label` or `<label htmlFor>` to the flagged controls.
- **Estimated Effort:** Low — small, targeted fix once located.
- **Screenshot:** N/A — structural finding.

### 7. Heading hierarchy issues — missing or skipped levels
- **Location:** Zero `<h1>` despite a visually prominent title: `/login` ("Enterprise Sign In" — see screenshot), `/dashboard`, `/dashboard/ai-chamber`, `/system`. Skipped heading level (e.g. h1 → h3): `/features`, `/pricing`, `/solutions`, `/resources`, `/privacy`, `/matters`, both `/matters/[id]` pages, `/cases`, `/cases/[id]`, `/dashboard/cases`, `/dashboard/settings`, `/docs`, `/admin` — 18 pages total.
- **Severity:** Medium
- **User Impact:** Screen-reader users relying on heading navigation to jump between page sections get a broken or entirely absent outline.
- **Root Cause:** Visual titles styled to look like headings (bold, large text) without a corresponding real `<h1>`/correctly sequential heading tag underneath.
- **Recommended Fix:** Audit each flagged page's title element and correct it to a real, sequential heading tag.
- **Estimated Effort:** Low per page; Medium in aggregate across 18 pages.
- **Screenshot:** `04-login-desktop.png` — "Enterprise Sign In" renders as a styled title with no real `<h1>` behind it.

### 8. No favicon configured anywhere in the app
- **Location:** Sitewide — no `app/icon.*`, no `app/favicon.ico`, no `public/favicon.ico`; root `layout.tsx`'s metadata has no `icons` field.
- **Severity:** Medium
- **User Impact:** Every browser tab shows a generic/blank icon; every single page load fires a wasted `/favicon.ico` request that 404s.
- **Root Cause:** A favicon was never added via Next.js's file-based convention.
- **Recommended Fix:** Add `app/icon.png` (or `public/favicon.ico` plus a metadata `icons` entry) using the existing `Logo.tsx` mark.
- **Estimated Effort:** Low.
- **Screenshot:** N/A — network finding (confirmed via repeated `GET /favicon.ico 404` across every page load).

### 9. `<dl>` structure violation on the home page
- **Location:** `/` — most likely `components/landing/sections/Security.tsx`'s `POINTS` list (a `<dl>` wrapping `<div>` pairs of `<dt>`/`<dd>`)
- **Severity:** Low (`axe-core` rates the rule "serious," but scope is narrow — 1–6 nodes, one section, one page)
- **User Impact:** Minor — screen readers may not announce the term/definition relationship correctly for this one section.
- **Root Cause:** Not fully diagnosed to the exact DOM shape in this read-only pass.
- **Recommended Fix:** Verify the flagged structure against the `<dl>` spec (only `<dt>`/`<dd>`/`<div>`/`<script>`/`<template>` may be direct children) and correct, or replace with a non-`<dl>` layout if the content isn't truly a term/definition list.
- **Estimated Effort:** Low.
- **Screenshot:** N/A.

---

## Positive Observations (for balance)

- **Empty states are well-handled.** The intentionally-empty Advisory Matter (no Proceedings/Court Notes/Documents) renders clear, on-brand messaging — "No Court Notes recorded yet for this matter," "No pending actions" — never a blank gap or fabricated placeholder data, consistent with this codebase's established discipline. See `06-matter-empty-state-mobile-fullpage.png`.
- **Auth flow works correctly end-to-end** against a real Postgres instance — login, session cookie, and RLS-scoped data access all verified.
- **`/documents/new`'s multi-step form** (`08-documents-new-mobile.png`) is clean, clearly labeled, and responsive on mobile.
- **The Matter detail page** (`05-matter-detail-mobile-fullpage.png`) adapts well to mobile — single-column, clear visual hierarchy, no overflow — a useful reference for fixing Finding #1.
- No broken internal links found via crawl; no uncaught JS exceptions (`pageerror`) on any page/viewport; no hydration warnings observed anywhere; no failed/timed-out network requests beyond the two 404s in Findings #2–3.

---

## Scope Note

Per the Product Owner's instruction, this is a read-only report — **no code, styling, or configuration was changed** to produce it. All 9 findings above are documented only; none have been fixed. Awaiting Product Owner approval before any implementation begins.
