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
| DB-3 | Server-Enforced Tenant Authorization, Search, AI, File Storage, Billing, Messaging | PENDING | Each explicitly deferred to its own future milestone per Product Owner decision. Note: a valid session currently proves *who* the user is, not that their tenant matches what they're accessing — that enforcement is explicitly the next milestone, not this one. | High |
