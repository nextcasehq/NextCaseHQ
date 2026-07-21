# Document Storage and Versioning Specification

Status: **Approved, Phase 0 — Technical Specification** (implemented in Phase 3, see `DOCUMENT_CREATOR_IMPLEMENTATION_ROADMAP.md`)
Scope: What makes a generated or manually-drafted document "permanently complete," building directly on the existing `DocumentEnvelope`/`DocumentVersion` tables.

## Existing Foundation (reused, not rebuilt)

`db/schema.sql` already defines the two tables this spec extends conceptually, not structurally, unless a named gap requires a migration:

- **`DocumentEnvelope`** — the stable identity of a document: `id`, `tenant_id`, `case_id` (optional), `matter_id` (optional), `title`, `storage_structure` (mirrors the *current* version), `document_type`, and indexing status columns (`index_status`, `indexed_version_number`, `index_error`, `index_updated_at`).
- **`DocumentVersion`** — append-only version history: `id`, `tenant_id`, `envelope_id`, `version_number` (unique per envelope, `CHECK > 0`), `title`, `storage_structure`, `created_by`, `created_at`.

Both already carry `tenant_id` with their own RLS policy (not relying on the FK alone — the established project-wide lesson, restated in every table's own migration comment). `DocumentVersion.envelope_id` deliberately has no `ON DELETE CASCADE`, so deleting an envelope's storage objects and version rows must be an explicit, ordered application action — never an implicit cascade that could silently destroy history.

## Completion Checklist

A generated or manually-drafted document is not considered complete — and a `DocumentGenerationJob` may not be marked `COMPLETED` (see `DOCUMENT_GENERATION_JOB_SPEC.md`) — until **all** of the following hold:

1. A permanent `DocumentEnvelope` row exists (or already existed, for a new version of an existing document).
2. A permanent `DocumentVersion` row exists, with a `version_number` one greater than the prior highest for that envelope.
3. The corresponding object-storage content exists at the key recorded in that version's `storage_structure`, and has been read back and validated as complete (see "Validation Before Completion" below).
4. The `tenant_id` and, where applicable, `matter_id` links are correct and match the request that produced the document.
5. A content hash of the stored bytes is recorded, so later integrity checks (and duplicate-delivery detection, see `EPHEMERAL_WORKER_ARCHITECTURE.md`) don't require re-fetching the object.
6. `document_type` and any classification metadata are recorded, matching the approved vocabulary in `lib/domain/document-type.ts`.
7. Creator and source metadata are recorded: which user/advocate initiated it, and — for AI-assisted content — a reference to the `DocumentGenerationJob` that produced it.
8. The version is confirmed previewable and downloadable through the existing document read paths (`GET /api/documents/[id]`, `GET /api/documents/[id]/preview`, `GET /api/documents/[id]/download`) before the job reports success.

## Object Storage

- Uses the existing provider-agnostic adapter (`apps/web/src/lib/storage/object-storage.ts`, S3-compatible via `@aws-sdk/client-s3`), unconfigured-safe (`getObject`/`putObject` return/throw a clear "not configured" signal rather than silently no-op'ing — see `DOCUMENT_SECURITY_AND_AUDIT.md` for how that surfaces to the advocate).
- Object keys are tenant-scoped, following the existing convention in `lib/storage/document-key.ts` — never a globally-flat key space where one tenant's key could collide with or be guessed from another's.
- Access to a stored object for preview/download is via short-lived signed URLs or a server-side proxy that itself re-checks tenant/session authorization — never a long-lived or publicly-guessable URL.

## Version Semantics

- **Never silently overwritten**: no code path performs an `UPDATE` of a `DocumentVersion`'s `storage_structure` or content-bearing fields after creation. A change is always a new row with the next `version_number`.
- **Never silently deleted**: deleting a version (if ever permitted) is an explicit, audited action (see `DOCUMENT_SECURITY_AND_AUDIT.md`'s audit-event list), never an implicit side effect of another operation.
- **Restore workflow**: restoring an old version creates a *new* version whose content matches the restored one — it does not rewrite history to make the old version "current" again. `DocumentEnvelope.storage_structure`/`title` continue to mirror whatever the latest version is, per the existing convention.

## Review-Status Lifecycle

Every version created through the AI-assisted path carries an explicit status distinct from "just exists":

- **AI-assisted** — produced or modified by a generation job; not yet reviewed.
- **Advocate-reviewed** — an advocate has opened and read the content, but has not yet formally confirmed it as final.
- **Advocate-confirmed / Final** — an advocate has explicitly confirmed this version as the document of record.

Per Constitution Rule 3, no automated process ever transitions a version to Advocate-confirmed on its own. Manually-drafted versions (never touched by AI) may skip directly to Advocate-confirmed, since there is nothing AI-originated to review.

## Validation Before Completion

Before a worker (or the manual-save path) reports a version as stored, it must:

1. Re-read the object it just wrote (or verify via the storage provider's integrity response) to confirm it is retrievable and non-empty.
2. Confirm the recorded content hash matches the bytes actually stored.
3. Confirm the `DocumentVersion` row's `version_number` did not collide with a concurrently-created version for the same envelope (the existing `UNIQUE ("envelope_id", "version_number")` constraint enforces this at the database level; the application must handle that constraint violation as a signal to retry with the next number, not as a fatal error).
