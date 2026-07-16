# NEXTCASEHQ — ENGINEERING EXECUTION ROADMAP
**TO:** Founder & Executive Board, NextCaseHQ
**FROM:** Chief Systems Engineer
**STATUS:** P0 Urgent / Architecture Execution Roadmap / v1.0.0-rc1 Administrative Lock
**DATE:** February 2026

---

## EXECUTIVE SUMMARY

This document converts the Systems Engineering Dependency & Connectivity Audit into an **actionable, sequential, and highly structured Engineering Execution Plan**.

The plan is divided into five phases, progressing from user-experience completeness to database connectivity, retrieval engines, AI-driven context integration, and finally operational commercialization. For every identified missing dependency, ten explicit engineering metrics are mapped to guide implementation.

---

## PHASE 1: COMPLETE USER EXPERIENCE (SEARCH, NAVIGATION, BUTTONS, MENUS, FORMS)

### 1. Unified Search UI Page Binding
* **Module Name:** Global / Universal Search
* **Missing Component:** Search query listener and dynamic asynchronous results-feed interface.
* **Why it is required:** Users currently have no way to execute searches or view paginated documents, statutes, or precedent matches.
* **Current State:** A completely static visual text input field with an interactive skeleton component that renders a hardcoded empty placeholder.
* **Files to be created/modified:**
  * Modify: `apps/web/src/app/dashboard/search/page.tsx`
  * Create: `apps/web/src/components/SearchFilters.tsx`
* **Dependencies:** `packages/search-engine` client queries, UI State Hooks.
* **Estimated effort:** 3 Days
* **Priority:** P0
* **Sprint Assignment:** Sprint D1
* **Acceptance Criteria:** Typing a term in the query input fetches real JSON arrays from `/api/search/query` within 15ms and renders matching statutory/exhibit cards with dynamic category filters.

### 2. Multi-Viewport Drawer and Workspace Navigation
* **Module Name:** Case Workspace / Matter Management
* **Missing Component:** Responsive left-hand context drawer containing folder systems, active workspace lists, and route selectors.
* **Why it is required:** The current dashboard does not allow users to fluidly pivot between specific case contexts or select files from a tree structure without refreshing the page.
* **Current State:** The dashboard uses rigid static viewport boundaries and does not support hierarchical navigation.
* **Files to be created/modified:**
  * Create: `apps/web/src/components/WorkspaceDrawer.tsx`
  * Modify: `apps/web/src/app/dashboard/layout.tsx`
* **Dependencies:** `@/components/NavbarWrapper`, Next.js Navigation state hooks.
* **Estimated effort:** 2 Days
* **Priority:** P1
* **Sprint Assignment:** Sprint D1
* **Acceptance Criteria:** Dynamic multi-device responsive drawer collapses into a hamburger icon on mobile viewports (<768px), lists active matter files, and binds user clicks to specific routing transitions.

### 3. Chronos Visual Timeline Interface
* **Module Name:** Chronos
* **Missing Component:** SVG-based chronological scrolling timeline canvas and calendar event grid.
* **Why it is required:** Necessary to graphically represent the progression of critical litigation milestones (e.g., limitation deadlines, hearings, and pleading filing windows) to attorneys.
* **Current State:** Only simple static metadata tags (such as `CRITICAL_LIMITATION_DEADLINE`) exist on case portfolio lists.
* **Files to be created/modified:**
  * Create: `apps/web/src/components/ChronosTimeline.tsx`
  * Create: `apps/web/src/app/dashboard/chronos/page.tsx`
* **Dependencies:** `@/components/TriPaneChamber`, date-fns utility libraries.
* **Estimated effort:** 4 Days
* **Priority:** P1
* **Sprint Assignment:** Sprint D2
* **Acceptance Criteria:** Displays an interactive, horizontal time-axis showing case procedural steps, highlight-markers for expired deadlines, and dynamic slide-out summaries on node hover.

### 4. Interactive Legal Pleading Form Wizard
* **Module Name:** Drafting Canvas
* **Missing Component:** Multi-step wizard layout capturing jurisdiction, litigation type, and specific case facts.
* **Why it is required:** Users need a structured, non-intimidating system to input specific information before launching into custom drafting generations.
* **Current State:** A placeholder text indicating interactive drafting is locked in current workspace view.
* **Files to be created/modified:**
  * Create: `apps/web/src/app/dashboard/draft-builder/wizard.tsx`
  * Modify: `apps/web/src/app/dashboard/draft-builder/page.tsx`
* **Dependencies:** React Hook Form, Zod schema validation.
* **Estimated effort:** 3 Days
* **Priority:** P1
* **Sprint Assignment:** Sprint D1
* **Acceptance Criteria:** Seamless, multi-step UI form that dynamically alters input fields based on country pack (IN/US/UK), validates fields on the fly, and posts payload to document creation handlers.

---

## PHASE 2: BACKEND CONNECTIVITY (API, DATABASE, SERVICES)

### 5. Multi-Tenant Database Schema & ORM Binding
* **Module Name:** Infrastructure / Core Platform
* **Missing Component:** Database connection pooling, Prisma ORM schema generation, and migration tracking.
* **Why it is required:** Critical to store and isolate persistent records across tenants (users, matters, documents, timelines, sessions).
* **Current State:** Database calls are simulated; SQL-level Row-Level Security (RLS) is represented as a simulated console log statement in `upload/route.ts`.
* **Files to be created/modified:**
  * Create: `db/schema.prisma`
  * Create: `apps/web/src/lib/db.ts`
  * Modify: `apps/web/src/app/api/documents/upload/route.ts`
* **Dependencies:** PostgreSQL server, Prisma Client, `@nextcase/config`.
* **Estimated effort:** 5 Days
* **Priority:** P0
* **Sprint Assignment:** Sprint D1
* **Acceptance Criteria:** Dynamic connection instantiation with automated environment-specific pool sizes. Executing an API request automatically invokes PostgreSQL session settings binding (`SET LOCAL nextcase.current_tenant_id`) with 100% tenant isolation enforcement.

### 6. Physical Object Storage (Blob Store Integration)
* **Module Name:** Evidence Ledger
* **Missing Component:** S3 SDK storage provider driver, multipart stream ingestion chunking pipeline.
* **Why it is required:** To securely upload and store physical exhibits, documents, and transcripts rather than dropping incoming payload streams.
* **Current State:** The intake API (`/api/documents/upload/route.ts`) counts the bytes in request streams to verify limits but discards the data.
* **Files to be created/modified:**
  * Create: `apps/web/src/lib/storage.ts`
  * Modify: `apps/web/src/app/api/documents/upload/route.ts`
* **Dependencies:** AWS SDK or MinIO Client, CloudKMSProvider.
* **Estimated effort:** 3 Days
* **Priority:** P0
* **Sprint Assignment:** Sprint D2
* **Acceptance Criteria:** Files successfully upload via streaming directly to S3. Encrypted objects are generated with accompanying metadata, returning S3 object URLs along with instant 202 HTTP status codes under 50ms.

### 7. User Authentication & Session Persistence
* **Module Name:** Authentication
* **Missing Component:** Persistent database sessions, argon2 credential hash verification, and OAuth state handshake endpoints.
* **Why it is required:** To transition NextCaseHQ from mock credential bypasses to certified zero-trust user identification.
* **Current State:** `/api/auth/session` simply responds with `{ authenticated: true }`.
* **Files to be created/modified:**
  * Create: `apps/web/src/app/api/auth/login/route.ts`
  * Modify: `apps/web/src/app/api/auth/session/route.ts`
  * Modify: `apps/web/middleware.ts`
* **Dependencies:** `jose`, `argon2`, PostgreSQL session tables.
* **Estimated effort:** 4 Days
* **Priority:** P0
* **Sprint Assignment:** Sprint D1
* **Acceptance Criteria:** Validates credential hashes against DB, mints signed cryptographically-hardened JWT session tokens, injects tenant-context variables securely in middleware, and wipes client traces on logout.

### 8. Live Real-Time Message Dispatch Broker
* **Module Name:** Notifications
* **Missing Component:** Live integration drivers for Resend (email) and Twilio (SMS).
* **Why it is required:** Needed to instantly dispatch emergency limitation notifications and hearing reminders directly to active phones and mailboxes of legal counsel.
* **Current State:** `MessagingClient` console-logs mock statuses and returns static payload maps.
* **Files to be created/modified:**
  * Modify: `packages/messaging/src/client.ts`
  * Create: `packages/messaging/src/providers/resend.ts`
  * Create: `packages/messaging/src/providers/twilio.ts`
* **Dependencies:** Twilio/Resend SDKs, `@nextcase/observability`.
* **Estimated effort:** 3 Days
* **Priority:** P1
* **Sprint Assignment:** Sprint D2
* **Acceptance Criteria:** Executing `MessagingClient.send` dispatches a live SMS or Email through verified endpoints, recording dispatch latency with OTel performance alerts if latency exceeds 200ms.

---

## PHASE 3: RETRIEVAL LAYER (SEARCH ENGINE, INDEXING, OCR)

### 9. PDF/TIFF Document Ingestion and OCR Pipeline
* **Module Name:** Evidence Ledger / Matter Management
* **Missing Component:** Background OCR processor workers capable of converting scanned legal images/PDFs into structured Markdown text.
* **Why it is required:** Scanned exhibits are unsearchable until they pass through character recognition, block layout detection, and paragraph segmentation pipelines.
* **Current State:** No OCR framework or file parser is integrated; incoming stream storage is purely binary.
* **Files to be created/modified:**
  * Create: `apps/workers/src/ocr-processor.ts`
  * Modify: `packages/workflow-engine/src/index.ts`
* **Dependencies:** Tesseract OCR engine binary or AWS Textract cloud client.
* **Estimated effort:** 5 Days
* **Priority:** P1
* **Sprint Assignment:** Sprint D2
* **Acceptance Criteria:** Uploading a scanned TIFF or PDF initiates a background worker process, parses text with coordinates, publishes the processed payload to `@nextcase/event-bus`, and sets the state to `COMPLETED`.

### 10. Vector Chunking & pgvector Search Integration
* **Module Name:** Global / Universal Search
* **Missing Component:** Text-chunking sliding window algorithm and Vector Database connector.
* **Why it is required:** RAG applications must break massive legal documents into semantic sections, embed them, and query them by mathematical distance.
* **Current State:** `packages/search-engine` lacks indexing mechanisms or embedding connections.
* **Files to be created/modified:**
  * Modify: `packages/search-engine/src/index.ts`
  * Create: `packages/search-engine/src/chunker.ts`
* **Dependencies:** `@nextcase/observability`, OpenAI embeddings API client, pgvector database.
* **Estimated effort:** 4 Days
* **Priority:** P0
* **Sprint Assignment:** Sprint D2
* **Acceptance Criteria:** Text is divided into 500-token chunks with 50-token overlaps, embedded via standard neural model APIs, stored under active RLS isolation tables, and retrieved correctly via vector cosine-distance matches.

### 11. Federated Search Aggregator
* **Module Name:** Universal Search
* **Missing Component:** Unified query-router and results-ranking merger (Reciprocal Rank Fusion - RRF).
* **Why it is required:** To merge database keyword matches (FTS) with vector matches and external statutory sources into a single, ranked command-palette result stream.
* **Current State:** Completely absent; different search attempts are independent, unintegrated components.
* **Files to be created/modified:**
  * Create: `packages/search-engine/src/federator.ts`
  * Modify: `apps/web/src/app/dashboard/search/page.tsx`
* **Dependencies:** `packages/search-engine` indexes, statutory database registries.
* **Estimated effort:** 4 Days
* **Priority:** P1
* **Sprint Assignment:** Sprint D3
* **Acceptance Criteria:** Queries return a single, sorted array combining matches from exhibits, local case details, external country-pack rules, and statutory sections within 30ms.

---

## PHASE 4: AI LAYER (CONTEXT ASSEMBLY, RAG, DRAFTING, MEMORY)

### 12. Context Assembly RAG Pipeline
* **Module Name:** AI Chamber
* **Missing Component:** Multi-document prompt compiler with token budget allocation.
* **Why it is required:** Feeds the exact context (e.g., extracted exhibit sections, applicable statutes, and case history) directly to the prompt template without exceeding context limits.
* **Current State:** `assembleContext` does a mock regex email-scrub but does not retrieve actual data chunks.
* **Files to be created/modified:**
  * Modify: `packages/ai-kernel/src/index.ts`
  * Create: `packages/ai-kernel/src/rag-composer.ts`
* **Dependencies:** `packages/search-engine` indexes, `@nextcase/prompt-library`.
* **Estimated effort:** 4 Days
* **Priority:** P0
* **Sprint Assignment:** Sprint D2
* **Acceptance Criteria:** Correctly retrieves case-relevant context, validates token size budget, structures the payload into secure system directives, and returns a formatted prompt in under 15ms.

### 13. Streaming AI Inference Router & API Connection
* **Module Name:** AI Chamber
* **Missing Component:** Streaming SDK client router (OpenAI/Anthropic) supporting Server-Sent Events (SSE).
* **Why it is required:** Enables the AI dialogue interface to stream rich markdown text answers character-by-character to the client web browser instead of buffering responses.
* **Current State:** Static payload response block returning hardcoded JSON responses.
* **Files to be created/modified:**
  * Modify: `packages/ai-registry/src/index.ts`
  * Create: `apps/web/src/app/api/ai/stream/route.ts`
* **Dependencies:** OpenAI / Anthropic Node SDKs, CloudKMSProvider (for API key decryption).
* **Estimated effort:** 3 Days
* **Priority:** P0
* **Sprint Assignment:** Sprint D3
* **Acceptance Criteria:** Submitting a prompt initiates a secure chunked HTTP connection stream, transmits partial tokens to the UI page, and triggers cost-credit usage debits upon closing.

### 14. Real-time Collaborative Document Generation Engine
* **Module Name:** Drafting Canvas
* **Missing Component:** Block-based JSON document serializer with AI editing hooks.
* **Why it is required:** Connects the AI conversational suggestions directly to the text-canvas editor so the AI can physically write, patch, and format legal pleadings.
* **Current State:** The Drafting Canvas is read-only and displays hardcoded mock pleading headers.
* **Files to be created/modified:**
  * Create: `apps/web/src/app/api/documents/generate/route.ts`
  * Create: `apps/web/src/app/api/documents/patch/route.ts`
  * Modify: `apps/web/src/components/TriPaneChamber.tsx`
* **Dependencies:** `@nextcase/ai-kernel`, `packages/legal-kernel`.
* **Estimated effort:** 5 Days
* **Priority:** P0
* **Sprint Assignment:** Sprint D3
* **Acceptance Criteria:** User prompts ("Write standard Delhi High Court heading") generate correctly structured drafting schemas, update the canvas text fields, and save changes to PostgreSQL.

---

## PHASE 5: COMMERCIALIZATION

### 15. Stripe Subscriptions and Ledger Payments Integration
* **Module Name:** Commercialization
* **Missing Component:** Stripe customer portal, webhook handlers, subscription-tier limits.
* **Why it is required:** Enables business clients to pay for usage, manage subscription limits, and buy token credits.
* **Current State:** Basic in-memory usage tracking simulator logging mock costs to console.
* **Files to be created/modified:**
  * Create: `apps/web/src/app/api/billing/webhook/route.ts`
  * Create: `apps/web/src/app/api/billing/checkout/route.ts`
  * Create: `packages/observability/src/billing.ts`
* **Dependencies:** Stripe API, `@nextcase/observability`.
* **Estimated effort:** 5 Days
* **Priority:** P2
* **Sprint Assignment:** Sprint D4
* **Acceptance Criteria:** Successfully completes dynamic checkout session loops, records subscription status changes in multi-tenant DB schemas, and blocks non-paid operations when credits run dry.

---

## BLOCKERS TO A SMOOTH USER EXPERIENCE

The following physical engineering dependencies represent the **critical bottlenecks** preventing NextCaseHQ from functioning as a complete, smooth, and connected Litigation Operating System:

1. **Disconnected Database Layer (The State Blocker):** Every single UI component (Matter management lists, active dialogue threads, legal draft changes, audit trails) resets on browser refresh. The absence of active Prisma ORM PostgreSQL connections makes long-term interaction impossible.
2. **Scaffolded File Intake API (The File Blocker):** The `/api/documents/upload` API discards physical files. There is no background parsing, transcription, or storage logic. Without this, the Evidence Ledger and the AI's core context-RAG mechanics remain completely empty.
3. **Mocked AI Generation Endpoints (The AI Blocker):** The conversational dialogue stream is static. The AI cannot actually parse a document, respond to specific legal timeline rules, or generate dynamic legal text drafts because `packages/ai-registry` and `packages/ai-kernel` are not connected to active LLM endpoints.
4. **Empty Search-Engine Retrieval Client (The Knowledge Blocker):** The search workspace and command palette have no link to vector or statutory index stores. Users cannot search, fetch court definitions, locate critical paragraphs, or cross-reference statutory reference books.
5. **No State Synchronization Pipeline (The Collaboration Blocker):** There is no real-time transport layer (such as WebSockets or SSE streams). This prevents the AI dialogue and the production drafting canvas from updating in parallel—making the core "Tri-Pane AI Chamber Canvas" layout appear broken to the user.
