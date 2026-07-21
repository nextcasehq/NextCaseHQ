# Document Memory Efficiency

Status: **Approved, Phase 0 — Technical Specification**
Scope: The constraints that keep AI document generation from overloading NextCaseHQ's memory, Redis, or database as traffic and document sizes grow. Applies across Phases 4–8.

## Principles

1. **No full documents in Redis queue payloads.** A queue message contains a job `id` and storage references only (per `DOCUMENT_GENERATION_JOB_SPEC.md`). Redis memory usage is therefore bounded by job *count*, never by the size of any individual document.
2. **Large inputs and outputs are stored in object storage**, not in PostgreSQL columns or Redis values. The database holds references (`input_object_key`, `output_object_key`); object storage holds bytes.
3. **Storage references are passed between services** — the web server, the queue, and the worker all pass around the same job `id`/object keys, never the content itself, until the worker actually needs to read or write that content.
4. **Provider responses are streamed**, not buffered in full before being written onward. A worker writes AI provider output to temporary object storage as it arrives, rather than accumulating the entire document string in process memory first.
5. **Very large documents are processed in bounded sections** where the drafting flow supports it (e.g., a long document assembled section-by-section) rather than requiring one unbounded single-shot generation call and buffer.
6. **Limited Matter Register context, not the entire Matter.** The AI Context Gateway's existing ranking and budget model (`lib/ai/context/ranking.ts`, `ContextBudget` in `lib/ai/context/types.ts`) is reused as the enforcement point — a generation job never loads every document, event, and note attached to a Matter, only the ranked, budgeted subset already designed for this purpose.
7. **Avoid repeated copies of document content in memory.** Passing a storage key or a stream handle between functions, rather than passing the full string/buffer through multiple layers, is the default; a function that needs to transform content transforms it in place or streams through, rather than holding "before" and "after" copies simultaneously without reason.
8. **Backpressure while streaming.** If the consumer of a stream (object storage write, or a downstream transform) is slower than the producer (the AI provider), the write path applies backpressure rather than buffering unboundedly in memory while waiting.
9. **Strict input-size, output-size, execution-time, and memory limits** are configured and enforced (see `DOCUMENT_TRAFFIC_AND_CONCURRENCY.md` for the specific limit types) — a job that would exceed a limit is rejected at admission time with a clear, retryable error, not accepted and then allowed to degrade the worker fleet.
10. **Temporary objects are deleted only after permanent storage is confirmed** (`EPHEMERAL_WORKER_ARCHITECTURE.md` step 16) — never eagerly, and never left indefinitely; a job that fails after writing a temporary object is responsible (directly, or via a recovery sweep on expired leases) for cleaning that object up too.
11. **Workers are recycled** after a configured number of completed jobs, or when their process memory crosses a configured threshold — whichever comes first — so gradual memory growth (fragmentation, provider-SDK caches, etc.) never accumulates into an OOM over a long-lived worker's life.
12. **One large generation job per worker, not several concurrently.** Restated from `EPHEMERAL_WORKER_ARCHITECTURE.md`'s "one active generation per worker initially": concurrent large jobs on the same worker multiply memory pressure unpredictably, so the starting posture is strictly sequential per worker, with horizontal scaling (more workers) as the lever for throughput instead.

## What This Deliberately Does Not Do Yet

This document does not specify a target memory ceiling in megabytes, a specific streaming library, or a specific object-storage multipart-upload threshold — those are implementation details decided within the Phase 4/5 PRs themselves, informed by real measurement, and are expected to cite this document rather than duplicate it.
