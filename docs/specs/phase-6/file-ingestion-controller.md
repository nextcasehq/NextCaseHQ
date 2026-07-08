# File Ingestion Controller Specification (apps/api-gateway)

## 1. Stream Chunking Validation Loop
- **Buffer Management**: Use a 64KB internal buffer for initial stream contact to extract headers before piping to object storage.
- **Verification**: Validate each chunk size against the `Content-Length` header. Terminate and purge if chunk size exceeds the 128MB maximum per document.
- **Timing**: 50ms total budget for ingest hand-off.

## 2. Header Extraction Boundary Rules
- **Header Parsing**: Intercept `X-Tenant-Key-Version` and `X-Tenant-ID` within the first 5ms of stream contact.
- **Validation**:
  - `X-Tenant-ID`: Must match a valid UUIDv4 format.
  - `X-Tenant-Key-Version`: Must match an active key in the `TenantKeyRegistry`.
- **Enforcement**: If headers are missing or mismatched, drop the stream immediately and return `401 Unauthorized`.

## 3. Failure Resolution Paths
- **Unexpected Termination**:
  - If the stream terminates before the expected byte count, mark the ingestion row as `ABORTED`.
  - Trigger a cleanup task in the object storage layer to purge orphaned partial uploads.
- **Retry Logic**: No automatic retries for failed streams to prevent amplification attacks. The client must re-initiate a clean upload session.
- **Auditing**: Log `INGESTION_FAILURE` with the reason (e.g., `TIMEOUT`, `SIZE_EXCEEDED`, `TERMINATED`) to the `SecurityAuditTrail`.
