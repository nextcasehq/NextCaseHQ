# Document AI Credits Lifecycle

Status: **Approved, Phase 0 — Technical Specification**
Scope: How AI Credits are validated, reserved, debited, and released for a document generation job. Builds on the real, existing wallet tables — not the client-side demo store.

## Which Wallet This Governs (Important Distinction)

NextCaseHQ has **two** things that look like an "AI Credits wallet," and this spec governs only one of them:

- **`apps/web/src/lib/ai-credits/wallet-store.ts`** — a client-side, `localStorage`-backed demonstration wallet, explicitly documented in its own source as simulated ("AI execution is simulated — the caller supplies a `simulate` function... nothing here ever calls a real AI provider"). It backs the `draft-builder` prototype's `useChargeableAiAction` flow today. **This is not authoritative and is never used to gate or record a real generation job.**
- **`TenantWallet` / `WalletTransactionRecord`** (`db/schema.sql`) plus `GET/POST /api/wallet`, `GET /api/wallet/transactions` — the **real, production, PostgreSQL-backed wallet**. This is what this document governs.

As of Phase 0, the real AI generation pipeline (`POST /api/ai/draft`, `lib/ai/draft.ts`, the AI Context Gateway) does **not yet call the real wallet at all** — `lib/ai/entitlement.ts`'s `enforceEntitlement()` currently always allows, by explicit design ("trials, credits, and subscriptions don't exist yet, so there is nothing real to deny against"). Wiring real reservation/debit into that checkpoint is new work for Phase 4, not a reuse of an existing wired path. See `DOCUMENT_CREATOR_ARCHITECTURE_DECISION_RECORD.md` for this gap recorded formally.

## Flow

1. **Validate entitlement and expected cost.** Before admission to the queue, the request passes through the entitlement checkpoint (`lib/ai/entitlement.ts`, extended in Phase 4 to consult the real wallet balance and any tenant tier/pricing rule) and an expected-cost calculation for the requested action.
2. **Reserve AI Credits before queue admission.** A reservation is a real `WalletTransactionRecord` (or an equivalent reservation-typed row) that decrements *available* balance without yet being a final debit — mirroring how the existing `TenantWallet.balance` / transaction-log pattern already models funds movement, extended with a reservation state.
3. **Store the reservation ID on the job.** `DocumentGenerationJob.credit_reservation_id` links the two records, so a job's credit state is always traceable from the job row.
4. **Debit only after permanent document storage succeeds.** The reservation converts to a final debit only once `DOCUMENT_STORAGE_AND_VERSIONING_SPEC.md`'s completion checklist has fully passed — never on job start, never on "generation returned content" alone. This is the concrete implementation of Constitution Rule 3's spirit extended to billing: the advocate is never charged for work that didn't durably land.
5. **Release the reservation** (returning the held amount to available balance, without a debit) on any of:
   - Cancellation
   - Permanent failure (`FAILED`)
   - Provider failure that exhausts retries
   - Timeout
   - Rejected queue admission (in practice, no reservation is made yet at that point — see `DOCUMENT_TRAFFIC_AND_CONCURRENCY.md`)
6. **Idempotency for every reservation, debit, release, and reversal.** Each of these four operations is keyed (by the job's `idempotency_key`, or a derived key) so that a retried request, a duplicate worker-recovery pass, or a duplicate webhook can never reserve twice, debit twice, or release twice for the same job.
7. **Never use the `localStorage` demonstration wallet as authority for a real generation.** The demo wallet remains scoped to the `draft-builder` prototype's simulated flow; it is not read from, written to, or treated as a source of truth by any part of the real generation pipeline.

## Auditability

Every reservation, debit, release, and reversal is an audit event per `DOCUMENT_SECURITY_AND_AUDIT.md`'s event list — traceable back to the job, the tenant, and the advocate who initiated it.

## Execution Kernel Alignment

Steps 2 and 5 above are, respectively, the `ReserveAiCreditsCommand` and `ReleaseAiCreditReservationCommand` in `DOCUMENT_CREATOR_EXECUTION_KERNEL.md` §3.1; step 4 (debit only after permanent storage) is not its own separate command but a side effect the `CompleteGenerationJobCommand` handler performs within the same transaction that confirms the completion checklist in `DOCUMENT_STORAGE_AND_VERSIONING_SPEC.md`. The kernel's state machine (§4) names `CREDIT_RESERVED` as the explicit state a request occupies immediately after policy evaluation and before queueing — reservation is not an implicit side effect of enqueueing, it is its own state, evaluated and recorded before a `DocumentGenerationJob` row is even created. Every one of these four commands follows the kernel's command-handler contract (§3.3) in full, including the idempotency-key enforcement that makes rule 6 above concrete rather than aspirational.
