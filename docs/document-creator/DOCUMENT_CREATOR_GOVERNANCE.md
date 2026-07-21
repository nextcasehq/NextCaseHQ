# Document Creator Governance

Status: **Approved, Phase 0 — Governance Document**
Scope: Process rules for every Document Creator milestone from Phase 1 onward. Subordinate to `DOCUMENT_CREATOR_CONSTITUTION.md`.

## 1. One Milestone Per Branch, One Milestone Per PR

Each phase in `DOCUMENT_CREATOR_IMPLEMENTATION_ROADMAP.md` is implemented on its own branch and lands as its own pull request. A branch never carries work from two phases. A PR description states which single phase it implements; if the diff contains anything outside that phase's declared scope, the diff is wrong, not the rule.

## 2. No Unrelated Refactoring

A Document Creator PR touches the files its phase's scope requires and nothing else. Renaming a variable, reformatting a file, or "cleaning up while I'm here" in a file outside scope is deferred to its own change, proposed separately. This mirrors the standing project-wide discipline already enforced across every milestone in this repository.

## 3. No Unapproved Dependencies

No new npm package, external service, or SaaS dependency is added to the Document Creator without it being named and justified in the phase's own spec document and approved by the Product Owner before implementation begins. This includes queue libraries, worker orchestration platforms, and third-party AI SDKs beyond the already-approved OpenAI/Anthropic providers in `lib/ai/providers/`.

## 4. Reuse Existing Architecture

Before writing new infrastructure, a phase's implementer must consult `DOCUMENT_CREATOR_ARCHITECTURE_DECISION_RECORD.md` and reuse what already exists (PostgreSQL via `DatabaseClient`, Redis via `getRedisClient()`, object storage via `lib/storage/object-storage.ts`, the AI provider abstraction, the Matter Register context gateway, the real `TenantWallet`/`WalletTransactionRecord` tables, tenant isolation via RLS, session auth, audit tables). New infrastructure is justified only when the ADR identifies a real, named gap — never by default.

## 5. Forensic Root-Cause Analysis Before Fixes

When a Document Creator milestone is fixing a defect rather than adding new capability, the defect must be reproduced and its root cause identified before any code changes, exactly as practiced in the Phase 1 functional-recovery milestone (PR #138): reproduce first, diagnose the exact mechanism, apply the smallest fix that addresses that mechanism, then re-verify the original reproduction no longer occurs.

## 6. No Mock Data Presented as Production

Any UI state, API response, or document content that is synthetic, simulated, or demo-only must be labeled as such in the UI and never returned from a route that a real, authenticated tenant session can reach. This extends the existing Product Review Mode convention (`lib/beta/demo-data.ts`) — demo data is a fenced-off, explicitly-flagged mode, never blended into the real code path silently.

## 7. Mandatory Security and Validation Gates

Every Document Creator PR runs, and reports the results of:

- The focused tests for its own phase
- The full Jest suite
- Typecheck (`pnpm -w run typecheck`)
- A production build (`pnpm run build`)
- A browser-console check on the phase's own UI surface (no new console errors)
- A horizontal-overflow check at desktop/tablet/mobile
- A security review of any new API route: tenant identity resolved server-side only, input validated, rate limits applied where the spec requires them, no secrets/prompts/storage-paths leaked in errors or logs

No phase merges with a gate skipped. If a gate cannot be run (e.g., no object storage provisioned in the local environment), the PR states that explicitly as a blocker rather than silently omitting the check.

## 8. Product Owner Approval Before Merging

Every Document Creator PR is opened and left **open and unmerged** until the Product Owner explicitly approves it, exactly as practiced for PRs #137 and #138. A PR reporting its own validation results is not self-approval.

## 9. Rollback Requirements

Every phase that adds a database migration documents, in its own spec, how to reverse that migration safely (a `DOWN` script or explicit manual steps) and what happens to in-flight data (queued jobs, in-progress drafts) if the phase is rolled back mid-flight. A phase that cannot be rolled back without data loss must say so explicitly and get Product Owner sign-off on that risk before merging.

## 10. Architecture-Deviation Approval Process

If implementing a phase reveals that a Phase 0 specification is wrong, incomplete, or in conflict with the Constitution, the implementer:

1. Stops implementation on the conflicting part.
2. Documents the conflict: which rule or spec, what the code needs to do instead, why.
3. Raises it to the Product Owner as an explicit decision point (see `DOCUMENT_CREATOR_ARCHITECTURE_DECISION_RECORD.md` for the running log of such decisions) — never resolves it by quietly deviating from the written spec.
4. Once approved, updates the relevant Phase 0 document in the same PR (or a preceding documentation-only PR) so the spec and the code never diverge silently.
