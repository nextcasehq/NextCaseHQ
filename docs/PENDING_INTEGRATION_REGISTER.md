# Pending Integration Register

This register tracks deferred integration, testing, and optimization work for NextCaseHQ Modules 13–20.

| Module | Task | Integration Status | Reason for Deferral | Priority |
|---|---|---|---|---|
| 13 | Edge Webhook Byte Handling | COMPLETED | Type reconciliation complete | Medium |
| 14 | Design Token Mapping | COMPLETED | Cross-package linking complete | Medium |
| 15 | Observability/Audit Logic | COMPLETED | Cross-package linking complete | High |
| 16 | Messaging Delivery Fallback | COMPLETED | Cross-package linking complete | Medium |
| 17 | Advanced File Ingestion | COMPLETED | Type reconciliation complete | High |
| 18 | US FRCP Country Pack | COMPLETED | Cross-package linking complete | Medium |
| 19 | UK CPR Country Pack | COMPLETED | Cross-package linking complete | Medium |
| 20 | Deployment Topology | COMPLETED | Scaffolding complete | Medium |
| ALL | Security Audit Validation | PENDING | Deferred to Sprint B | High |
| ALL | Performance Validation | PENDING | Deferred to Sprint B | High |
| ALL | UI Polishing | PENDING | Deferred to Sprint B | Low |
| DB-1 | Real PostgreSQL Connection (Foundation Milestone) | COMPLETED | In-memory `DatabaseClient` simulation replaced with a real `pg`-backed client; `db/schema.sql` is now applied via `scripts/db/migrate.js` and enforces tenant RLS with `FORCE ROW LEVEL SECURITY`. Verified against a real PostgreSQL instance, not simulated. Supabase project provisioning still required for staging/production (see PR description). | High |
| DB-2 | Real Authentication + Persistent User Storage | COMPLETED | `POST /api/auth/session` now verifies bcrypt-hashed credentials against a real `User` row and mints a signed, httpOnly JWT session cookie; `/dashboard/*` is now actually gated by middleware on that cookie (previously not enforced at all despite appearing to be — see PR description); logout invalidates the session. Verified against real PostgreSQL, bcryptjs, and a running server, not simulated. Supabase project provisioning still required for staging/production. | High |
| DB-3 | Server-Enforced Tenant Authorization (Upload Route) | COMPLETED | `POST /api/documents/upload` now derives tenant identity exclusively from the verified session cookie; any client-supplied `x-nextcase-tenant-id`/`x-tenant-id` header is ignored entirely. Verified end-to-end against a real running server: an authenticated Tenant A request sending forged headers claiming Tenant B still resolves to Tenant A. Middleware's disconnected Bearer-token gate is bypassed specifically for this route since it now authorizes itself; no other route's authorization behavior changed. Scope was intentionally limited to this one existing route — `/api/webhooks` and all general domain CRUD were explicitly out of scope. | High |
| DB-4 | Secure Webhook Verification | COMPLETED | `POST /api/webhooks` now requires an HMAC-SHA256 signature (`x-nextcase-signature`) over `${timestamp}.${rawBody}` plus a fresh `x-nextcase-timestamp` (5-minute tolerance); unsigned, invalid, tampered, expired, and replayed requests are all rejected before the body is parsed as JSON. Replay protection is an in-memory guard scoped to the tolerance window — sufficient for a single process, but a shared store (Redis/DB) is needed for correct protection across multiple horizontally-scaled Edge instances (flagged, not silently overstated). Middleware's disconnected Bearer-token gate is bypassed for this route too, same pattern as DB-3. Verified end-to-end against a real running server with real HMAC signatures. | High |
| DB-5 | Production Security Hardening | COMPLETED (pending review) | Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) applied globally via `next.config.ts`; in-memory rate limiting on login and webhook routes; Origin/Referer-based CSRF checks on login/logout/upload; tenant-context cookie now sets `Secure` over HTTPS; startup env/secret validation (`instrumentation.ts`) refuses to boot in production on a missing or known-insecure `JWT_SECRET`/`WEBHOOK_SIGNING_SECRET`/`ADMIN_ACCESS_TOKEN`; the previously fully-hardcoded, git-visible admin token is now env-configurable. See PR description for the CSP nonce redesign forced by real browser testing, and the explicitly-flagged admin-panel client-side-login gap that remains out of scope. | High |
| DB-6 | Search, AI, File Storage (Real Persistence), Billing, Messaging | PENDING | Each explicitly deferred to its own future milestone per Product Owner decision. | High |
