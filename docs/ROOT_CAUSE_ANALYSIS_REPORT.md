# NEXTCASEHQ — ROOT CAUSE ANALYSIS REPORT
**TO:** Founder & Executive Board, NextCaseHQ
**FROM:** Chief Systems Engineer
**STATUS:** P0 Urgent / Root Cause Investigation / v1.0.0-rc1 Certified
**DATE:** February 2026

---

## 1. ROOT CAUSE REGISTER

| Issue ID | Screen | Problem | Root Cause | Responsible Files | Engineering Fix Required | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **RCA-001** | Landing | Header navigation links do nothing and scrollbars freeze. | Links point to static `#` or home route. Layout is static and does not trigger dynamic page transition logic. | `apps/web/src/app/page.tsx` | Replace anchor elements with Next.js Link components targeting canonical routes. | P0 |
| **RCA-002** | Login | Password can be any string. No actual validation occurs. | Authentication endpoints and client event handlers use mock logic. | `apps/web/src/app/login/page.tsx`, `apps/web/src/app/api/auth/session/route.ts` | Integrate database query verifying bcrypt/argon2 credential hashes. | P0 |
| **RCA-003** | Organization | Selected tenant ID is not propagated to physical query parameters. | Tenant selection runs purely inside React local state and stores cookies, but lacks an ORM handler to propagate variable bindings inside database pools. | `apps/web/src/app/organization/page.tsx` | Wire ORM client hook to invoke raw PostgreSQL session context setup on startup. | P0 |
| **RCA-004** | Dashboard | Center Panel chat input does not trigger model streaming. | Chat messages use local state array. Clicking input button triggers zero API communication with `packages/ai-registry`. | `apps/web/src/components/TriPaneChamber.tsx` | Wire central text input to `/api/ai/stream` API endpoint. | P0 |
| **RCA-005** | Matters | Matter cards are static. | Case list is hardcoded inside Cases component rather than fetched. | `apps/web/src/app/dashboard/cases/page.tsx` | Replace hardcoded arrays with a database query fetch (`db.case.findMany()`). | P0 |
| **RCA-006** | Cases | Modifying case details resets upon browser refresh. | The case creation flow operates in local React component state memory. No persistence. | `apps/web/src/app/dashboard/cases/page.tsx` | Add `POST /api/cases` route and write case payloads directly to database tables. | P0 |
| **RCA-007** | Evidence | Uploaded files disappear. Checksums are volatile. | Ingestion stream counts incoming bytes but discards file buffers and writes metadata to a local React array state. | `apps/web/src/app/dashboard/evidence/page.tsx`, `apps/web/src/app/api/documents/upload/route.ts` | Wire S3/MinIO stream pipeline, compute raw hash from binary stream, and insert ledger record. | P0 |
| **RCA-008** | AI Chamber | Prompt context-assembly does not retrieve actual case metadata. | Context assembly is isolated to an email-scrubbing mock algorithm. It has no access to real case exhibits, court files, or database rows. | `packages/ai-kernel/src/index.ts` | Write database query helpers inside `packages/ai-kernel` to retrieve tenant, case, and context chunks. | P0 |
| **RCA-009** | Drafting Canvas | "Save Draft" does not write content to storage. | Saving a draft triggers a client alert without server-side schema verification or persistence. | `apps/web/src/app/dashboard/draft-builder/page.tsx` | Create `POST /api/documents/save` database persistence endpoint. | P0 |
| **RCA-010** | Search | Typing query returns mock results. | Search page operates via local array filtering instead of a database engine. | `apps/web/src/app/dashboard/search/page.tsx`, `packages/search-engine/src/index.ts` | Connect pgvector / Elasticsearch backend indexers and wire search API. | P0 |
| **RCA-011** | Hearings | Hearing workspace is entirely absent. | No route, components, or screens have been built to represent hearing streaming. | `apps/web/src/app/dashboard/layout.tsx` (sidebar items omit it) | Create `/dashboard/hearings` route and layout frames. | P1 |
| **RCA-012** | Settings | Setting changes do not update security contexts. | Toggling KMS providers updates local React state but does not alter active key client configurations. | `apps/web/src/app/dashboard/settings/page.tsx` | Bind options to backend configuration environment variables and persist changes. | P1 |
| **RCA-013** | Notifications | "Delivered" state is logged but no message dispatch occurs. | Messaging client lacks SMS or email gateway integrations. | `packages/messaging/src/client.ts` | Integrate SMS (Twilio) and email (Resend) dispatch clients. | P1 |
| **RCA-014** | Commercial | AI usages mock virtual debit calculations. | Token debiting is calculated in memory and logged to console with no connection to active tenant billing ledgers. | `packages/ai-kernel/src/index.ts` | Integrate Stripe checkout session loops and multi-tenant quota checks. | P2 |

---

## 2. SYSTEM DEPENDENCY MAP

The map below illustrates the complete engineering hierarchy of NextCaseHQ, highlighting **every disconnected, mocked, or broken connection** preventing end-to-end execution.

```
┌────────────────────────────────────────────────────────┐
│                      UI Layer                          │
│  • Landing  • Login  • Organization  • Dashboard       │
│  • Cases    • Search • Evidence      • Draft Builder   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ [X] DISCONNECTED: User inputs update local React
                           │     memory state only. Refreshing wipes all work.
┌──────────────────────────┴─────────────────────────────┐
│                      API Layer                         │
│  • /api/auth/session    (MOCK: Returns {auth: true})   │
│  • /api/documents/upload (MOCK: Discards byte stream)   │
│  • /api/webhooks        (MOCK: Logs dummy JSON payloads)│
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ [X] DISCONNECTED: Business services run in memory
                           │     with zero database integrations.
┌──────────────────────────┴─────────────────────────────┐
│                  Business Services                     │
│  • packages/country-packs (REAL: Validate IN BNSS/BNS) │
│  • packages/workflow-engine (MOCK: Simulates states)   │
│  • packages/messaging      (MOCK: Dummy console logs)  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ [X] DISCONNECTED: AI models return hardcoded text.
                           │     No external model stream pipelines exist.
┌──────────────────────────┴─────────────────────────────┐
│                      AI Engine                         │
│  • packages/ai-kernel   (MOCK: Simple string templates)│
│  • packages/ai-registry (MOCK: Returns "AI Response") │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ [X] DISCONNECTED: Search client returns empty arrays.
                           │     No query parser, vectorizers, or indexers.
┌──────────────────────────┴─────────────────────────────┐
│                    Search Engine                       │
│  • packages/search-engine (MOCK: Returns empty array [])│
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ [X] BROKEN/MISSING: Connection pools are not bound.
                           │     There is no active database communication.
┌──────────────────────────┴─────────────────────────────┐
│                    Database Layer                      │
│  • PostgreSQL  (MISSING: Connection pool bindings)     │
│  • pgvector    (MISSING: Embedding tables/indexes)     │
│  • Redis       (MISSING: Session caching channels)     │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ [X] BROKEN/MISSING: Files are discarded on stream
                           │     ingest. No secure storage blocks are connected.
┌──────────────────────────┴─────────────────────────────┐
│                    Storage Layer                       │
│  • AWS S3 Buckets      (MISSING: Encrypted vaults)     │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ [X] DISCONNECTED: All key vaults, token routers,
                           │     and payment APIs are placeholders.
┌──────────────────────────┴─────────────────────────────┐
│                  External Services                     │
│  • OpenAI/Claude APIs  • Stripe Payment  • Twilio/Resend│
└────────────────────────────────────────────────────────┘
```

---

## 3. MISSING CONNECTION MATRIX

This matrix maps user interactions to their missing server-side execution requirements.

| Screen | Action Event | Source Code File | Triggered Handler | Missing Connection |
| :--- | :--- | :--- | :--- | :--- |
| **Login** | Click "Sign In" | `login/page.tsx` | `handleSubmit` | Connection to PostgreSQL credential verifier. |
| **Organization** | Click Tenant Card | `organization/page.tsx` | `handleSelectTenant` | Active connection to multi-tenant DB schema pool setting `SET LOCAL nextcase.current_tenant_id`. |
| **Cases** | Click "Open Matter Context" | `cases/page.tsx` | `handleCreateCase` | `POST /api/cases` route writing metadata to database case records. |
| **Search** | Click "Execute Search" | `search/page.tsx` | `handleSearch` | Router to pgvector hybrid search index database queries. |
| **Evidence** | Click "Register Exhibit" | `evidence/page.tsx` | `handleUpload` | Connection of binary stream to S3 object storage bucket. |
| **Draft Builder** | Click "Refine Document" | `draft-builder/page.tsx` | `handleAiRefine` | Streaming route connection to OpenAI/Claude model APIs. |
| **Draft Builder** | Click "Save Draft" | `draft-builder/page.tsx` | `onClick` hook | `POST /api/documents/save` database persistence endpoint. |

---

## 4. MOCK IMPLEMENTATION REGISTER

| Component | File Path | Mocked Object / Logic | Impact on User Experience |
| :--- | :--- | :--- | :--- |
| `callAIModel` | `packages/ai-registry/src/index.ts` | Returns static object: `{ content: "AI Response", usage: { ... } }` | The AI Dialogue box and Document drafting tools are completely static and non-responsive. |
| `searchRelevantChunks` | `packages/search-engine/src/index.ts` | Returns empty array: `[]` | The universal search query has zero capability of fetching document data. |
| `MessagingClient` | `packages/messaging/src/client.ts` | Logs to console: `Sending via CHANNEL...` and returns static `{ status: "DELIVERED" }` | No emails or emergency SMS texts are dispatched to legal counsel. |
| `upload/route.ts` | `apps/web/src/app/api/documents/upload/route.ts` | Simulates RLS context binding and returns successful `202 Accepted` status after counting stream bytes. | Upstream documents are discarded on ingest. There is no file storage. |
| `session/route.ts` | `apps/web/src/app/api/auth/session/route.ts` | Simulates login and returns static `{ authenticated: true }` | Any password can bypass credential verification. No user records are checked. |
| `processAIUsage` | `packages/ai-kernel/src/index.ts` | Computes simulated cost and logs token debits to console. | Billing and credits are non-existent. There is no usage control. |

---

## 5. DISCONNECTED WORKFLOW REGISTER

### A. The Document-to-Intelligence Ingestion Workflow
* **Trigger:** User drops file on Evidence panel and clicks "Register Exhibit".
* **Broken Connection:** The UI successfully catches the file and mock-encrypts it in memory, but the API (`upload/route.ts`) discards the file bytes. Because the file bytes are lost, the background OCR processor never executes, the search index never builds, and the AI Chamber never acquires the file context.
* **UX Consequence:** The user registers a file, but they cannot search for phrases inside that file, nor can the AI dialogue references it in drafting.

### B. The Conversational Drafting Workflow
* **Trigger:** User enters a command inside Draft Builder and clicks "Refine Document".
* **Broken Connection:** The Draft page triggers local template rendering, but it has no real-time stream connection to an active LLM. It relies on an in-memory compiler that appends a static boilerplate sentence containing the user's input.
* **UX Consequence:** The AI cannot execute complex reasoning or rewrite clauses.

### C. The Multi-Tenant Audit Security Workflow
* **Trigger:** User logs in and selects a Jurisdictional Organization Tenant.
* **Broken Connection:** The cookie context is set locally, but because there is no PostgreSQL database connection, the API cannot execute `SET LOCAL nextcase.current_tenant_id` on query transactions.
* **UX Consequence:** There is no structural RLS database-level tenant isolation, meaning multi-tenant segregation does not exist.

---

## 6. TOP 50 ENGINEERING ISSUES
*(Ranked by business impact and user-experience friction)*

### Tier 1: Core Platform Foundation (Issues 1–10)
1. **Disconnected Database Pool:** No ORM (Prisma) binding exists between the Next.js runtime and an active PostgreSQL database.
2. **Volatile Memory State:** All user operations (creating cases, uploading evidence, saving notes) are lost on page refresh.
3. **Mocked Authentication Endpoint:** `/api/auth/session` bypasses credentials, allowing unsecured logins.
4. **Discarded File Bytes:** File upload streams are counted to verify limit compliance, then discarded.
5. **No S3 Integration:** File uploads are not stored in secure object storage buckets.
6. **No Real-Time Transport:** Lack of WebSockets or SSE channels prevents live synchronization of UI elements.
7. **Static AI Dialogue Box:** Clicking "Send" in the AI dialog box does not connect to live inference endpoints.
8. **Mocked Search Engine Client:** `searchRelevantChunks` is a template stub returning an empty array.
9. **No OCR Processing Engine:** Scanned exhibits and PDFs cannot be parsed or indexed.
10. **Decorative "Save Draft" Button:** Saving draft pleadings triggers a local alert message but does not persist document states.

### Tier 2: Search & Retrieval Pipelines (Issues 11–20)
11. **No pgvector Database Schema:** Lacks tables to host embedded document chunks.
12. **Missing Embedding Client:** There is no integration with OpenAI / Claude vectorization APIs.
13. **No Hybrid Search Aggregator:** Lack of BM25 + Vector cross-encoder ranking.
14. **No Document Segmenter:** Scanned documents are not split into logical paragraphs or chunk sizes.
15. **Unconnected Statutory Index:** Universal search cannot query the India BNSS/BNS statutory reference pack.
16. **Missing Precedent Database:** Rulings and appellate citations cannot be retrieved.
17. **No Query Parser:** Input strings are not separated by intent, date, or citation format.
18. **No Federated Query Planner:** Command palette cannot execute multi-index search.
19. **No Indian Kanoon API integration:** Indian case-law databases are entirely disconnected.
20. **Static Search UI Categories:** Toggling search categories filters local arrays, not database records.

### Tier 3: AI Intelligence & Memory (Issues 21–30)
21. **No Live Chat History Storage:** Conversations are not saved to a persistent database table.
22. **Mocked Prompt Compiler:** `assembleContext` does not fetch dynamic case exhibits or timeline data.
23. **Lack of LLM Streaming Support:** No HTTP Server-Sent Events (SSE) routes exist to enable character-by-character output.
24. **No Prompt Template Versioning:** Changes to system prompts are hardcoded inside index.ts files.
25. **Missing Entity Extraction (NER):** No background model isolates Judges, Counsel, or Dates from exhibits.
26. **No Graph-RAG Pipeline:** Relationships between parties, evidence, and statutes are not inferred.
27. **Missing Graph Database Connection:** No active queries are made to Neo4j or Neptune.
28. **No Clause Patching Engine:** AI cannot edit specific paragraphs inside the Drafting Canvas without rewriting the entire document.
29. **Static AI System Settings:** Toggling settings does not change prompt system parameters.
30. **No Prompt Token Budgets:** No safeguard exists to prevent inputs from exceeding model context lengths.

### Tier 4: Scheduling, Timelines & Workspaces (Issues 31–40)
31. **No Automated Deadline Engine:** Timeline dates are not calculated dynamically based on regional civil practice rules.
32. **No Calendar Sync Provider:** Google, Outlook, and Apple iCal integrations do not exist.
33. **Missing Background Push Worker:** Reminders cannot be triggered asynchronously.
34. **No Workspace Collaboration Sync:** Multiple attorneys cannot collaborate on the same pleading canvas simultaneously.
35. **No User Presence Tracking:** Live online indicators are hardcoded mock states.
36. **Missing Hearing Video Rooms:** The system has no WebRTC or Zoom integration for digital courtrooms.
37. **No Real-Time Transcript Streamer:** Speeches cannot be transcribed or indexed live during hearings.
38. **Unbound Case-to-Document Matrix:** Documents cannot be dynamically linked to specific calendar timeline nodes.
39. **No Indian Court Scraping Worker:** Court docket scraping remains a manual process.
40. **No Task Assignment Pipeline:** Case assignments are mock static strings.

### Tier 5: Operational Commercialization & Infrastructure (Issues 41–50)
41. **No Stripe Integration:** Billing gates, subscription portals, and checkouts are entirely missing.
42. **Mocked Token Debiting Logic:** Debiting calculations are simulation prints to console logs.
43. **No Quota Enforcement:** Free-tier accounts can execute infinite transactions.
44. **No HSM Key Integration:** Cryptographic keys are wrapped via a simulation method instead of an HSM module.
45. **No Key Rotation Service:** KEK rotation is a static placeholder.
46. **Mocked SMS Dispatcher:** Twilio SMS clients are console logs.
47. **Mocked Email Provider:** Resend SMTP client wrappers do not exist.
48. **No Log Archiving Engine:** Security audits do not persist to cold storage.
49. **No Tenant Isolation Monitoring:** Multi-tenant RLS checks are not tracked dynamically in OTel telemetry.
50. **No Billing Ledger Tables:** Immutable transactional records are not logged in the database.

---

## FINAL SYSTEM RESOLUTION

**"If the Founder says the application does not yet feel complete, what exact engineering work still remains?"**

The exact engineering work that remains consists of:

1. **Instantiating the Multi-Tenant Database Connection Pool:** Replace the simulated console log traces with a live Prisma/Drizzle connection string pointing to PostgreSQL, executing true Row-Level Security contexts (`SET LOCAL nextcase.current_tenant_id = '${validatedTenantId}'`) during API transactions.
2. **Activating the Binary File Ingestion and Storage Engine:** Bind the stream reader in `apps/web/src/app/api/documents/upload/route.ts` to push incoming file buffers directly to AWS S3, generating persistent file URLs and extracting SHA256 checksums from raw binaries.
3. **Implementing the Background OCR and Vector Indexing Pipeline:** Set up background workers in `apps/workers` to run character recognition (Tesseract/Textract) on uploaded S3 files, split text into semantic chunks, generate embeddings using vector models, and save them directly to pgvector.
4. **Connecting Live Streaming AI Inference APIs:** Remove the hardcoded `"AI Response"` stub inside `packages/ai-registry/src/index.ts` and replace it with an active server-sent event (SSE) streaming API route connecting `apps/web` to OpenAI or Anthropic model endpoints.
5. **Connecting the Search Engine Queries to Active DB Index Tables:** Rewrite `searchRelevantChunks` in `packages/search-engine/src/index.ts` to execute live semantic vector similarity queries on pgvector combined with lexical Full Text Search.
6. **Integrating External Communications and Stripe Billing Gateways:** Replace mock console loggers in `packages/messaging` and `packages/ai-kernel` with verified SDK clients for Twilio (SMS), Resend (Email), and Stripe Checkout sessions.
