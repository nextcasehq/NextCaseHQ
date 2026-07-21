# Document Security and Audit

Status: **Approved, Phase 0 — Technical Specification**
Scope: Security and audit requirements that apply across every Document Creator phase.

## Identity and Trust

- **Server-resolved tenant and user identity.** Every Document Creator API route resolves `tenant_id` and `user_id` from the verified session (`requireSession()` in `apps/web/src/lib/auth/session.ts`, the same pattern already used by every real route in this codebase) — never from a client-supplied header, query parameter, or request body field.
- **No trust in client-supplied ownership or role data.** A request's claimed `matter_id`, `document_id`, or `tenant_id` is always re-validated server-side against what the authenticated session is actually authorized to touch — the client's claim is a lookup key, never a grant of access.

## Storage and Transport

- **Tenant-scoped object storage.** Object keys are namespaced per tenant (per `lib/storage/document-key.ts`'s existing convention), so no key path can be guessed or reused across tenants.
- **Short-lived signed access.** Preview/download access to stored document bytes uses time-limited signed URLs or an equivalent server-mediated proxy — never a long-lived or unauthenticated public URL.
- **Encryption in transit and at rest.** TLS for all network hops (already enforced platform-wide via the existing `Strict-Transport-Security` header in `lib/security/security-headers.ts`); at-rest encryption via the object storage provider's native encryption, consistent with how the platform already treats confidential content.

## Input Validation

- **All document and job identifiers are validated** (UUID format, existence, tenant ownership) before use — matching the existing pattern already present in `POST /api/matters/[id]/close` and `POST /api/matters/[id]/reopen`'s `UUID_PATTERN` checks, extended to every new Document Creator identifier (`document_id`, `job_id`, `envelope_id`).

## Rate Limiting

- **Enqueue, cancel, and status endpoints are all rate-limited**, using the existing distributed rate-limiter (`lib/security/redis-rate-limit.ts`, falling back to the in-memory `rate-limit.ts` when Redis is unconfigured) — the same infrastructure already protecting `/api/auth/session` and `/api/admin/session`, applied to the new generation-job endpoints rather than a bespoke new limiter.

## Audit Events

Every one of the following is a recorded, tenant-scoped audit event (reusing the existing audit-table pattern — `MatterAuditEvent`'s append-only, `REVOKE UPDATE, DELETE` model, or `SecurityAuditTrail`'s signed-chain model where tamper-evidence is warranted, per what each event's sensitivity requires):

- Autosave (a durable draft write — at minimum, latest-revision metadata, not necessarily every debounce interval)
- Generation request (enqueue)
- Job claim (which worker, when)
- Retry (attempt number, reason)
- Cancellation (who, when)
- Failure (error code, never the raw provider error/stack)
- Version creation (which job produced it, if AI-assisted; which advocate, if manual)
- AI Credit events (reservation, debit, release, reversal)
- Indexing (status transitions, especially `FAILED`/`RETRYING`)
- Advocate confirmation (the explicit act of marking a version final, per Constitution Rule 3)

## What Must Never Be Exposed

Provider errors, prompts, secrets, storage paths, and confidential document content are never exposed through:

- API responses (error bodies return a `safe_error_message`/`error_code` pair, as `DocumentGenerationJob` already models — never the underlying exception's message or stack)
- Logs (worker and server logs record identifiers, statuses, and durations — never prompt text, generated content, or object-storage paths). This extends the existing platform-wide convention already visible in `lib/documents/access-audit.ts` and the webhook handler's "Payload scrubbed" logging pattern.
- Client-visible audit views (an advocate can see *that* an event happened and *when*, not the raw internal error detail behind a `FAILED` job).
