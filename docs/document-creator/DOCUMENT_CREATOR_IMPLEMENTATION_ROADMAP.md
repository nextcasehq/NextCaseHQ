# Document Creator Implementation Roadmap

Status: **Approved, Phase 0 — Roadmap**
Scope: The ordered, isolated milestones that carry the Document Creator from its current state to the full target architecture. Each phase is its own branch and its own PR, per `DOCUMENT_CREATOR_GOVERNANCE.md` §1.

## Target Architectural Flow

```
Editor
  → Local recovery
  → Server autosave
  → Durable draft
  → Generation request
  → AI Credit reservation
  → Durable PostgreSQL job
  → Queue
  → Ephemeral worker
  → AI provider
  → Permanent object storage
  → DocumentVersion
  → Indexing job
  → Tenant-safe search
  → Advocate review
  → Advocate-confirmed version
```

Every phase below implements one segment of this flow, leaving every other segment exactly as it already works (or, for not-yet-reached segments, as an honest "not yet available" state, per the Constitution).

This plain-language flow is given its full, precise, state-by-state definition in `DOCUMENT_CREATOR_EXECUTION_KERNEL.md` §4 (the validated finite state machine) — each arrow above corresponds to one or more named states and the typed command (kernel §3) that causes the transition between them. Phases 4 and 5 below are where that kernel is actually built, per its §14 module plan.

---

## Phase 1 — Functional Recovery

**Already represented by PR #138** (merged as `28339f4`). Restored `/dashboard/draft-builder` and `/documents/new` to a genuinely reachable, non-hanging state by fixing the silently-inert `middleware.ts` → `src/proxy.ts` gateway. No autosave, queue, or worker changes — this phase made the *existing* prototype flow honestly functional, nothing more.

---

## Phase 2 — Durable Draft and Continuous Autosave

- **Objective**: Implement `DOCUMENT_AUTOSAVE_SPECIFICATION.md` in full — local recovery, debounced server autosave, the four status indicators, and revision-based conflict detection.
- **Scope**: A new durable draft table/record; the autosave API endpoint(s); the editor-side IndexedDB (or approved storage abstraction) integration; the four-state UI indicator.
- **Exclusions**: No AI generation changes. No permanent `DocumentVersion` creation beyond the four explicit trigger events already listed in the autosave spec.
- **Dependencies**: Phase 1 (a reachable page to autosave from).
- **Migrations**: New durable-draft table, tenant-scoped, linked to user/Matter/document-type per the Memory Model.
- **APIs**: `POST`/`PATCH` autosave endpoint; `GET` draft-recovery endpoint.
- **Tests**: Focused tests for debounce behavior, conflict detection (simulated stale revision), and recovery after simulated refresh/offline.
- **Security validation**: `requireSession()` on every endpoint; tenant/user ownership re-checked server-side, not trusted from the client.
- **Rollback approach**: The new draft table can be dropped without affecting `DocumentEnvelope`/`DocumentVersion` — autosave is additive and does not touch permanent storage.
- **Acceptance criteria**: A draft survives a real, executed refresh/crash/offline simulation in a Playwright check, not just unit-level assertions; the four status indicators are verified to reflect real request outcomes, not optimistic assumptions.

## Phase 3 — Permanent Storage and Versioning Integration

- **Objective**: Implement `DOCUMENT_STORAGE_AND_VERSIONING_SPEC.md`'s completion checklist as real, enforced logic — wiring the "manual version creation" and "AI output accepted" triggers from Phase 2's draft record into real `DocumentVersion` rows.
- **Scope**: The completion-checklist validation logic; the review-status lifecycle (AI-assisted / advocate-reviewed / advocate-confirmed) as real fields; the restore-workflow endpoint.
- **Exclusions**: No asynchronous job/queue work yet — this phase makes manual "create a version" and "accept this content" actions durable and correct, synchronously, before Phase 4 makes AI generation itself asynchronous.
- **Dependencies**: Phase 2 (a draft to promote into a version).
- **Migrations**: Additive columns on `DocumentVersion` for review status, content hash, and (if the ADR's decision lands this way) a nullable `generation_job_id` placeholder ahead of Phase 4.
- **APIs**: "Create version" and "restore version" endpoints.
- **Tests**: Focused tests proving no code path ever `UPDATE`s existing version content; restore creates a new version rather than mutating history.
- **Security validation**: Object-storage key scoping verified per tenant; signed-URL/proxy access re-checked.
- **Rollback approach**: New columns are nullable and additive; safe to leave unpopulated if rolled back.
- **Acceptance criteria**: A version, once created, is demonstrated immutable under an actual attempted overwrite in a test (not just asserted by code review).

## Phase 4 — Durable Generation-Job Foundation

- **Objective**: Implement `DOCUMENT_GENERATION_JOB_SPEC.md` and `DOCUMENT_AI_CREDITS_LIFECYCLE.md` — the `DocumentGenerationJob` table, the state machine, real AI Credit reservation/debit/release wired into the entitlement checkpoint, and the `POST` (202-returning) / `GET` (status) API pair. Introduces the Execution Kernel's foundational modules per `DOCUMENT_CREATOR_EXECUTION_KERNEL.md` §14: `DocumentKernelTypes.ts`, `DocumentKernelCommands.ts`, `DocumentKernelStateRepository.ts`, `DocumentKernelDispatcher.ts`, `DocumentGenerationStateMachine.ts`, `DocumentPolicyEngine.ts` (entitlement/credit checks only — concurrency/traffic checks arrive in Phase 8), and `DocumentGenerationAuditService.ts`.
- **Scope**: New table + migration; queue-message contract (identifiers/references only); idempotency key handling; real wallet integration per the ADR's decision on reservation representation; the command-handler contract (kernel §3.3) enforced for every command in this phase's slice of the catalogue (`RequestGenerationCommand`, `EvaluateGenerationPolicyCommand`, `ReserveAiCreditsCommand`, `EnqueueGenerationCommand`, `CancelGenerationJobCommand`, `ReleaseAiCreditReservationCommand`).
- **Exclusions**: No actual worker execution yet — jobs are created and queued, but Phase 4 may run generation synchronously *behind* the new async-shaped API (a job is created, immediately processed, immediately completed) as a bridge, explicitly labeled as such, before Phase 5 makes execution genuinely ephemeral/asynchronous. This bridging approach must be called out explicitly in the Phase 4 PR if used.
- **Dependencies**: Phase 3 (a version to attach the job's output to); the ADR's decision #3 (reservation representation) must be resolved first.
- **Migrations**: `DocumentGenerationJob` table; wallet reservation-state migration per the ADR decision.
- **APIs**: `POST` enqueue (202 + job id); `GET` job status; `POST` cancel.
- **Tests**: Idempotency (duplicate enqueue with the same key), reservation/release correctness under cancellation and failure, entitlement denial path.
- **Security validation**: Rate limits on enqueue/cancel/status per `DOCUMENT_SECURITY_AND_AUDIT.md`; job-id validation and tenant-ownership check on every status/cancel call.
- **Rollback approach**: Feature-flaggable — the old synchronous `/api/ai/draft` path can remain available as a fallback until the new path is fully validated, then removed in a follow-up, never removed in the same PR that introduces its replacement.
- **Acceptance criteria**: A real double-click (or simulated duplicate request) is demonstrated to produce exactly one job and exactly one credit reservation.

## Phase 5 — Ephemeral Worker Foundation

- **Objective**: Implement `EPHEMERAL_WORKER_ARCHITECTURE.md` and `DOCUMENT_CREATOR_EXECUTION_KERNEL.md` §§6–9 — genuinely asynchronous, crash-safe execution, replacing Phase 4's synchronous bridge. Introduces `DocumentContextLoader.ts`, `DocumentPromptComposer.ts`, `DocumentWorkerRuntime.ts`, and `DocumentWorkerLeaseService.ts` per the kernel's §14 module plan.
- **Scope**: The full 17-step (kernel-aligned: 20-step) worker lifecycle; lease acquisition/expiry/recovery; streaming provider output to temporary storage; the platform-selection decision from the ADR; the Context Loader and Prompt Composer as distinct, separately-testable components (kernel §6–§7), not inlined into the worker itself.
- **Exclusions**: No indexing orchestration changes yet (Phase 6) — the worker enqueues an indexing job but does not implement its processing.
- **Dependencies**: Phase 4 (a durable job to claim); the ADR's decision #1 (worker platform) must be resolved first.
- **Migrations**: None beyond what Phase 4 already added, unless the platform decision requires new coordination columns.
- **APIs**: None new client-facing; internal worker-claim/heartbeat logic against the existing job table.
- **Tests**: A simulated worker-crash-mid-job test proving lease expiry correctly recovers the job without data loss or duplicate credit debit.
- **Security validation**: No confidential content in worker logs (verified by an actual log-content assertion in tests, not just a code-review claim); temp files confirmed deleted after job completion.
- **Rollback approach**: Workers can be scaled to zero, leaving jobs queued (not lost) in PostgreSQL/Redis until workers resume — documented explicitly as the rollback behavior, since "rollback" here means "stop consuming," not "delete data."
- **Acceptance criteria**: A forced `kill -9` of a worker mid-job, in a real test environment, results in the job recovering and completing on retry — not merely asserted, executed.

## Phase 6 — Indexing and Search

- **Objective**: Implement `DOCUMENT_INDEXING_AND_RECOVERY.md` — the `PENDING`/`RETRYING` status additions and independent retry scheduling around the existing indexing pipeline.
- **Scope**: Status-model migration; retry scheduling; chunk-level source-version linkage.
- **Exclusions**: No changes to the extraction/chunking/embedding algorithms themselves — reused as-is per the ADR.
- **Dependencies**: Phase 5 (a completed generation to index) — though indexing already works for manually-uploaded documents today and continues to.
- **Migrations**: `DocumentEnvelope.index_status` CHECK constraint extended with `RETRYING`; any new chunk-level version-reference column.
- **APIs**: None new client-facing beyond existing search endpoints, which begin reflecting the richer status model.
- **Tests**: A simulated indexing failure proving the underlying document remains fully readable/downloadable throughout.
- **Security validation**: `DocumentChunkVector` tenant-isolation re-verified under the new retry path (a retried index write must not leak across tenants under concurrent retry scheduling).
- **Rollback approach**: The additive status value and retry scheduler can be disabled, leaving indexing in its current synchronous-inline behavior as a safe fallback.
- **Acceptance criteria**: A forced embedding-provider failure is demonstrated not to affect document availability, and to retry and eventually succeed (or exhaust retries into `FAILED` without side effects).

## Phase 7 — Advocate Review and Confirmation Workflow

- **Objective**: Surface the review-status lifecycle from Phase 3 as a real UI workflow — "AI assisted this draft," explicit review, explicit confirmation — completing the human-in-the-loop guarantee end to end.
- **Scope**: UI for reviewing AI-assisted content before confirmation; the explicit "confirm as final" action; UI states for `Queued` / `Generating` / `Saving document` / `Preparing search index` / `Completed` / `Failed` / `Cancelled`, per the target user-experience states; recoverable status on page return (the advocate leaves and comes back, and sees the real server-side job status, not a stale client guess).
- **Exclusions**: No new backend job semantics — this phase is UI/UX built on Phases 4–6's real state.
- **Dependencies**: Phases 4, 5, 6 (real job/version/index status to reflect).
- **Migrations**: None expected.
- **APIs**: Possibly a lightweight "my recent jobs" listing endpoint, tenant/user-scoped.
- **Tests**: Playwright verification that every one of the named UI states is reachable and that none of them is an endless loader (direct continuation of the Phase 1 discipline).
- **Security validation**: The "leave and return" flow re-authenticates and re-authorizes on return — no client-cached job state is trusted without a fresh server check.
- **Rollback approach**: Pure UI phase; disabling it reverts to whatever minimal status display Phase 4 shipped.
- **Acceptance criteria**: An advocate is demonstrated (in a real browser flow) leaving mid-generation and returning to see accurate, server-sourced status — not a guess.

## Phase 8 — High-Traffic Hardening, Monitoring and Recovery

- **Objective**: Implement `DOCUMENT_TRAFFIC_AND_CONCURRENCY.md` and `DOCUMENT_MEMORY_EFFICIENCY.md`'s remaining configurable limits under real or realistically-simulated load, plus monitoring/alerting for job-queue depth, worker health, and recovery-sweep effectiveness. Extends `DocumentPolicyEngine.ts` (introduced in Phase 4 for entitlement/credit checks) with the concurrency, queue-admission, and provider-capacity evaluations named in `DOCUMENT_CREATOR_EXECUTION_KERNEL.md` §5.1.
- **Scope**: Configurable concurrency/queue-depth/timeout limits actually enforced (not just documented); circuit breaker implementation; worker recycling; load-test verification of memory-efficiency claims from Phase 5.
- **Exclusions**: No premature infrastructure (Kafka/Kubernetes) unless this phase's own load evidence justifies it, per `DOCUMENT_CREATOR_GOVERNANCE.md` §3 — and if so, that is its own Product Owner-approved decision, not assumed here.
- **Dependencies**: Phases 4–7 fully operational, to have a real system to load-test.
- **Migrations**: Possibly a configuration table for tunable limits, if not managed purely via environment variables.
- **APIs**: None new client-facing; internal admission-control logic.
- **Tests**: A load simulation demonstrating queue admission control rejects cleanly at configured depth, and that manual drafting remains available throughout a simulated overload.
- **Security validation**: Confirm the circuit breaker cannot be used as a denial-of-service vector against a specific tenant (i.e., one tenant's provider failures don't trip a breaker that blocks other tenants unfairly, unless that is the deliberate global-provider-limit behavior).
- **Rollback approach**: Limits can be relaxed via configuration without a code rollback; the circuit breaker can be disabled to fail back to per-request retry behavior.
- **Acceptance criteria**: Documented load-test results showing the system behaves exactly as `DOCUMENT_TRAFFIC_AND_CONCURRENCY.md`'s "When Overloaded" section describes, under actual induced load — not merely under unit-test mocks.
