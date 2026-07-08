# AI Conversation & Memory Controller Specification (packages/ai-kernel)

## 1. Context-Assembly Pipeline
- **Step 1: Prompt Retrieval**: Fetch the system prompt from `packages/prompt-library` based on the current case state (e.g., "Drafting Writ Petition").
- **Step 2: Semantic Search**: Query `packages/search-engine` (Vector Store) for the top 5 most relevant document chunks for the current tenant.
- **Step 3: PII Scrubbing**: Run the context through the PII Redaction filter.
- **Step 4: Payload Assembly**: Combine the redacted context, user query, and system prompt into a single JSON payload for the `ai-registry`.

## 2. Wallet Ledger Transaction Rules
- **Usage Tracking**: Calculate token usage from the AI provider's response (Input + Output).
- **Pricing Application**: Multiply tokens by the rate defined in the `TenantTierPricing` table.
- **Atomic Debit**: Execute a transaction to debit the `balance` in the `TenantWallet` table and create a record in the `WalletTransactionRecord` table.
- **Boundary**: If the `balance` is insufficient, the request must fail before calling the AI provider.

## 3. Performance Budget
- **Assembly**: Pipeline assembly must complete in <15ms.
- **Total Request**: Total round-trip (excluding AI generation time) must be <50ms.
