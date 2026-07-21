# Ephemeral Worker Architecture

Status: **Approved, Phase 0 — Technical Specification** (implemented in Phase 5, see `DOCUMENT_CREATOR_IMPLEMENTATION_ROADMAP.md`)
Scope: The lifecycle and guarantees of the worker processes that execute AI document generation off the main web server.

## Platform Neutrality

**No specific cloud worker platform (e.g. a particular queue-consumer runtime, container orchestrator, or serverless function product) is selected in this document.** Selecting one is a Product Owner-approved decision, recorded in `DOCUMENT_CREATOR_ARCHITECTURE_DECISION_RECORD.md`'s decision log, made when Phase 5 is actually scoped — not pre-committed here. This document specifies *behavior*, which any reasonable platform choice must satisfy.

## Worker Lifecycle

1. **Start when work exists.** A worker process starts (or an idle worker wakes) when there is at least one `QUEUED` job it is eligible to claim — no worker runs continuously polling an empty queue as its steady state.
2. **Claim one job initially.** Per `DOCUMENT_TRAFFIC_AND_CONCURRENCY.md`'s "one active generation per worker" starting rule, a worker claims exactly one job at a time in this phase.
3. **Acquire a database-backed lease.** Claiming means an atomic PostgreSQL update: `status QUEUED → CLAIMED`, `lease_owner = <this worker's identity>`, `lease_expires_at = now() + lease_duration`, guarded by a `WHERE status = 'QUEUED' AND (lease_expires_at IS NULL OR lease_expires_at < now())` condition so two workers can never both claim the same job.
4. **Record heartbeat** while processing (`GENERATING`): periodically extend `heartbeat_at` and `lease_expires_at` so a still-alive worker isn't mistaken for a dead one.
5. **Load input from object storage** — the assembled prompt/context referenced by `input_object_key`, never re-derived from a queue message body.
6. **Load only relevant Matter Register context** via the existing AI Context Gateway (`lib/ai/context/gateway.ts`) and its ranking/budget logic (`lib/ai/context/ranking.ts`) — never the entire Matter Register for the tenant.
7. **Call the approved AI-provider abstraction** (`lib/ai/llm-provider.ts` → `OpenAIProvider`/`AnthropicProvider`) — never a vendor SDK imported directly into worker code.
8. **Stream output rather than buffering the entire document** in memory, per `DOCUMENT_MEMORY_EFFICIENCY.md`.
9. **Save output to temporary object storage** first — not directly as a `DocumentVersion` — so a crash between generation and permanent storage never leaves a half-written permanent record.
10. **Validate stored output** — readable, non-empty, matches an expected content hash computed during the streamed write.
11. **Create a permanent `DocumentVersion`** record only after validation succeeds, per `DOCUMENT_STORAGE_AND_VERSIONING_SPEC.md`'s completion checklist.
12. **Link it to the correct document and Matter Register** (`DocumentEnvelope.matter_id`, `DocumentVersion.envelope_id`).
13. **Confirm AI Credit debit only after successful permanent storage** — never before, per `DOCUMENT_AI_CREDITS_LIFECYCLE.md`.
14. **Enqueue indexing separately** — a new, independent `INDEXING_PENDING` transition and downstream indexing job (`DOCUMENT_INDEXING_AND_RECOVERY.md`), never inline in the same worker invocation that just finished generation.
15. **Mark the generation job `COMPLETED`.**
16. **Release all memory and temporary resources** — delete the temporary object-storage output (once the permanent version is confirmed), clear any in-memory buffers, remove any temporary local files.
17. **Exit safely when idle or when resource limits are reached** (see `DOCUMENT_MEMORY_EFFICIENCY.md`'s worker-recycling rule).

## Worker Safety Guarantees

- **Workers may disappear at any time.** A `kill -9`, an OOM kill, a spot-instance reclamation, or a network partition can happen between any two steps above. Nothing in this lifecycle assumes graceful shutdown.
- **Expired leases allow safe job recovery.** A recovery sweep (run by any worker on startup, or a lightweight scheduled check) finds jobs whose `lease_expires_at` has passed while still `CLAIMED`/`GENERATING`, and moves them to `RETRY_PENDING` (if `attempt_count < maximum_attempts`) or `FAILED` (if exhausted) — never leaves them stuck.
- **Every operation must be idempotent.** Re-running steps 5–15 for the same job after a crash-and-recover must not create two `DocumentVersion` rows, debit AI Credits twice, or leave two orphaned temporary objects. The idempotency key on the job (`DOCUMENT_GENERATION_JOB_SPEC.md`) and the completion-checklist validation (`DOCUMENT_STORAGE_AND_VERSIONING_SPEC.md`) together make this checkable before any side effect: "does a `DocumentVersion` already exist for this job?" is answered from PostgreSQL before a new one is created.
- **Duplicate delivery must not create duplicate versions.** If a queue redelivers a message for a job already `COMPLETED` (at-least-once delivery semantics), the worker checks the job's current PostgreSQL status first and no-ops if it is already terminal.
- **No confidential content in logs.** Prompts, generated document content, and storage paths are never written to worker logs — see `DOCUMENT_SECURITY_AND_AUDIT.md`.
- **No permanent reliance on local worker disks.** Any temporary file is deleted before the worker reports completion or exits; a crashed worker's orphaned temp files are cleaned up by ordinary container/instance recycling, never by application logic that assumes the file will still be there.
- **One active generation per worker initially.** Simpler failure modes, simpler memory budgeting, and a conservative starting point before any concurrency-per-worker tuning is considered — see `DOCUMENT_TRAFFIC_AND_CONCURRENCY.md`.
- **Graceful shutdown, where the platform allows it.** On a `SIGTERM` (as opposed to an unavoidable `SIGKILL`), a worker finishes its current step where safe, or releases its lease early (so another worker can pick the job up sooner) rather than holding it until expiry.
- **Bounded runtime and memory.** Hard limits on both, enforced per `DOCUMENT_MEMORY_EFFICIENCY.md` and `DOCUMENT_TRAFFIC_AND_CONCURRENCY.md`, so one runaway job cannot starve the fleet.
- **Automatic retry only where safe.** A transient provider error (429, 5xx — see `lib/ai/retry.ts`'s existing `isRetryableStatus`) is retried; a non-retryable error (invalid request, entitlement denial) goes straight to `FAILED` without wasting attempts.
- **Permanent document validation before job completion** — restated from step 10/11, because it is the guarantee that makes step 15 trustworthy.
