# Document Creator Constitution

Status: **Approved, Phase 0 — Governance Document**
Scope: The Document Creator (drafting, autosave, AI generation, storage, versioning, indexing) only. This document does not alter the wider NextCaseHQ architecture.

## Purpose

This constitution defines the rules the Document Creator must never violate, regardless of milestone, deadline, or implementation convenience. Every later specification in `docs/document-creator/` is subordinate to this document. Where a later spec appears to conflict with a rule here, the rule here wins and the spec must be corrected.

## Immutable Rules

1. **An advocate's typed work must never disappear.** Once content exists in the editor, it must be recoverable — from local storage, from the server, or from both — through a refresh, a crash, a network loss, or an accidental tab closure. "The user lost their work" is never an acceptable outcome of a bug.

2. **Every document must be permanently preserved.** A document that reaches a completed or saved state is stored durably (PostgreSQL metadata + object storage bytes) and remains retrievable for as long as the tenant's data retention policy requires. Ephemeral compute (workers, queues, caches) may touch a document in transit; it may never be the only place a document exists.

3. **AI assists; the advocate reviews and confirms.** No AI-generated or AI-modified content is ever presented as final, verified, or advocate-approved until a human with authority over the matter explicitly confirms it. AI output is always labeled as AI-assisted until that confirmation happens.

4. **Manual drafting must remain available.** The advocate can always create, edit, and save a document by typing, independent of whether an AI provider is configured, reachable, rate-limited, or degraded. AI is an enhancement to drafting, never a prerequisite for it.

5. **Previous versions must never be silently overwritten.** Every meaningful change that supersedes prior content creates a new, additional version. The old version remains readable and restorable. "Silently" includes both application bugs and well-intentioned "cleanup" — there is no code path that deletes or mutates an existing `DocumentVersion` row's content.

6. **Tenant isolation is mandatory.** No document, draft, job, credit reservation, audit event, or search result is ever visible to, writable by, or inferable by a tenant other than the one that owns it. This applies to every layer: database rows (tenant-scoped RLS), object storage keys (tenant-scoped prefixes), queue messages, worker memory, logs, and error messages.

7. **Documents must survive worker crashes.** A worker process may be killed, OOM-terminated, or lose network connectivity at any point during generation. When that happens, the system must recover the job (via lease expiry) without losing the underlying draft, without double-charging AI Credits, and without corrupting the document record.

8. **Indexing failure must never cause document loss.** Search indexing is a downstream, best-effort enhancement. If indexing fails, retries, or is permanently unavailable, the underlying document and its versions remain fully intact, previewable, and downloadable. A missing search result is a degraded experience; a missing document is a data-loss incident.

9. **AI workers are temporary execution engines.** A worker holds no long-term state. Everything a worker needs to resume or explain its work is derivable from PostgreSQL, object storage, or the queue — never from a worker's local disk, memory, or an assumption that "the same worker will pick this up again."

10. **PostgreSQL, object storage, and GitHub remain authoritative.** PostgreSQL is authoritative for structured state (documents, versions, jobs, credits, audit). Object storage is authoritative for document bytes. GitHub is authoritative for the code and documentation that define this system's behavior. Redis, in-memory caches, and worker-local state are performance and coordination aids only — never a system of record for anything covered by Rules 1–9.

11. **No feature may claim completion until verified end to end.** "The code compiles" and "the route returns 200" are not completion. A milestone is complete only when its acceptance criteria (see `DOCUMENT_CREATOR_IMPLEMENTATION_ROADMAP.md`) have been exercised against the real flow — real database, real (or honestly-simulated) storage, real failure injection where the milestone claims resilience — and the results are reported plainly, including what was not verified.

## Precedence

If any future specification, pull request, or Product Owner instruction appears to require violating one of these rules, that conflict must be raised explicitly before implementation — not resolved silently in code. See `DOCUMENT_CREATOR_GOVERNANCE.md` §"Architecture-Deviation Approval Process."

## Execution Kernel Alignment

`DOCUMENT_CREATOR_EXECUTION_KERNEL.md` defines the internal execution architecture (authoritative-state model, command pattern, validated state machine, Policy Engine, Context Loader, Prompt Composer, Worker Runtime) that *enforces* these rules in code once implemented — it introduces no new rule and may not weaken any rule above. Rule 9's "workers hold no long-term state" and Rule 10's "PostgreSQL, object storage, and GitHub remain authoritative" are given their fullest, most specific expression in that document's §1 ("Authoritative-State Architecture"); Rule 7's crash-survival guarantee is given its fullest expression in that document's §9–§11 (Ephemeral-Worker Execution Rules, Idempotency Boundaries, Failure-Recovery Rules). The Execution Kernel document is scoped only to the Document Creator, exactly as this Constitution is — it is not a platform-wide kernel.
