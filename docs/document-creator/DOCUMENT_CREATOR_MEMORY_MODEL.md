# Document Creator Memory Model

Status: **Approved, Phase 0 — Architecture Specification**
Scope: Defines what state the Document Creator treats as durable ("Cold Memory") versus transient ("Hot Memory"), and the rules governing each.

## Why This Split Matters

The Document Creator spans a browser tab, a Next.js server, a job queue, and ephemeral workers. Without an explicit model of what each layer is allowed to be the only copy of, it is easy to build a system where a worker crash or a browser refresh loses real advocate work (violates Constitution Rule 1) or where a queue message silently becomes the system of record for something PostgreSQL should own (violates Constitution Rule 10).

## Cold Memory

Cold Memory is durable, authoritative, and changes only through deliberate, auditable action. It survives every worker crash, every browser refresh, every Redis restart.

- **Permanent drafting policies** — the rules in this `docs/document-creator/` directory itself, versioned in git.
- **Approved document types** — the fixed vocabulary in `apps/web/src/lib/domain/document-type.ts` (`DOCUMENT_CATEGORIES`, per-category types, fact fields) and its mirrored CHECK constraint on `DocumentEnvelope.document_type` in `db/schema.sql`.
- **Approved templates** — any future template content, stored the same way document types are: as reviewed, versioned data, not as inline strings scattered across UI components (the current `draft-builder` page's inline `DraftTemplate[]` array is a Phase 1 prototype pattern, not the Cold Memory home for templates going forward).
- **Legal drafting rules** — jurisdictional pack content already governed by `packages/country-packs` and `packages/legal-kernel`.
- **Retention and versioning rules** — how long a `DocumentVersion` is retained, and the append-only guarantee itself (Constitution Rule 5).
- **Security boundaries** — tenant isolation policy (RLS), the object-storage key-scoping rule (`DOCUMENT_STORAGE_AND_VERSIONING_SPEC.md`), and the authentication/session model already defined in `apps/web/src/lib/auth/`.
- **Worker architecture** — the lifecycle and guarantees defined in `EPHEMERAL_WORKER_ARCHITECTURE.md`.
- **Indexing rules** — the pipeline and status model in `DOCUMENT_INDEXING_AND_RECOVERY.md`.
- **Product Owner decisions** — recorded in `DOCUMENT_CREATOR_ARCHITECTURE_DECISION_RECORD.md`'s decision log.

Cold Memory lives in PostgreSQL (structured rows), git (documentation and code), and object storage (document bytes and permanent template assets) — never in Redis, never in a worker's memory, never in `localStorage`/`sessionStorage` alone.

## Hot Memory

Hot Memory is transient, working-set state that exists to make the system fast or coordinated, not to be the only copy of anything durable.

- **Current draft** — the in-progress editor buffer, mirrored to the durable draft record per `DOCUMENT_AUTOSAVE_SPECIFICATION.md`.
- **Current document version** — which `DocumentVersion` the editor is currently based on, tracked for optimistic-concurrency purposes.
- **Generation-job status** — the live `QUEUED`/`CLAIMED`/`GENERATING`/... state surfaced to the UI while `DocumentGenerationJob` (PostgreSQL) remains authoritative for the same status.
- **Selected Matter Register context** — which Matter a draft is scoped to, and the ranked context items the AI Context Gateway (`lib/ai/context/gateway.ts`) assembled for one generation call.
- **Temporary AI prompt context** — the assembled prompt payload for one in-flight generation call. Never persisted verbatim (see `DOCUMENT_SECURITY_AND_AUDIT.md` — no prompts in logs).
- **Worker lease** — which worker currently owns a job, and until when (`DocumentGenerationJob.lease_owner` / `lease_expires_at`).
- **Retry state** — attempt count and backoff timing for a job in flight.
- **Progress state** — UI-facing progress percentage/step, if surfaced.
- **Temporary storage references** — object-storage keys for in-progress output before it is validated and promoted to a permanent `DocumentVersion`.

Hot Memory lives in Redis (queue coordination, short-lived progress), worker process memory (strictly for the duration of one job), and the browser (the editor's live buffer, mirrored per the autosave spec).

## Rules

1. **Hot Memory must be reconstructable from authoritative systems.** If Redis is flushed or a worker is killed mid-job, every piece of Hot Memory must be re-derivable from PostgreSQL (the job row, the draft record) and object storage (the input/output references) — never from "hope the worker remembers." This is the same guarantee Constitution Rule 9 requires of workers generally.

2. **Workers must not become permanent memory holders.** A worker never accumulates state across jobs beyond what `EPHEMERAL_WORKER_ARCHITECTURE.md`'s "one active generation per worker initially" model allows for the single job it is currently processing. No worker-local database, no worker-local file that outlives the job.

3. **Confidential documents must not remain on worker disks.** Any temporary file a worker writes while processing a job (e.g., for streaming assembly) is deleted before the worker reports the job complete or exits, whichever comes first. This applies even on a crash-and-recover path — the recovering worker (or a cleanup job) is responsible for removing orphaned temporary files tied to expired leases.

4. **Cold Memory changes require explicit approval and versioning.** A change to an approved document type, a legal drafting rule, or a retention policy is a Product Owner-approved decision, recorded in the ADR's decision log, and lands as its own reviewed change — never as a side effect of an unrelated code change.
