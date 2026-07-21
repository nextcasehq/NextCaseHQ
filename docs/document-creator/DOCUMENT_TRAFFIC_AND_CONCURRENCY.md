# Document Traffic and Concurrency Control

Status: **Approved, Phase 0 — Technical Specification**
Scope: How the Document Creator behaves under load — from a single advocate double-clicking Generate, to many tenants generating simultaneously.

## Initial Controls

- **One active AI-document generation per user.** While a user has a job in any non-terminal state (`QUEUED` through `INDEXING_PENDING`), a new generation request from that same user for the same or a different document is either queued behind it or rejected with a clear "you already have a generation in progress" response — never silently accepted as a second concurrent job for the same person.
- **Configurable concurrent-job limit per tenant.** Prevents one large firm's burst of activity from starving every other tenant sharing the same worker fleet. Configured, not hardcoded, so it can be tuned per pricing tier without a code change.
- **Configurable global provider limit.** Caps total in-flight requests to a given AI provider across all tenants, respecting that provider's own rate limits and NextCaseHQ's cost exposure.
- **Maximum queue depth.** Beyond a configured depth, new jobs are not admitted (see "When Overloaded" below) rather than queued indefinitely.
- **Request-size limits.** Bound on input (facts, existing content, improve-instruction length — extending the existing `DraftBodySchema` limits already in `apps/web/src/app/api/ai/draft/route.ts`, e.g. `existing_content` max 50000, `improve_instruction` max 2000) and on expected output size.
- **Generation timeout.** A job that has been `GENERATING` past a configured duration is treated as failed (lease expiry handles the crash case; this handles the "provider is technically responding but absurdly slowly" case).
- **Bounded retries with exponential backoff and jitter.** Extends the existing `lib/ai/retry.ts` pattern (already used for provider calls) to the job level: a `RETRY_PENDING` job waits `baseDelay * 2^attempt ± jitter` before re-entering `QUEUED`, up to `maximum_attempts`.
- **Circuit breaker for provider failures.** If a provider is failing broadly (not just for one job), new jobs targeting that provider are held or fast-failed with a clear "provider temporarily unavailable" response rather than each one individually timing out and burning retry budget.
- **Cancellation support.** An advocate can cancel a `QUEUED` or in-flight job; cancellation is a real, auditable state transition (`CANCELLED`), not just a client-side "stop polling."
- **Priority for interactive advocate requests.** A job initiated by an advocate actively waiting in the UI outranks background/batch-style generation (e.g., a future bulk-drafting feature) in queue ordering, via the `priority` field on `DocumentGenerationJob`.

## Queue Admission Control

New jobs are admitted into the durable queue only while capacity permits, per the limits above. Admission is checked at enqueue time, before AI Credits are reserved (see `DOCUMENT_AI_CREDITS_LIFECYCLE.md` — no reservation for a request that cannot be accepted).

## When Overloaded

- **Accept valid jobs into the durable queue where capacity permits** — a full queue rejects new admissions; a queue with room still accepts and queues them, even if they won't start immediately.
- **Show a `Queued` status** to the advocate — an honest, specific state, not a generic spinner.
- **Never leave the interface on an endless loader.** This is the same discipline enforced in Phase 1 (PR #138): every loading state has a defined terminal condition — `Queued` with a real position/estimate is itself a terminal UI state, distinct from "still figuring out what to show."
- **Preserve manual drafting.** Congestion in the AI generation path never blocks the advocate from typing and autosaving, per Constitution Rule 4.
- **Reject excess requests with a clear, retryable response.** When the queue is at its configured maximum depth, a new request is rejected with a response that says so explicitly and indicates it is safe to retry shortly — not a generic 500.
- **Do not reserve AI Credits for requests that cannot be accepted.** Rejected-at-admission requests never touch the credit-reservation flow at all (see `DOCUMENT_AI_CREDITS_LIFECYCLE.md`).

## Future Horizontal Scaling — Deliberately Undecided Here

The controls above are expressed as configuration, not as a specific number of worker replicas, a specific autoscaling policy, or a specific queue-partitioning scheme — those are Phase 5/8 implementation decisions, made when real traffic data exists to inform them. Per `DOCUMENT_CREATOR_GOVERNANCE.md` §3, **no premature infrastructure** (Kafka, Kubernetes, or other complex orchestration) is introduced without evidence — gathered from operating the simpler PostgreSQL-plus-Redis-plus-ephemeral-worker model described in this directory — that it is actually required.

## Execution Kernel Alignment

Every control in this document is enforced through the Policy Engine defined in `DOCUMENT_CREATOR_EXECUTION_KERNEL.md` §5 — concurrency limits, queue-admission limits, request-size limits, retry/cancellation eligibility, and provider capacity are all named explicitly in that section's evaluation list. The Policy Engine's typed results map directly onto this document's language: `ALLOW` corresponds to ordinary admission; `DEFER` and `RETRY_LATER` correspond to this document's "accept into the queue where capacity permits" and "reject with a clear, retryable response" behaviors respectively; `DENY` corresponds to a hard rejection (e.g., entitlement-level, not merely capacity-level). The Policy Engine never itself enqueues, generates, or reserves credits (kernel §5.3) — it only returns one of these typed results, which the calling command handler (kernel §3.3) then acts on.
