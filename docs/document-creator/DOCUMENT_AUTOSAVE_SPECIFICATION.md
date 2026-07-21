# Document Autosave Specification

Status: **Approved, Phase 0 — Technical Specification** (implemented in Phase 2, see `DOCUMENT_CREATOR_IMPLEMENTATION_ROADMAP.md`)
Scope: Continuous preservation of an advocate's in-progress typed content, independent of AI generation.

## Objective

Satisfy Constitution Rule 1 ("an advocate's typed work must never disappear") without violating Rule 5 ("previous versions must never be silently overwritten") — autosave writes frequently to a *draft* record; it does not create a new permanent `DocumentVersion` on every keystroke.

## Two-Tier Recovery Model

### Tier 1 — Local Recovery (immediate, offline-safe)

- Every edit is mirrored to a browser-local store using IndexedDB (or the project's already-approved browser-storage abstraction, if one is adopted before Phase 2 implementation — no new storage abstraction is introduced without the reuse check in `DOCUMENT_CREATOR_GOVERNANCE.md` §4).
- This write is synchronous-feeling (no network round trip) and survives: a page refresh, a browser crash, an accidental tab closure, and any period of network loss.
- On reopening the same draft in the same browser, the local copy is checked against the server's copy; if the local copy is newer (per revision, see "Conflict Detection" below), the advocate is offered recovery before the server copy silently wins.

### Tier 2 — Server Autosave (durable, cross-device)

- After a short debounce (edits pause, not edits themselves), the current editor content is sent to a durable draft-record endpoint.
- The durable draft record is a real PostgreSQL row, tenant-scoped, linked to the advocate/user, the Matter Register (where applicable), and the document type — per `DOCUMENT_CREATOR_MEMORY_MODEL.md`'s Cold Memory placement.
- This is the record that makes the draft recoverable on a *different* device or after local storage is unavailable (private browsing, cleared storage, different browser).

## Status Indicators

The editor UI always reflects one of exactly four states, sourced from the actual outcome of the last autosave attempt — never optimistically assumed:

- **Saving** — a debounced autosave request is in flight.
- **Saved** — the last autosave request succeeded; the durable draft record reflects the content shown.
- **Offline** — the client has detected it cannot reach the server (network loss); local recovery (Tier 1) continues to protect the content.
- **Save Failed** — a server autosave request was attempted and failed for a reason other than being offline (e.g., a 5xx, a validation rejection); the advocate is shown this distinctly from "Offline" so they know a network fix alone will not resolve it.

## Recovery Scenarios

| Event | Guarantee |
|---|---|
| Refresh | Editor reopens from the durable draft record; if a newer local copy exists (Tier 1), the advocate is prompted to recover it. |
| Browser crash | Same as refresh — the durable draft record and/or the local IndexedDB copy, whichever is newer, is offered. |
| Temporary network loss | Local recovery (Tier 1) continues uninterrupted; server autosave (Tier 2) resumes and catches up once connectivity returns, without data loss. |
| Accidental tab closure | Same as refresh. |

## Concurrency Control

- Every durable draft record carries a revision field (a monotonically increasing integer or a server-issued timestamp/etag).
- A server autosave write includes the revision it was based on. If the server's current revision has since moved (a different device or tab saved first), the write is rejected as a conflict rather than silently overwriting the newer content — this is optimistic concurrency, not last-writer-wins.
- On a detected conflict, the client surfaces it as a recoverable state (not a silent failure): the advocate is shown both versions' recency and chooses how to proceed, consistent with Constitution Rule 5.

## Permanent Version Creation — Explicitly Not Every Keystroke

Autosave writes to the mutable *draft* record only. A new, immutable `DocumentVersion` (see `DOCUMENT_STORAGE_AND_VERSIONING_SPEC.md`) is created only when one of these meaningful events occurs:

1. The advocate manually creates a version (an explicit "Save Version" / "Create Version" action).
2. AI-generated or AI-refined output is accepted by the advocate into the document.
3. The document is submitted for review.
4. The document is finalised / advocate-confirmed.

This keeps version history meaningful (a handful of real checkpoints per document) rather than one row per debounce interval, while autosave itself remains unconditional and continuous.

## No Dependence on a Final Save Button

The system must never require the advocate to remember to click a terminal "Save" button to avoid data loss — that guarantee is what Tier 1 + Tier 2 autosave together provide. A manual "Save Version" button remains available (event 1 above), but its absence of use is never a loss scenario.
