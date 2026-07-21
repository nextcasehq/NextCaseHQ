# Document Generation Job Specification

Status: **Approved, Phase 0 — Technical Specification** (implemented in Phase 4, see `DOCUMENT_CREATOR_IMPLEMENTATION_ROADMAP.md`)
Scope: The durable PostgreSQL record that makes AI document generation asynchronous, recoverable, and auditable.

## Why This Table Is New

Today, `POST /api/ai/draft` (`apps/web/src/app/api/ai/draft/route.ts`) generates synchronously within the web request — it calls `generateDraft()` and blocks until the AI provider responds, returning the content directly. This works for short generations but violates the target architecture's "AI generation never blocks the web server" objective and has no durable record of the request if the server restarts mid-call. `DocumentGenerationJob` is the new table that makes generation an asynchronous, durable, resumable unit of work — this is genuinely new infrastructure, not a rename of something that exists today (see `DOCUMENT_CREATOR_ARCHITECTURE_DECISION_RECORD.md`).

## Table: `DocumentGenerationJob`

| Field | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `tenant_id` | UUID, FK `Tenant`, NOT NULL | Own RLS policy, not FK-only, per project-wide convention. |
| `user_id` | UUID, FK `User`, NOT NULL | The advocate who requested generation. |
| `matter_id` | UUID, FK `Matter`, NULLABLE | Absent for matter-independent drafting. |
| `document_id` | UUID, FK `DocumentEnvelope`, NULLABLE | Absent until the first version exists (a brand-new document's first generation). |
| `source_version_id` | UUID, FK `DocumentVersion`, NULLABLE | The version being improved/refined, for `IMPROVE` mode. |
| `requested_action` | TEXT, CHECK | e.g. `DRAFT_CREATE`, `DRAFT_IMPROVE`, `IMPROVE_SELECTION` — mirrors the existing `AiActionKey`/operation-type vocabulary in `lib/ai/operation-types.ts` and `lib/ai-credits/types.ts`, unified rather than duplicated. |
| `status` | TEXT, CHECK | See state machine below. |
| `idempotency_key` | TEXT, UNIQUE per tenant | Client-supplied or derived; see "Idempotency" below. |
| `priority` | SMALLINT | Higher = served first; interactive advocate requests outrank background/batch work. |
| `attempt_count` | INTEGER, DEFAULT 0 | |
| `maximum_attempts` | INTEGER, DEFAULT (configurable) | |
| `provider` | TEXT | Which `AIProviderName` (`lib/ai/llm-provider.ts`) served this job. |
| `model` | TEXT | |
| `input_object_key` | TEXT, NULLABLE | Object-storage reference for the assembled prompt/context, if large enough to warrant off-DB storage; small inputs may be inlined instead — see `DOCUMENT_MEMORY_EFFICIENCY.md`. |
| `output_object_key` | TEXT, NULLABLE | Object-storage reference for the generated output before it is promoted to a `DocumentVersion`. |
| `credit_reservation_id` | UUID, NULLABLE | FK into the real `WalletTransactionRecord`/reservation mechanism — see `DOCUMENT_AI_CREDITS_LIFECYCLE.md`. |
| `queued_at` | TIMESTAMPTZ | |
| `started_at` | TIMESTAMPTZ, NULLABLE | |
| `heartbeat_at` | TIMESTAMPTZ, NULLABLE | Updated periodically by the owning worker while `GENERATING`. |
| `completed_at` | TIMESTAMPTZ, NULLABLE | |
| `failed_at` | TIMESTAMPTZ, NULLABLE | |
| `cancelled_at` | TIMESTAMPTZ, NULLABLE | |
| `error_code` | TEXT, NULLABLE | A safe, enumerable code (e.g. `AI_PROVIDER_NOT_CONFIGURED`, matching the existing `AIProviderNotConfiguredError`/`AIProviderRequestError` classes in `lib/ai/errors.ts`). |
| `safe_error_message` | TEXT, NULLABLE | Human-readable, never containing prompts, provider stack traces, or storage paths — see `DOCUMENT_SECURITY_AND_AUDIT.md`. |
| `lease_owner` | TEXT, NULLABLE | Worker instance identifier currently holding the job. |
| `lease_expires_at` | TIMESTAMPTZ, NULLABLE | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

## State Machine

```
QUEUED → CLAIMED → GENERATING → SAVING → INDEXING_PENDING → COMPLETED
```

Failure/terminal branches, reachable from any non-terminal state:

- `FAILED` — exhausted `maximum_attempts`, or a non-retryable error (e.g. entitlement denied, provider misconfigured).
- `CANCELLED` — the advocate or system explicitly cancelled the job.
- `EXPIRED` — the job's lease expired without the worker completing or heartbeating, and it was not eligible for automatic retry (see below).
- `RETRY_PENDING` — an expired or transiently-failed job is scheduled to re-enter `QUEUED` after backoff, up to `maximum_attempts`.

A job in `EXPIRED` or a retryable failure moves to `RETRY_PENDING` → `QUEUED` rather than being lost; only after `attempt_count` reaches `maximum_attempts` does it become terminally `FAILED`.

## Authoritative Storage Rule

- **PostgreSQL is the authoritative job record.** Every state transition above is a row update in `DocumentGenerationJob`, in the same transaction as any other durable side effect that transition implies (e.g., `SAVING` → `INDEXING_PENDING` happens in the same transaction that inserts the `DocumentVersion` row).
- **Redis may coordinate queue delivery and short-lived progress, but is never the only record of a job's existence or status.** If Redis is flushed, every `QUEUED`/`CLAIMED` job must still be discoverable and resumable from PostgreSQL alone (a recovery sweep re-enqueues anything `QUEUED` or `RETRY_PENDING` with no active lease).
- **Queue messages contain identifiers and storage references only** — the job `id`, and pointers (`input_object_key`, etc.), never the full document body or full prompt text. This bounds Redis payload size regardless of document size (see `DOCUMENT_MEMORY_EFFICIENCY.md`).

## Idempotency

- Every enqueue request carries (or is assigned) an `idempotency_key`, unique per tenant. A repeated click, a client retry after a timeout, or a duplicate webhook delivery that maps to the same key must not create a second job, a second generated document, or a second AI Credit deduction.
- On a duplicate enqueue attempt with a key that already maps to an existing job, the API returns the existing job's `id`/status rather than creating a new row (an upsert-on-conflict against the unique `(tenant_id, idempotency_key)` pair).

## API Contract

`POST` the generation-request endpoint returns **HTTP 202 Accepted** with the job `id` immediately — it does not hold the web request open until generation completes. Status is polled (or pushed, in a later phase) via a separate `GET` job-status endpoint, scoped by tenant and validated `job_id` (see `DOCUMENT_SECURITY_AND_AUDIT.md` for identifier-validation and rate-limit requirements on that endpoint).
