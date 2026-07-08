# Workflow Orchestration Controller Specification (packages/workflow-engine)

## 1. OCR Ingestion Pipeline State-Machine
- **States**: `PENDING` -> `RUNNING` -> `EXTRACTING` -> `VALIDATING` -> `COMPLETED` | `FAILED`.
- **Transitions**:
  - `PENDING` to `RUNNING`: Triggered by `FileIngestedEvent`.
  - `RUNNING` to `EXTRACTING`: OCR engine confirmation.
  - `VALIDATING` to `COMPLETED`: Successful cross-reference against jurisdictional Law Packs (e.g., BNS 2023).

## 2. Data Validation Checkpoints
- **Schema Validation**: Ensure the extracted JSON payload matches the `DocumentVector` schema.
- **Tenant Integrity**: Verify that the `tenant_id` associated with the job matches the `tenant_id` of the case.
- **Ledger Persistence**: Job state transitions must be committed to the `JobExecutionLedger` table before proceeding to the next step.

## 3. Event Bus Hand-offs
- **Emission**: On every successful transition, emit an event to `packages/event-bus` (e.g., `JobStepCompleted`).
- **Subscription**: The `observability` package subscribes to all `WorkflowEngine` events to maintain the `SecurityAuditTrail`.
- **Performance**: Event emission must complete in <2ms.
