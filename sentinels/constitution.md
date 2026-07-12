# NEXTCASEHQ ENGINEERING CONSTITUTION

As legal engineers, our architectural and code quality rules must be as absolute and strict as statutory law.

## THE 10 COMMANDMENTS OF NEXTCASEHQ ENGINEERING

### 1. Complete Before Expanding
Every module, feature, and architectural component must be 100% complete, tested, and validated before any secondary enhancements, integrations, or downstream refactorings are initiated.

### 2. Strict Multi-Tenant Isolation
No tenant context or private customer data may ever cross boundaries. Every database interaction must be explicitly bound to the validated RLS session identity via `SET LOCAL nextcase.current_tenant_id` or an identical active schema guard. Failing to present a valid tenant ID UUID must result in an immediate fail-fast termination.

### 3. Absolute Zero-Trust Input Validation
All runtime inputs from public clients, webhooks, or upload streams must be strictly validated at the runtime boundary using schemas (such as Zod). Malformed, incomplete, or dirty metadata payloads must be immediately rejected with clear bad-request indicators.

### 4. Edge-Optimized India PII Scrubbing
All litigation telemetry, transcriptions, exhibits, or webhook payload events must be actively processed by regex scrubbers to redact Indian PAN cards and Aadhaar identifications at the edge runtime before any data hits database transactions, application memory pools, or telemetry trace logs.

### 5. Clear Performance Budgets
- Edge Middleware (Header extraction and JWT validation): `<5ms`
- Search & Discovery interactions (Interaction to Next Paint): `<15ms`
- Database queries, transition screens, and static API responses: `<50ms`

### 6. Clean Import & Dependency Isolation
No package may import directly across restricted workspace boundaries. Shared modules must reside exclusively inside specialized workspaces (such as `packages/`) and be imported explicitly via workspace path declarations. Duplicate package dependencies are strictly forbidden.

### 7. Zero Dead Link Rule
Every interactive surface element, navigation sidebar link, menu dropdown, or call-to-action button must bind cleanly to an active page, layout index, or verified dynamic entryway. The use of dummy hash `#` characters, `javascript:void(0)`, or unmapped onClick vectors is an architectural violation.

### 8. Strict Type Safety & No Explicit Any
All TypeScript files must adhere to strict typing guidelines. The use of explicit `any` without custom definition is prohibited unless wrapping general external runtime types in schemas. No compiler warnings, unused imports, or duplicate definitions are allowed.

### 9. Visual Invariant Compliance
Every user-facing page must conform to the project's official design system color tokens:
- Primary Text / Headers: `#111111` (Obsidian Charcoal)
- Primary Background: `#FDFBF7` (Warm Ivory)
- Accent / Brand Highlight: `#C5A059` (Chamber Gold)

### 10. Immutable Logging & Cryptographic Auditing
All tenant administrative transitions, data uploads, and webhook events must be registered to the immutable logging ledger. Chained audit events must be signed using HMAC-SHA256 signature chains to prevent ledger tampering.
