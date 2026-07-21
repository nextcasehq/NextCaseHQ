# Document Indexing and Recovery

Status: **Approved, Phase 0 — Technical Specification** (implemented in Phase 6, see `DOCUMENT_CREATOR_IMPLEMENTATION_ROADMAP.md`)
Scope: Making search indexing a separate, recoverable process that can never take a document down with it.

## Existing Foundation (reused, extended, not rebuilt)

`apps/web/src/lib/search/indexing.ts` already implements the pipeline this spec formalizes as a job: extract text (`text-extraction.ts`), chunk it (`chunking.ts`), embed it (`embedding-provider.ts`), and store chunk vectors (`DocumentChunkVector`, `vector-format.ts`). `DocumentEnvelope` already carries `index_status` (`NOT_INDEXED` / `INDEXING` / `INDEXED` / `FAILED`), `indexed_version_number`, `index_error`, and `index_updated_at`. Today this runs as a **synchronous, inline call** from the upload path — this spec's gap is making it an independent, recoverable, asynchronously-retried job, not replacing the extraction/chunking/embedding logic itself.

## Flow

```
Permanent DocumentVersion
  → Text extraction        (lib/search/text-extraction.ts)
  → Metadata extraction     (document_type, matter_id, tenant_id, version number)
  → Search chunks           (lib/search/chunking.ts)
  → Tenant-scoped index      (DocumentChunkVector, embedding via lib/search/embedding-provider.ts)
  → Index status updated     (DocumentEnvelope.index_status, .indexed_version_number)
```

## Status Model

The existing four statuses are extended with one more to support asynchronous retry:

- **PENDING** — a `DocumentVersion` exists and is queued for indexing but not yet started. (New: today's model jumps straight to `INDEXING`; a durable job needs a pre-start queued state, matching `DocumentGenerationJob`'s own `QUEUED`.)
- **PROCESSING** — indexing is actively running (renames/aligns with today's `INDEXING`, for consistency with the generation job's own `GENERATING` naming).
- **INDEXED** — chunks are stored and searchable; `indexed_version_number` reflects exactly which version they came from.
- **FAILED** — indexing was attempted and did not succeed after exhausting retries.
- **RETRYING** — a transient failure occurred and another attempt is scheduled (new state; today's model has no distinction between "failed once, will retry" and "permanently failed").

## Rules

1. **The original document remains available even if indexing fails.** `DocumentEnvelope`/`DocumentVersion` rows and their object-storage content are entirely independent of `index_status`. A document stuck in `FAILED` indexing is still fully previewable, downloadable, and restorable — this is Constitution Rule 8 made concrete.
2. **Failed indexing retries independently.** A `FAILED`-then-eligible-for-retry document moves to `RETRYING` → `PENDING` on its own schedule, using the same bounded-retry-with-backoff pattern as generation jobs (`DOCUMENT_TRAFFIC_AND_CONCURRENCY.md`), never blocking or being blocked by the document's own generation/edit history.
3. **Search indexes enforce tenant isolation.** `DocumentChunkVector` (and any downstream search-service query against it, `lib/search/search-service.ts` / `hybrid-search.ts`) is tenant-scoped with its own RLS policy — not merely inherited via the `envelope_id` foreign key, per the project-wide FK-bypasses-RLS lesson already documented in `db/schema.sql`'s own migration comments for this exact table.
4. **Preserve source-version and page/section references.** Every indexed chunk records which `DocumentVersion` it came from (`indexed_version_number` at the envelope level today; chunk-level version linkage is part of the Phase 6 gap) and, where extractable, a page/section locator — so a search result can be traced back to precisely where in precisely which version it lives, never just "somewhere in this document."
5. **Never treat generated or unverified legal content as verified authority.** An indexed chunk from an AI-assisted, not-yet-advocate-confirmed `DocumentVersion` is searchable but carries that provenance in its metadata — search results distinguish "your own draft, still under review" from confirmed, final content, and never present either as external legal authority.
6. **Failed indexing must never roll back permanent document storage.** Indexing is strictly downstream and additive; no indexing failure path ever deletes, reverts, or blocks the `DocumentVersion` transaction that already committed.

## Execution Kernel Alignment

`EnqueueIndexingCommand` (`DOCUMENT_CREATOR_EXECUTION_KERNEL.md` §3.1) is the typed command a worker issues at kernel state `INDEXING_PENDING` (kernel §4.1) — the same state named in this document's flow diagram. Rule 6 above is the concrete instance, for indexing specifically, of the kernel's general failure-recovery principle (kernel §11): "none of these recovery paths ever touches an already-created, permanent `DocumentVersion`." Nothing in the kernel document changes this document's status model or pipeline — indexing's `PENDING`/`PROCESSING`/`INDEXED`/`FAILED`/`RETRYING` states are a downstream detail the kernel's `INDEXING_PENDING` → `COMPLETED` transition treats as a single opaque step it enqueues and moves on from, exactly as `EnqueueIndexingCommand` implies.
