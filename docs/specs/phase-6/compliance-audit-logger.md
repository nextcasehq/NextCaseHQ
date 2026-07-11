# Compliance & Audit Logger Specification (packages/observability)

## 1. Action Interception
- **Middleware Hooks**: Intercept all write operations in the `api-gateway` and `db-client`.
- **Target Actions**: `CASE_TRANSFER`, `DOCUMENT_DELETE`, `TENANT_ACCESS_CHANGE`, `WALLET_DEBIT`.

## 2. Evidence Chain of Custody Schema
- **Payload**:
  - `action_type`: string
  - `actor_id`: UUID
  - `tenant_id`: UUID
  - `resource_id`: UUID
  - `prev_signature`: string (Signature of the previous audit row)
  - `timestamp`: TIMESTAMPTZ
- **Signature Chain**:
  - Generate `HMAC-SHA256(payload + prev_signature, system_audit_key)`.
  - Store the resulting signature in the `signature` column of the `SecurityAuditTrail` table.

## 3. Compliance Verification
- **Integrity Check**: Periodically run a task to re-verify the signature chain for each tenant's audit trail.
- **Alerting**: Trigger an immediate system alert if a signature mismatch is detected (indicating ledger tampering).
