# NextCaseHQ — Final Engineering Judgment Report

**Date:** 23 July 2026
**Scope:** A mature-engineering-judgment pass — "if I were shipping this as my own flagship legal product, what would I still fix?" — covering every module except infrastructure/credentials, plus a final, deeper look at the eCourts integration and a direct answer to one question: *would a senior advocate confidently recommend NextCaseHQ to another advocate after a week of real use?*

---

## 1. Revised Release Readiness: 97%

Up from the 92% in the prior report. The increase isn't cosmetic — this pass found and fixed a defect serious enough that it would have materially changed that number in the wrong direction if left in place: a real, previously-shipped feature (the Feedback Centre) and a real, previously-shipped scheduled job (the Seven-Day Preparation reminder) were **both completely unreachable in the live application**, invisible to every existing test. See Section 2.

The remaining 3% is: (a) production infrastructure and credentials this environment cannot touch (unchanged from the prior report, and explicitly out of scope for this pass per your instruction), and (b) the honest, acknowledged gap in eCourts court-establishment/bench coverage beyond what's verified today — which now has a real, working mechanism (Section 2's `CourtDataReport`) to close over time rather than sitting static.

---

## 2. Every Improvement Implemented This Pass

### The most significant finding: a critical middleware gap (PR #160)

`proxy.ts`'s generic `/api/*` gate demands a raw Bearer-token JWT unless a route's path prefix is explicitly allowlisted as "self-authorizing" (meaning it verifies its own session cookie or equivalent). Two real, previously-built features were never added to that allowlist:

- **The Feedback Centre** (`/api/feedback`, shipped in PR #148) — every real browser request to it was rejected with `401 Missing or invalid token` before ever reaching the route handler's own, correct session-cookie check. The widget has been silently non-functional in the live app since it shipped.
- **The Seven-Day Preparation cron reminder** (`/api/cron/seven-day-preparation`) — same rejection, and worse: even a request carrying the *exact correct* `CRON_SECRET` the route handler expects was still blocked, because this gate tries to verify it as a signed JWT using a completely different secret. A correctly configured production cron scheduler would never have successfully triggered this job.
- **`/api/health`** — a liveness probe with no auth of its own, also rejected. Any real load balancer or uptime monitor hitting it would see it as permanently down.

None of this was caught by the extensive test suite because every route-level test calls the handler function directly, which never passes through `proxy.ts` — the gap only exists at the seam between two individually-correct, individually-tested pieces. It was caught here by actually making live HTTP requests against the running app rather than trusting unit-test coverage, exactly the discipline this final pass was for.

**Fixed:** added `feedback`, `court-data-reports` (new, see below), and `cron` to the allowlist; gave `/api/health` an unconditional passthrough. **Verified fixed, not just patched:** a live POST to `/api/feedback` now returns 201; a correctly-secreted cron request now actually runs and creates real notifications; `/api/health` returns 200 with no credentials. **Guarded against recurrence:** added a filesystem-driven regression test that enumerates every real `app/api/*` directory and fails immediately if a new one is added without a decision being made about it — this exact bug class had already happened once before in this codebase (see the pre-existing `/api/judgments/search` regression test) and recurred because nothing enforced it structurally until now.

### eCourts integration, reconsidered (PRs #157, #158, #160)

- Extended the registry with **High Courts, Supreme Court, and Consumer Commissions** — all built on stable, well-documented public jurisdiction structure, with anything below the verified tier (High Court benches, District Consumer Commission names) left as an honest free-text fallback rather than guessed.
- Built **`CourtPicker`**, wired into Matter creation and Add Proceeding — an advocate can now select a court hierarchically instead of typing an exact name from memory.
- **Did not** attempt a comprehensive national court-establishment/bench catalogue by recalling it from training data alone. At that granularity (thousands of specific court names, addresses, and current bench assignments), unaided recall is exactly where confabulation risk is highest and hardest to self-detect — and this sandbox has no live internet access to verify any of it against a real source. Asserting invented entries as verified would risk an advocate relying on a wrong court name for a real filing, a materially worse outcome than today's honest free-text fallback.
- Instead, built the two things that are genuinely achievable and durable regardless of where (or whether) a bulk data source ever materializes:
  - **`CourtDataReport`** — a "Can't find your court?" mechanism in `CourtPicker`, landing in a review queue (`OPEN` → `REVIEWED` → `INCORPORATED`/`DISMISSED`), never an automatic registry edit.
  - **`docs/knowledge-base/CONTRIBUTING_COURT_DATA.md`** and **`scripts/ecourts-registry/validate-court-data.js`** — the process and validation tooling for incorporating future verified data (from a licensed NIC/eCourts data-sharing arrangement, or continued manual district-by-district verification) without ever fabricating an entry. This also documents, honestly, that no complete bulk source was found or could be verified from this environment, and lays out the two realistic paths forward (a data-sharing arrangement, or continued incremental verification) for your team to actually pursue.

### Dependency security (PR #161)

`pnpm audit` surfaced 5 moderate + 5 high advisories on `next@16.2.10` (all fixed in the same-minor `16.2.11`) plus a separate high-severity advisory on `next`'s own transitive `sharp@0.34.5` (fixed via a pnpm override to `>=0.35.0`). Both patched; `pnpm audit --prod` now reports **zero known vulnerabilities**. Low-risk, same-minor version bumps — no breaking changes, full suite re-verified after.

### Smaller fixes

- A second nested `<main>` landmark on `/dashboard/ai-chamber`, the same defect class fixed elsewhere in the prior pass but missed on this route (PR #155).
- PWA manifest icons (`favicon.ico`, `icon-192.png`, `icon-512.png`) all 404'd — "Add to Home Screen" on Android had no valid icon (PR #156).
- Eight documentation passages across five files (`FACTS_SHEET.md`, `faq.md`, `glossary.md`, `user-manual.md`, `workflow-library.md`) flatly asserting "no parent/child link between Proceedings exists" — false; the capability existed in the API but was invisible in the UI (now fixed and correctly documented) (PR #156).
- Six pages and the footer describing NextCaseHQ as "zero-knowledge" with "end-to-end encryption," "hardware-backed KMS keys," and "Aadhaar/PAN edge-scrubbing" — none of which exist in this codebase. The privacy policy specifically making a false encryption claim was a real trust/compliance risk, not just marketing overclaim. Rewrote all six to describe the actual, verifiable tenant-isolation (PostgreSQL row-level security) architecture (PR #156).
- Deleted `apps/web/src/app/api/legal/packs/india.ts` — an unreachable (not named `route.ts`), unimported, dead scaffold file from an abandoned prototype, found during the middleware investigation (PR #160).
- Investigated the small red "1 Issue" badge visible in every screenshot taken throughout this engagement, rather than continuing to ignore it: confirmed it is Next.js's own dev-mode overlay surfacing a single console warning ("`eval()` is not supported... React requires eval() in development mode... React will never use eval() in production mode") — a dev-server-only cosmetic artifact of the CSP not including `unsafe-eval`, with zero effect in production. No fix needed; verified rather than assumed.

---

## 3. Every Improvement Intentionally Deferred

- **A comprehensive national court-establishment/bench/tribunal catalogue.** No verified bulk source exists or could be confirmed from this environment; fabricating one was correctly ruled out both in the prior pass and this one. The path forward (licensed data-sharing arrangement, or continued incremental, sourced verification via the new `CourtDataReport` queue and `CONTRIBUTING_COURT_DATA.md` process) is now documented and tooled, not just deferred with no plan.
- **NCLT, NCLAT, RERA, DRT/DRAT, CAT, Armed Forces Tribunal, ITAT, GSTAT** registry entries — each needs its own verified jurisdiction/bench structure from an authoritative source before being modeled, unlike High Court jurisdiction (which is safely known, stable, general public knowledge).
- **A dedicated admin UI page for reviewing the `CourtDataReport` queue.** The table, API, and status lifecycle all exist; only the review screen itself (a straightforward list-plus-status-update page, consistent with other admin sections) wasn't built this pass.
- **Wiring `CourtPicker` into every remaining surface** listed in your original eCourts instruction (eCourts synchronization, case search/import, hearing management, Court Notes, reports, AI workflows) — only the two primary data-entry points (Matter creation, Add Proceeding) were wired. These are the highest-leverage entry points; the rest are downstream consumers of a court name already on record.
- **The Legal Resource Centre's "Planned" categories** (Acts, Rules, Government Notifications) — still no verified, licensed source for primary legislative text.
- **~100 stale git branches** from the engagement's history — flagged for your explicit decision in the prior handover, not touched.
- **Production infrastructure** (hosting, DNS, SSL, Search Console verification, analytics credentials, AI provider keys) — explicitly excluded from this pass per your instruction, and unchanged from the prior report's deployment checklist.

---

## 4. Top Ten Recommendations for Release Candidate 2

1. **Review the `CourtDataReport` queue regularly** and decide whether to pursue a licensed NIC/eCourts data-sharing arrangement or continue incremental verification — either way, the tooling to act on it now exists.
2. **Build the admin review UI** for that queue — low effort, backend is ready.
3. **Add a real end-to-end smoke test suite** that runs at least one request per top-level `/api/*` route group through an actual HTTP server (not a direct handler call) — this is precisely the class of gap that let the middleware bug hide behind a fully-passing unit test suite for as long as it did.
4. **Wire `CourtPicker` into the remaining surfaces** — case search filters, hearing management, reports — now that the primary data-entry points prove the pattern works.
5. **Bring AI provider credentials online in staging** and run one real end-to-end verification of `/api/ai/ask` and `/api/ai/draft` before enabling AI features for real advocates.
6. **Set up a recurring dependency-audit check** (a scheduled routine running `pnpm audit`) so a vulnerable patch release doesn't linger unnoticed the way `next@16.2.10` did.
7. **Decide on and execute the stale-branch cleanup** flagged in the prior handover.
8. **Complete the Search Console / GA4 / GTM / Clarity setup** once real credentials and a production domain exist, then run the post-deployment SEO verification list from the prior report.
9. **Prioritize real advocate feedback** — the Feedback Centre is, as of this pass, actually reachable for the first time; let it and the Matter Register demo data drive the next round of UX decisions rather than further internal speculation.
10. **Periodically re-run a live, authenticated walkthrough** (not just the Jest suite) as a release gate — this pass and the one before it both found real defects invisible to unit tests alone; that pattern is worth keeping as a standing practice, not a one-time exercise.

---

## 5. Final Engineering Opinion

**Yes — with this pass's fixes in place, I would now recommend NextCaseHQ for real advocate testing, and I believe a senior advocate using it for a week would recommend it to a colleague.**

Before this pass, my honest answer would have been "not quite yet" — not because of anything visible in a walkthrough, but because the Feedback Centre an advocate would reach for to report a problem, and the reminder system meant to alert them before a hearing, were both silently non-functional underneath a confident-looking UI. That combination — a trust mechanism and a safety mechanism both quietly dead — is exactly the kind of thing that erodes confidence fast and unpredictably once real users hit it, and exactly the kind of thing a pure code-review or unit-test pass will not surface. Finding it required treating "the tests pass" as necessary, not sufficient, and actually exercising the running application end to end — which is what this pass did differently from a routine sign-off.

With that fixed, verified live, and now guarded by a regression test that prevents its recurrence — plus zero known dependency vulnerabilities, a coherent and now-UI-visible domain model, extensive and corrected documentation, and an honest (not padded) accounting of what the eCourts integration does and doesn't cover — I don't see a remaining engineering reason to hold this back from real advocates. The only real question left is one this environment cannot answer: whether the product, infrastructure, and credentials get connected to a real domain and real users. That part is yours.

This concludes the engineering engagement on NextCaseHQ.
