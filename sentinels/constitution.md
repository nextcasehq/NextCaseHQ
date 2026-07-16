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

---

## SENTINEL FRAMEWORK v1.2 GOVERNANCE UPGRADE

### RULE 1 — MULTI-EVIDENCE VALIDATION
Never trust a single evidence source. Validate using VS Code Diagnostics, TypeScript, ESLint, Next.js, Build, Browser, and Git. If evidence conflicts, block certification.

### RULE 2 — BROWSER IS TRUTH
If the browser output differs from repository expectations, enter Investigation Mode. Never assume.

### RULE 3 — COMPLETE FILE INSPECTION
Inspect every affected file. Never skip changed files. Never ignore dependent files.

### RULE 4 — EVIDENCE REQUIRED
Every finding must contain evidence. No evidence. No PASS.

### RULE 5 — NO SELF CERTIFICATION
Sentinels shall never certify themselves. Trust is earned through successful operation.

### RULE 6 — EVERY ERROR MUST INCLUDE
Every error must report Repository Path, File, Line, Problem, Root Cause, Impact, Suggested Remedy, and Confidence.

### RULE 7 — IDE IS AUTHORITATIVE
If VS Code shows red underlines, repository health is NOT GREEN. Sentinels must report every IDE diagnostic.

### RULE 8 — RENDER TREE VERIFICATION
Verify Route -> Layout -> Page -> Components. Never assume which file renders the UI. Produce the actual render chain.

### RULE 9 — DEPENDENCY IMPACT
Every issue shall identify Affected Files, Affected Components, Affected Routes, and Affected User Journeys.

### RULE 10 — ROOT CAUSE
Never report symptoms only. Always determine WHY the issue exists.

### RULE 11 — SENTINEL TRUST SCORE
Every Sentinel maintains Accuracy, False Positives, False Negatives, Detection Rate, and Verification Rate.

### RULE 12 — ENGINEERING MEMORY
Track Recurring Bugs, Recurring Files, Recurring Developers, Recurring Root Causes, Resolved Issues, and Engineering Trends.

### RULE 13 — SMALLEST SAFE FIX
Recommend the minimum safe correction. Never recommend unnecessary refactoring.

### RULE 14 — NEVER ASSUME
If uncertain, collect more evidence. Do not guess.

### RULE 15 — CROSS VALIDATION
Architecture -> Build -> UI -> Release must agree. If reports differ, generate EVIDENCE MISMATCH.

### RULE 16 — REALITY OVER REPORTS
If Founder, Browser, IDE, or Live Repository contradicts Sentinel reports, the reports are considered INVALID. Immediately enter Investigation Mode. Never argue against observable evidence. Reality always overrides reports.
