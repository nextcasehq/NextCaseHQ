# Document Creator Execution Kernel

Status: **Approved, Phase 0 — Technical Specification**
Scope: **This document governs only the Document Creator** — document autosave, AI document-generation requests, policy evaluation, context loading, ephemeral-worker execution, permanent document storage, version creation, indexing, the AI Credit lifecycle, and advocate review and confirmation. It is not a platform-wide kernel, not a general NextCaseHQ orchestration system, and not an autonomous-agent framework. Nothing in this document authorizes production-code implementation during Phase 0 — see `DOCUMENT_CREATOR_GOVERNANCE.md` and the roadmap phase gating in `DOCUMENT_CREATOR_IMPLEMENTATION_ROADMAP.md` for when each piece described here is actually built.

This document is the authoritative source for the Document Creator's internal execution architecture — its command catalogue, its finite state machine, and the contracts for the Policy Engine, Context Loader, Prompt Composer, and Worker Runtime. Where any other document in `docs/document-creator/` states a simplified or earlier version of the state machine or these contracts, this document's version is authoritative and the other document should be read as consistent with it (each of those documents carries a short pointer back here — see `DOCUMENT_GENERATION_JOB_SPEC.md`'s "Execution Kernel Alignment" section for the clearest example).

## 1. Authoritative-State Architecture

The kernel never treats worker memory as permanent state. This restates and sharpens Constitution Rule 9 ("AI workers are temporary execution engines") and Rule 10 ("PostgreSQL, object storage, and GitHub remain authoritative") for the kernel's own internal design:

| System | Role | Authoritative for |
|---|---|---|
| PostgreSQL | System of record | Durable drafts, generation jobs, leases, state transitions, AI Credit references, document metadata, versions, indexing status, audit history |
| Object storage | System of record | Permanent document bodies, large inputs, generated outputs, version files |
| GitHub | System of record | Architecture, governance, specifications, and production source code |
| Redis | Coordination only | Queue delivery, short-lived progress, rate limits, temporary delivery signals — **never** the sole record of any of the state PostgreSQL owns |
| Ephemeral-worker memory | Transient only | Temporary processing state for the single job currently in hand |

An in-memory State Store — a lightweight cache of "which job is this worker currently holding" — is permitted for performance, but it must never be authoritative for: draft content, generation-job status, document versions, AI Credit reservations or debits, worker leases, retries, indexing status, audit history, tenant ownership, or advocate confirmation. If that cache is lost, the worker re-reads the same information from PostgreSQL and continues correctly — the cache is an optimization, never a dependency.

Worker termination — graceful or otherwise — must never destroy durable state. Every fact the kernel needs to recover from a terminated worker already lives in PostgreSQL or object storage before the worker is allowed to consider a step complete.

## 2. Pure State Access Layer

The kernel defines a strongly-typed state-access layer as a thin interface over the authoritative stores above — never a place where business logic hides.

**Permitted responsibilities:**
- Read current durable state (a job's row, a draft's row, a version's row).
- Atomically commit valid state changes (a single transaction moving a job from one state to the next, per §5).
- Acquire or renew leases (the same atomic, conditional-update pattern already specified in `EPHEMERAL_WORKER_ARCHITECTURE.md` step 3).
- Publish state-change notifications (e.g., a Redis pub/sub message so a polling client can be told to refresh sooner — coordination only, never itself the fact of the change).
- Retrieve immutable snapshots (a point-in-time read of a job/draft/version for a command handler to reason about).
- Enforce optimistic concurrency (the revision-field check already specified in `DOCUMENT_AUTOSAVE_SPECIFICATION.md`).

**Prohibited responsibilities:**
- Business-policy decisions (that is the Policy Engine's job, §6).
- Prompt generation (that is the Prompt Composer's job, §8).
- AI-provider selection (that stays in `lib/ai/llm-provider.ts`, called from the Worker Runtime, §9).
- Document classification decisions.
- Direct worker execution.
- Hidden state transitions (every transition is the result of a named command, §4, never a side effect of an unrelated read).
- Storing permanent state only in memory (a direct restatement of §1).

All state changes that require consistency across more than one row (e.g., moving a job to `VERSION_CREATED` and inserting the `DocumentVersion` row) use a single database transaction — the existing `DatabaseClient` pattern already used throughout the codebase for multi-row consistency (see, for example, the CTE-based transaction in the existing `POST /api/matters/[id]/close` route).

## 3. Command Pattern

Subsystems are never invoked through uncontrolled direct calls scattered through an orchestration loop. Every meaningful action against Document Creator state is a strongly-typed command.

### 3.1 Command Catalogue

- `CreateDraftCommand`
- `AutosaveDraftCommand`
- `RequestGenerationCommand`
- `EvaluateGenerationPolicyCommand`
- `ReserveAiCreditsCommand`
- `EnqueueGenerationCommand`
- `ClaimGenerationJobCommand`
- `RenewWorkerLeaseCommand`
- `LoadDocumentContextCommand`
- `GenerateDocumentCommand`
- `PersistGeneratedOutputCommand`
- `CreateDocumentVersionCommand`
- `EnqueueIndexingCommand`
- `CompleteGenerationJobCommand`
- `RetryGenerationJobCommand`
- `CancelGenerationJobCommand`
- `ReleaseAiCreditReservationCommand`
- `ConfirmAdvocateReviewCommand`

### 3.2 Command Envelope

Every command defines:

| Field | Purpose |
|---|---|
| Command ID | Unique identifier for this specific command instance |
| Idempotency key | Prevents duplicate execution of the same logical request (per-tenant unique, per `DOCUMENT_GENERATION_JOB_SPEC.md`'s idempotency rule) |
| Tenant ID | Resolved from server-side session context — **never** client-supplied (Constitution Rule 6, restated) |
| Authenticated user ID | Resolved from server-side session context |
| Target entity IDs | The job/draft/document/version IDs this command acts on |
| Expected current state | What state the target must be in for this command to be valid (enforces §5's transition table at the command layer) |
| Payload schema | Strongly typed, validated input specific to the command |
| Issued timestamp | When the command was created |
| Correlation ID | Ties together every command in one logical user-initiated flow (e.g., one generation request's full `RequestGeneration → EvaluatePolicy → ReserveCredits → Enqueue → Claim → ... → Complete` chain) |
| Causation ID | The specific command (if any) that caused this one to be issued — distinct from correlation, which spans the whole flow |

### 3.3 Command Handler Contract

Every command handler:

1. Validates authorisation (the authenticated user/tenant may actually perform this action on this target).
2. Validates current state against the command's expected-current-state field (rejects if the target has moved on — this is the primary illegal-transition guard, backed by §5's table).
3. Enforces idempotency (a repeated command with the same idempotency key returns the prior result rather than re-executing).
4. Performs exactly one coherent responsibility — a handler that reserves credits does not also enqueue a job; that is two commands, chained via correlation ID, not one handler doing two things.
5. Commits state atomically (§2's transactional guarantee).
6. Produces an audit event (per `DOCUMENT_SECURITY_AND_AUDIT.md`'s event list — every command in the catalogue above maps to at least one audit event).
7. Returns a typed result (success with the new state, or a typed failure — never an untyped exception surfaced to the caller).

## 4. Validated Finite State Machine

Document-generation state transitions are explicit and validated — no code path may move a job's `status` column without going through a command handler that checks this table.

### 4.1 Primary Flow

```
DRAFT
  → AUTOSAVED
  → GENERATION_REQUESTED
  → POLICY_EVALUATION
  → CREDIT_RESERVED
  → QUEUED
  → CLAIMED
  → CONTEXT_LOADING
  → GENERATING
  → SAVING
  → VERSION_CREATED
  → INDEXING_PENDING
  → COMPLETED
```

This is the authoritative, fine-grained state machine for a generation request's full life, from the editor through to a completed, indexed version. It **supersedes** the shorter `QUEUED → CLAIMED → GENERATING → SAVING → INDEXING_PENDING → COMPLETED` sequence shown as `DocumentGenerationJob.status` in `DOCUMENT_GENERATION_JOB_SPEC.md` — that document's six-state sequence is the subset of this table that applies once a job row exists (`QUEUED` onward); `DRAFT` through `CREDIT_RESERVED` describe kernel-level states that precede job creation. `DOCUMENT_GENERATION_JOB_SPEC.md` §"Execution Kernel Alignment" reconciles the two explicitly.

### 4.2 Permitted Failure or Interruption States

Reachable from any non-terminal state in the primary flow, per the same rules already established in `DOCUMENT_GENERATION_JOB_SPEC.md`:

- `RETRY_PENDING`
- `FAILED`
- `CANCELLED`
- `EXPIRED`

### 4.3 Illegal Transitions

A command handler rejects any transition not explicitly permitted by §4.1/§4.2's adjacency. Examples that must be rejected:

- `QUEUED → COMPLETED` (skips claiming, context loading, generation, saving, and version creation entirely)
- `CLAIMED → VERSION_CREATED` (skips context loading, generation, and saving)
- `GENERATING → CREDIT_RESERVED` (moves backward past queueing and claiming)
- `FAILED → GENERATING` without a new, valid `RETRY_PENDING → QUEUED → CLAIMED → ...` transition chain (a failed job cannot resume mid-flow; it must re-enter the flow from `QUEUED` via a retry)
- `COMPLETED → GENERATING` (a completed job is terminal; a new generation is a new job, not a re-opened old one)
- `CANCELLED → COMPLETED` (a cancelled job is terminal)
- `INDEXING_PENDING → VERSION_CREATED` (moves backward — the version already exists by the time indexing is pending)

### 4.4 Transition Record

Every transition — legal, by definition, since illegal ones are rejected before being recorded — persists:

| Field | Purpose |
|---|---|
| Previous state | |
| Next state | |
| Actor or worker | Which user, or which worker instance, caused this transition |
| Reason | Free-text or coded explanation, especially for failure/retry/cancel transitions |
| Command ID | Links the transition to the exact command (§3) that caused it |
| Timestamp | |
| Attempt number | Which attempt this is, for jobs that have retried |
| Lease reference | Which lease was active, where applicable (`CLAIMED` through `SAVING`) |
| Safe error code | Where applicable — never a raw provider error or stack trace, per `DOCUMENT_SECURITY_AND_AUDIT.md` |

## 5. Policy Engine

The Policy Engine is data-driven and strictly separated from execution — it answers "is this allowed," never "do this."

### 5.1 What It Evaluates

- Tenant entitlement
- User permissions
- Matter Register access
- Closed-matter restrictions (the existing closed-matter mutation guard pattern, extended to cover "generate a document for a closed Matter")
- Document-type eligibility (against the approved vocabulary in `lib/domain/document-type.ts`)
- AI Credit availability
- Request-size limits
- Per-user concurrency (`DOCUMENT_TRAFFIC_AND_CONCURRENCY.md`)
- Per-tenant concurrency
- Global provider capacity
- Queue-admission limits
- Model or provider restrictions
- Confidentiality constraints
- Retention requirements
- Retry eligibility (has `attempt_count` reached `maximum_attempts`)
- Cancellation eligibility (is the job in a cancellable state)

### 5.2 Typed Results

- `ALLOW`
- `DENY`
- `REQUIRE_CONFIRMATION` — the action is permitted but needs an explicit advocate confirmation step first (e.g., generating against a Matter with a known conflict flag, if such a feature exists).
- `DEFER` — not currently permitted due to capacity, but should be retried shortly rather than denied outright (distinct from queueing — this is a policy-level "not yet," evaluated before a job would even be created).
- `RETRY_LATER` — a transient condition (e.g., a per-tenant concurrency cap currently at its limit) that will resolve on its own; the caller should retry the policy evaluation, not the underlying action.

### 5.3 Prohibited Responsibilities

The Policy Engine never generates prompts, calls AI providers, stores documents, directly mutates job state without going through a command (§3), or trusts client-supplied tenant or role information — it always evaluates against the server-resolved identity from the command envelope.

## 6. Context Loader

The Context Loader aggregates authorised data only, extending the existing AI Context Gateway (`lib/ai/context/gateway.ts`, `ranking.ts`) rather than replacing it.

### 6.1 May Load

- Current document draft
- Selected document version
- Approved template
- Relevant Matter Register details
- Selected parties
- Relevant proceeding
- Advocate-confirmed facts
- Selected authorities
- Drafting instructions
- Permitted document metadata

### 6.2 Must Not

- Build the final AI prompt (that is the Prompt Composer's job, §7 — the Context Loader's output is structured data, not prompt text).
- Load the entire Matter Register by default (the existing ranking/budget model in `lib/ai/context/ranking.ts` is the enforcement point, per `DOCUMENT_MEMORY_EFFICIENCY.md`).
- Load unrelated documents.
- Include unauthorised tenant information.
- Treat unverified AI output as fact (an earlier AI-assisted, not-yet-confirmed draft is context, not ground truth).
- Retain permanent context inside worker memory (§1's authoritative-state rule, restated for this specific subsystem).

### 6.3 Context Properties

Context assembled by this component is tenant-scoped, minimal, purpose-specific, size-bounded, reconstructable (the same inputs re-run through the same ranking logic produce the same context, so nothing here is a one-off, unreproducible snapshot), and traceable to source records (every item in the assembled context can be traced back to the specific Matter Register row, document version, or fact it came from).

## 7. Prompt Composer

The Prompt Composer is a distinct component from the Context Loader — it receives already-authorised, already-structured context and turns it into a provider-neutral generation request.

### 7.1 Defines

- Drafting objective
- Document type
- Jurisdiction
- Permitted facts
- Legal authorities and their verification status (never presenting an unverified citation as settled law — see the existing "never treat generated legal content as verified authority" rule in `DOCUMENT_INDEXING_AND_RECOVERY.md`, applied here at composition time too)
- Advocate instructions
- Required structure
- Prohibited assumptions (explicitly telling the model what it may not invent)
- Output constraints (length, format)
- Citation requirements
- Advocate-review warning (an instruction, carried through to the output, that this content requires human review before being treated as final — reinforcing Constitution Rule 3 at the generation-request level itself, not only in the UI afterward)

### 7.2 Must Not

- Retrieve database records directly (it consumes what the Context Loader already assembled).
- Decide tenant access (that is the Policy Engine's job).
- Reserve AI Credits (that is a separate command, §3).
- Persist documents (that is the Worker Runtime's job, after generation, §9).
- Select a provider through hardcoded logic (provider selection stays in `lib/ai/llm-provider.ts`, called by the Worker Runtime — the Prompt Composer's output is provider-neutral).
- Invent missing facts (if a required fact is absent from the Context Loader's output, the Prompt Composer surfaces that as a composition failure rather than fabricating a placeholder).

## 8. Model-Independent Worker Runtime

A generic `WorkerRuntime` interface abstracts the mechanics of executing one job, independent of which specific compute platform hosts the worker.

### 8.1 Abstracts

- Job claim
- Lease renewal
- Context retrieval (via the Context Loader, §6)
- Provider invocation (via the existing `lib/ai/llm-provider.ts` abstraction)
- Streamed output (per `DOCUMENT_MEMORY_EFFICIENCY.md`)
- Cancellation
- Timeout
- Retryable failure
- Permanent failure
- Resource cleanup
- Heartbeat
- Graceful shutdown

### 8.2 Explicitly Not Bound To

Per `EPHEMERAL_WORKER_ARCHITECTURE.md`'s existing platform-neutrality stance, restated here at the interface level: this architecture does not bind to OpenAI, Anthropic, a specific cloud provider, a specific serverless-worker platform, Kubernetes, or one queue vendor. Provider selection remains downstream (inside the `WorkerRuntime`'s call to `lib/ai/llm-provider.ts`) and configurable; platform selection is the Product Owner-approved decision already flagged in `DOCUMENT_CREATOR_ARCHITECTURE_DECISION_RECORD.md`.

## 9. Ephemeral-Worker Execution Rules

An ephemeral worker, using the `WorkerRuntime` interface (§8):

1. Claims one queued job.
2. Acquires a durable database-backed lease.
3. Verifies tenant, user, document, and job state (re-checks — never trusts that the state at claim time is still valid without re-reading).
4. Records a heartbeat.
5. Loads large input using object-storage references.
6. Loads only authorised and relevant context (via the Context Loader, §6).
7. Composes the provider-neutral prompt (via the Prompt Composer, §7).
8. Invokes the approved provider abstraction.
9. Streams output without buffering the full document.
10. Saves generated output to temporary object storage.
11. Validates stored output.
12. Creates or updates the permanent document envelope.
13. Creates exactly one idempotent `DocumentVersion` (idempotent: re-running this step for the same job after a crash-and-recover does not create a second version — checked against the job's own completion state first, per `EPHEMERAL_WORKER_ARCHITECTURE.md`'s duplicate-delivery guarantee).
14. Records content hash and generation metadata.
15. Confirms the version is previewable and downloadable.
16. Debits reserved AI Credits only after permanent preservation.
17. Enqueues indexing as a separate, recoverable job.
18. Marks generation completed.
19. Releases memory and temporary resources.
20. Exits safely when idle or when resource limits are reached.

This is the same 20-step discipline as `EPHEMERAL_WORKER_ARCHITECTURE.md`'s 17 steps, expressed against the finer-grained state machine in §4 above and the command/policy/context/prompt separation introduced in this document; the two documents describe one lifecycle, not two different ones (see `EPHEMERAL_WORKER_ARCHITECTURE.md`'s alignment note).

A worker may disappear only after durable checkpoints (PostgreSQL transaction commits, object-storage writes confirmed) have been written for whatever step it last completed — never mid-step, without a checkpoint, in a way that leaves the job's true state ambiguous.

Expired leases permit safe recovery without duplicate versions or duplicate AI Credit charges, per the idempotency guarantees in §3.3 and §9 step 13, and the reservation/release rules in `DOCUMENT_AI_CREDITS_LIFECYCLE.md`.

## 10. Idempotency Boundaries

Idempotency is enforced at three layers, each independently sufficient to prevent a duplicate side effect:

1. **Command layer** (§3.3): a repeated command with the same idempotency key returns the prior result.
2. **Job layer** (`DOCUMENT_GENERATION_JOB_SPEC.md`): a repeated enqueue with the same `idempotency_key` returns the existing job rather than creating a new one.
3. **Execution layer** (§9 step 13, and `EPHEMERAL_WORKER_ARCHITECTURE.md`'s duplicate-delivery rule): a worker re-processing a job it (or another worker) already completed checks the job's actual current state before taking any action with a side effect.

## 11. Failure-Recovery Rules

- A job whose lease has expired without a heartbeat is recoverable — moved to `RETRY_PENDING` (if attempts remain) or `FAILED` (if exhausted), never left stuck.
- A `RETRY_PENDING` job re-enters `QUEUED` after exponential backoff with jitter (`lib/ai/retry.ts`'s existing pattern, applied at the job level per `DOCUMENT_TRAFFIC_AND_CONCURRENCY.md`).
- A permanently `FAILED` job releases its AI Credit reservation (`DOCUMENT_AI_CREDITS_LIFECYCLE.md`) and leaves no orphaned temporary object-storage content (cleaned up as part of the failure transition itself, or by a periodic sweep for expired-lease temp objects).
- A `CANCELLED` job, cancelled by the advocate or the system, releases its reservation the same way.
- None of these recovery paths ever touches an already-created, permanent `DocumentVersion` — recovery only ever concerns the job's own in-flight state, never rolls back something already durably completed.

## 12. Memory-Saving Rules

Restated here as kernel-level constraints (full detail in `DOCUMENT_MEMORY_EFFICIENCY.md`):

- Never place full documents in queue messages.
- Never use Redis as permanent document storage.
- Pass identifiers and object-storage references between kernel components, not content.
- Stream provider output.
- Use bounded context windows (via the Context Loader's ranking/budget model).
- Process very large documents in controlled sections.
- Apply backpressure.
- Avoid duplicate in-memory copies of the same content across kernel components.
- Process one large generation job per worker initially.
- Apply strict input, output, runtime, and memory limits (enforced by the Policy Engine at admission, and by the Worker Runtime during execution).
- Recycle workers after configured memory or job thresholds.
- Remove temporary objects only after permanent storage succeeds.
- Never retain confidential documents on worker local disks.

## 13. Security Boundaries

- Every command's tenant ID and user ID are server-resolved (§3.2) — the kernel never accepts a client-supplied identity claim at any layer, from the API route through the Policy Engine to the Worker Runtime.
- The Context Loader enforces tenant scoping on every item it assembles (§6.3).
- The Prompt Composer and Worker Runtime never log prompt text, generated content, or storage paths (`DOCUMENT_SECURITY_AND_AUDIT.md`).
- Every command handler produces an audit event (§3.3 step 6) — the kernel's own execution is, by construction, fully auditable without a separate bolt-on logging pass.
- Rate limits apply at the API boundary (enqueue/cancel/status endpoints, per `DOCUMENT_SECURITY_AND_AUDIT.md`), before a command ever reaches the kernel's internal handlers.

## 14. Future TypeScript Module Plan

**Documented here for planning purposes only — none of these files are created during Phase 0**, per `DOCUMENT_CREATOR_GOVERNANCE.md` §1 (one milestone per branch/PR) and the explicit Phase 0 constraint against production code. Each module below is scoped to land as part of the roadmap phase whose spec it implements (`DOCUMENT_CREATOR_IMPLEMENTATION_ROADMAP.md`), not as a single sprawling PR — but a module and the phase that needs it may span more than one file, or more than one module may land together, whenever that is what one coherent subsystem actually requires. One task equals one coherent feature or subsystem; it does not mean one file per PR where correctness requires several files delivered together.

| Module | Responsibility | Primary phase |
|---|---|---|
| `DocumentKernelTypes.ts` | Shared type definitions: command envelope shape, state enum, policy result types, context/prompt contracts | Phase 4 (introduced alongside the job table) |
| `DocumentKernelCommands.ts` | The command catalogue (§3.1) as typed classes/factories | Phase 4 |
| `DocumentKernelStateRepository.ts` | The Pure State Access Layer (§2) | Phase 4 |
| `DocumentPolicyEngine.ts` | The Policy Engine (§5) | Phase 4 (entitlement/credit checks) extended in Phase 8 (concurrency/traffic checks) |
| `DocumentContextLoader.ts` | The Context Loader (§6), built on the existing AI Context Gateway | Phase 5 |
| `DocumentPromptComposer.ts` | The Prompt Composer (§7) | Phase 5 |
| `DocumentWorkerRuntime.ts` | The `WorkerRuntime` interface and its concrete implementation (§8, §9) | Phase 5 |
| `DocumentKernelDispatcher.ts` | Routes commands to their handlers, enforcing the handler contract (§3.3) | Phase 4 |
| `DocumentGenerationStateMachine.ts` | The validated FSM and its transition table (§4) | Phase 4 |
| `DocumentWorkerLeaseService.ts` | Lease acquisition, renewal, and expiry-recovery logic (§9, `EPHEMERAL_WORKER_ARCHITECTURE.md`) | Phase 5 |
| `DocumentGenerationAuditService.ts` | Emits the audit events required by §3.3 step 6 and `DOCUMENT_SECURITY_AND_AUDIT.md` | Phase 4 |
