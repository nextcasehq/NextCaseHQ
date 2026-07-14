# NEXTCASEHQ — SYSTEMS ENGINEERING & CONNECTIVITY AUDIT
**TO:** Founder & Executive Board, NextCaseHQ
**FROM:** Chief Systems Engineer
**STATUS:** P0 Urgent / Architecture Evaluation / v1.0.0-rc1 Administrative Lock
**DATE:** February 2026

---

## EXECUTIVE ENGINEERING MEMORANDUM

NextCaseHQ is currently a collection of highly optimized, decoupled, compile-clean software packages, but it **does not yet behave like a complete, unified Litigation Operating System**.

From an engineering perspective, this is a **distributed data and pipeline connectivity gap, not a quality or structural deficiency**. The codebase enforces strict type checks, speed perimeters, zero-trust middleware, and has a visually stunning, unified white-first design system. However, the application operates as an *island of pristine components*. The business logic layers are decoupled from actual physical storage; the data processing pipes terminate in in-memory simulation rings, and the external integrations are managed via mock interfaces.

This audit details every missing engineering connection, disconnected database, decoupled search engine, and mocked API across the NextCaseHQ monorepo.

---

## SECTION 1: DETAILED MODULE AUDIT (13 KEY SUBSYSTEMS)

### 1. Global Search
* **What has been built:** A high-speed UI layout (`apps/web/src/app/dashboard/search/page.tsx`) with a target Interaction to Next Paint (INP) of under 15ms. A skeleton package (`packages/search-engine`) that exports a `searchRelevantChunks(tenantId, query)` function returning an empty array (`[]`).
* **What is still missing:** Actual retrieval logic, query parsing, and vector embedding pipelines.
* **Which dependencies are preventing end-to-end functionality:** The dependency of `apps/web` on `packages/search-engine` is wired at the import level, but `packages/search-engine` does not depend on any vector databases or search services.
* **Which APIs are mocked:** The `searchRelevantChunks` function is a mock stub returning `[]`.
* **Which services are missing:** An Indexing Worker Service, Document Chunking Service, and Vector Generation Service.
* **Which databases are not connected:** pgvector (PostgreSQL) or a dedicated vector database.
* **Which search engines are not connected:** Elasticsearch, OpenSearch, or Qdrant/Pinecone.
* **Which AI pipelines are not connected:** Text embedding models (e.g., `text-embedding-3-small`).
* **Which retrieval engines are missing:** Hybrid BM25 + Vector Search Retrieval Engine.
* **Which external services are still placeholders:** Indexing trigger endpoints are missing.

### 2. AI Chamber
* **What has been built:** A premium, three-panel workspace container (`TriPaneChamber.tsx`) containing hardcoded message arrays and structural mocks. An `assembleContext` pipeline in `packages/ai-kernel` that scrubs emails/PII and returns a basic string template.
* **What is still missing:** Real-time stream connections, prompt-template compilers, and session-history persistence.
* **Which dependencies are preventing end-to-end functionality:** Lacks a secure server-to-server connection between `apps/web` and `packages/ai-registry` and the actual LLM API providers.
* **Which APIs are mocked:** `callAIModel` in `packages/ai-registry` returns a static `{ content: "AI Response", usage: { ... } }` object.
* **Which services are missing:** Chat Session Manager and LLM Streaming Orchestrator.
* **Which databases are not connected:** Redis or PostgreSQL (for long-term conversational memory buffers).
* **Which search engines are not connected:** Context-injection retrieval engines.
* **Which AI pipelines are not connected:** Direct inference pipelines (OpenAI, Anthropic, or Azure OpenAI).
* **Which retrieval engines are missing:** Retrieval-Augmented Generation (RAG) pipeline for multi-tenant case evidence.
* **Which external services are still placeholders:** Key-vault secured LLM credentials and usage-token debiting hooks.

### 3. Drafting Canvas
* **What has been built:** A premium legal document sheet layout rendering mock Delhi High Court writ petition templates (`apps/web/src/app/dashboard/draft-builder/page.tsx`).
* **What is still missing:** Collaborative operational-transformation (OT) text editing, block-based JSON schema rendering, and automated clause assembly.
* **Which dependencies are preventing end-to-end functionality:** There is no bridge connecting the WYSIWYG editor framework to the server-side generation engines in `packages/legal-kernel` or `packages/ai-kernel`.
* **Which APIs are mocked:** The interface informs users that "interactive drafting is locked" and references dynamic bindings to legal precedents that are not dynamically bound.
* **Which services are missing:** Real-time Document Collaboration Service and PDF/docx Compilation Engine.
* **Which databases are not connected:** PostgreSQL (JSON document state storage).
* **Which search engines are not connected:** Precedent clause search engines.
* **Which AI pipelines are not connected:** Structural Draft Generation and Clause-Level Inline AI assistance.
* **Which retrieval engines are missing:** Legal Precedent Clause Retriever.
* **Which external services are still placeholders:** Document Export/Signature integrations (e.g., DocuSign, e-Mudhra).

### 4. Evidence Ledger
* **What has been built:** An "Evidence Registrar" UI page and an HMAC-SHA256 audit-chain signer/verifier in `packages/observability`.
* **What is still missing:** File uploading and processing progress UI, hash computation of actual binary assets on stream intake, and chain-of-custody verification workflows.
* **Which dependencies are preventing end-to-end functionality:** Lacks secure connection between the multi-tenant file ingest API (`/api/documents/upload`) and the cryptographic signature system in `packages/crypto`.
* **Which APIs are mocked:** The ledger database transaction state is completely simulated in `/api/documents/upload/route.ts`.
* **Which services are missing:** Binary Hash Extraction Service and Cryptographic Verification Service.
* **Which databases are not connected:** PostgreSQL (schema for ledger entry tracking) and Immutable Ledger Storage (e.g., Amazon QLDB or an append-only DB schema).
* **Which search engines are not connected:** Hash-integrity indexing search.
* **Which AI pipelines are not connected:** Automatic Document Categorization and OCR Key-Value Extraction pipelines.
* **Which retrieval engines are missing:** Cryptographic Audit Chain verification engines.
* **Which external services are still placeholders:** Decoupled storage block vaults (e.g., AWS S3).

### 5. Matter Management
* **What has been built:** High-level page structures under `/dashboard/cases` tracking simulated cases with jurisdiction markers (`IN`, `US`, `UK`).
* **What is still missing:** Case detail navigation, phase tracking, status state-machines, and dynamic client/counsel assignments.
* **Which dependencies are preventing end-to-end functionality:** Absence of active ORM bindings (such as Prisma or Drizzle) to persist state changes.
* **Which APIs are mocked:** The case list is hardcoded in `cases/page.tsx`.
* **Which services are missing:** Case Lifecycle Coordinator and Jurisdictional Task Generator.
* **Which databases are not connected:** Multitenant PostgreSQL (Matter Metadata, Case Teams, Tasks).
* **Which search engines are not connected:** Case Registry indexing.
* **Which AI pipelines are not connected:** Task automatic-generation models based on petition templates.
* **Which retrieval engines are missing:** Case metadata and docket status retrievers.
* **Which external services are still placeholders:** Court Docket scraper workers.

### 6. Case Workspace
* **What has been built:** Workspace structure layouts under `/dashboard/cases` showing client references, jurisdiction status, and litigation metadata.
* **What is still missing:** Real-time updates, activity timelines, document-to-case linkage matrices, and permission settings.
* **Which dependencies are preventing end-to-end functionality:** Lack of state synchronization patterns (e.g., WebSockets, tRPC, or server-sent events) between client and server.
* **Which APIs are mocked:** The workspace selection and context variables are simulated locally inside React state.
* **Which services are missing:** Collaborative Workspace Service and User Presence Service.
* **Which databases are not connected:** Redis (for session presence) and PostgreSQL (for case workspace states).
* **Which search engines are not connected:** Intracase vector search filters.
* **Which AI pipelines are not connected:** Case context summarization models.
* **Which retrieval engines are missing:** Multi-document contextual cross-referencers.
* **Which external services are still placeholders:** Cloud File Systems (such as Dropbox, OneDrive, or GDrive).

### 7. Chronos (Litigation Timeline and Deadlines)
* **What has been built:** Front-end status notifications showing `CRITICAL_LIMITATION_DEADLINE` and `HEARING_REMINDER` on case cards.
* **What is still missing:** Visual interactive timelines, calendar sync controls, and custom procedural rule calculation logic.
* **Which dependencies are preventing end-to-end functionality:** There is no bridge to the Indian BNSS/BNS limitation calculation libraries, US FRCP calendaring engines, or UK CPR rules.
* **Which APIs are mocked:** The deadline status tags on UI panels are static strings.
* **Which services are missing:** Chronos Procedural Engine, Calendar Event Sync Coordinator, and Reminder Push Worker.
* **Which databases are not connected:** PostgreSQL (Schedules, Deadlines, Reminders schemas).
* **Which search engines are not connected:** Calendar-indexed search.
* **Which AI pipelines are not connected:** Automatic Document Deadline Extraction (OCR extraction of deadline-bearing paragraphs).
* **Which retrieval engines are missing:** Procedural Rule Book Retrievers (calculated dates from statutory rules).
* **Which external services are still placeholders:** Outlook, Google Calendar, and Apple Calendar iCal feeds.

### 8. Knowledge Graph
* **What has been built:** Basic structural placeholders in index.ts packages for legal packages.
* **What is still missing:** Graph rendering canvases (e.g., Cytoscape, D3), node/edge connection schemas representing entities (e.g., Judge, Counsel, Witness, Evidence, Statutes), and entity resolution controllers.
* **Which dependencies are preventing end-to-end functionality:** No graph database or Graph API queries are referenced inside `apps/web`.
* **Which APIs are mocked:** Relationship links do not exist.
* **Which services are missing:** Entity-Extraction Pipeline (NER) and Graph Relationship Processing Engine.
* **Which databases are not connected:** Neo4j, AWS Neptune, or pg_graphql.
* **Which search engines are not connected:** Graph-based keyword search indices.
* **Which AI pipelines are not connected:** LLM-based Named Entity Extraction (NER) and Relationship Inference models.
* **Which retrieval engines are missing:** Graph-RAG Retrieval Engines.
* **Which external services are still placeholders:** External entity resolution registers.

### 9. Hearing Workspace
* **What has been built:** Page templates showing hearing schedules, judicial markers, and room references.
* **What is still missing:** Real-time video conferencing, digital exhibit presentment views, and dynamic transcript streaming panels.
* **Which dependencies are preventing end-to-end functionality:** The video/transcript pipeline dependencies are entirely unmapped.
* **Which APIs are mocked:** Visual schedule states are static layouts.
* **Which services are missing:** Audio/Video Streaming Service, Real-Time Transcription Service, and Exhibit Presenter Synchronizer.
* **Which databases are not connected:** Redis (for live sync of exhibit controls) and S3 (for rapid-access exhibits).
* **Which search engines are not connected:** Real-time transcript searchable indices.
* **Which AI pipelines are not connected:** Live Speech-To-Text diarized translation and instant objection-trigger generators.
* **Which retrieval engines are missing:** In-Hearing precedent instant-retriever.
* **Which external services are still placeholders:** Zoom API, WebRTC rooms, or AssemblyAI live streams.

### 10. Universal Search
* **What has been built:** A `CommandPalette.tsx` overlay capable of listing mock operations or routes.
* **What is still missing:** Cross-database federated query planner and unified search interface integration.
* **Which dependencies are preventing end-to-end functionality:** Lack of an orchestration layer capable of query routing to multiple data stores (Statutes, Precedents, Evidence, Cases, Tasks).
* **Which APIs are mocked:** The command palette items are hardcoded routes and actions.
* **Which services are missing:** Federated Query Planner and Global Search Coordinator.
* **Which databases are not connected:** OpenSearch / Elasticsearch clusters.
* **Which search engines are not connected:** Elasticsearch indexer.
* **Which AI pipelines are not connected:** Semantic query-expansion neural networks.
* **Which retrieval engines are missing:** Federated Retrieval-Augmented Generation (Fed-RAG).
* **Which external services are still placeholders:** External legal databases (Westlaw, LexisNexis, Indian Kanoon).

### 11. Notifications
* **What has been built:** A low-latency `MessagingClient` in `packages/messaging` that simulates sending SMS or EMAIL.
* **What is still missing:** Push notification webhooks, user alert-preferences panel, and in-app bell notification stream databases.
* **Which dependencies are preventing end-to-end functionality:** No external SMTP or SMS service provider SDK is imported.
* **Which APIs are mocked:** `MessagingClient.send` logs to console and returns `{ status: 'DELIVERED' }`.
* **Which services are missing:** Notification Delivery Engine, SMS Gateway Worker, and Email Dispatcher.
* **Which databases are not connected:** PostgreSQL (Notification logs, configuration states).
* **Which search engines are not connected:** Notification log historical indexing.
* **Which AI pipelines are not connected:** Smart Notification Aggregation and Priority Evaluation AI.
* **Which retrieval engines are missing:** User alert criteria matching engine.
* **Which external services are still placeholders:** Twilio (SMS), SendGrid / Resend (Email), and Firebase Cloud Messaging (Web Push).

### 12. Authentication
* **What has been built:** A zero-trust edge middleware verifying JWT signatures (`apps/web/middleware.ts`) and a mock session endpoint `/api/auth/session`.
* **What is still missing:** User registration, password hashing/reset flow, Multi-Factor Authentication (MFA), and single sign-on (SSO) integrations.
* **Which dependencies are preventing end-to-end functionality:** Lack of direct database queries to authenticate user hashes or fetch session keys.
* **Which APIs are mocked:** `/api/auth/session` simply responds with `{ authenticated: true }`.
* **Which services are missing:** Session Store Manager, OAuth2/OIDC Broker, and Key Rotation Service.
* **Which databases are not connected:** PostgreSQL/Prisma (User Credentials, Tenants, Sessions).
* **Which search engines are not connected:** Security audit indexing.
* **Which AI pipelines are not connected:** Anomaly login detection networks.
* **Which retrieval engines are missing:** Active policy evaluation engine.
* **Which external services are still placeholders:** Okta / Auth0 / Clerk or AWS Cognito brokers.

### 13. Commercialization (Billing & Licensing)
* **What has been built:** Wallet token debit transaction logs modeled in `packages/ai-kernel` (`processAIUsage` logging virtual cost debits).
* **What is still missing:** Subscription tier enforcement, invoice generation, credit purchase portal, and tenant-quota limits.
* **Which dependencies are preventing end-to-end functionality:** Payment processing SDKs are completely absent from the codebase.
* **Which APIs are mocked:** Usage is calculated in-memory and outputs a simulation printout.
* **Which services are missing:** Subscription Manager, Usage Metronome Engine, and Invoicing Worker.
* **Which databases are not connected:** Stripe Ledger Database sync or an internal immutable Billing DB.
* **Which search engines are not connected:** Transaction search index.
* **Which AI pipelines are not connected:** Predictive usage forecasting AI.
* **Which retrieval engines are missing:** Quota checker.
* **Which external services are still placeholders:** Stripe, Paddle, or Razorpay payment portals.

---

## SECTION 2: SUB-SYSTEM DEEP DIVES

### A. SEARCH ENGINE SUB-SYSTEM

#### 1. Where should results come from?
Results must originate from three distinct data universes:
1. **Tenant Private Data:** Encrypted files, exhibits, court transcripts, case files, notes, and task data (stored under multi-tenant RLS isolation).
2. **Statutory Legislation Databases:** Comprehensive codifications (e.g., BNSS 2023, BNS 2023, US FRCP, UK CPR).
3. **Legal Precedents Databases:** High Court and Supreme Court historical rulings, opinions, and citations.

#### 2. Current Implementation
The application currently imports a dummy function `searchRelevantChunks` which operates in a disconnected state from any storage engine. It returns a static empty array (`[]`). There is zero connection to actual indexes or document representations.

#### 3. Missing Implementation
* **Query Parser:** A layer to separate linguistic intent from raw text (e.g., identifying when a user searches for a citation vs. a concept).
* **Embedding Middleware:** Synchronous call to a vectorization API upon query submission.
* **Hybrid Search Executor:** A service running both lexical matches (FTS) and vector distance queries, combining them via Reciprocal Rank Fusion (RRF).
* **Metadata Filters:** Strict security injection to guarantee that queries can *only* scan documents belonging to the user's active tenant ID.

#### 4. Required Engine
* **Vector Indexing Engine:** pgvector, Qdrant, or Pinecone.
* **Lexical Indexing Engine:** PostgreSQL Full Text Search or Elasticsearch.

#### 5. Required Indexing
* **Hierarchical Document Index:** Chunked document elements mapped with parent-child relationships.
* **Statutory Code Index:** Indexed by section, title, and topic.
* **Precedent Citation Index:** Sparse indexes built over case numbers, judge names, and judgment dates.

#### 6. Required Database
* **PostgreSQL (with `pgvector` enabled):** Centralized multi-tenant table structures containing chunk hashes, content, embeddings, and metadata.

#### 7. Required API
* `POST /api/search/query` (takes `query`, `jurisdiction`, `caseId`, `filters`; returns a structured list of hybrid search hits).
* `POST /api/search/reindex` (internal worker API triggered on new document uploads).

#### 8. Required UI Connections
* Dynamic state binding in `apps/web/src/app/dashboard/search/page.tsx` connecting the text input value to `useSWR` or `react-query` to execute search API calls and render responsive results.

---

### B. AI CHAMELEON & CONTEXT SUB-SYSTEM

```
                    ┌────────────────────────┐
                    │  User Dialogue Input   │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │ Context-Assembly Pipe  │
                    │   (packages/ai-kernel) │
                    └───────────┬────────────┘
                                │
             ┌──────────────────┴──────────────────┐
             ▼ (Retrieve Evidence)                 ▼ (Retrieve Statutes/Precedent)
   ┌───────────────────┐                 ┌───────────────────┐
   │  Tenant Document  │                 │  Statutory Legal  │
   │  Vector Database  │                 │  Reference Index  │
   └─────────┬─────────┘                 └─────────┬─────────┘
             │                                     │
             └──────────────────┬──────────────────┘
                                │ (Inject Merged Context)
                                ▼
                    ┌────────────────────────┐
                    │ Prompt Engine Assembly │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │ LLM Inference Stream   │
                    │  (packages/ai-registry)│
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │ Drafting Canvas Editor │
                    └────────────────────────┘
```

#### 1. How should AI receive context?
The AI should receive context through a **Unified Context Assembly Pipeline** that merges:
1. **User Prompt:** The direct message or request.
2. **Conversation History:** The last N turns of the dialogue from a database chat-history logger.
3. **Retrieved Context:** The dynamic chunks returned by the search sub-system (evidence, rules, precedents).
4. **Session Directives:** Tenant ID, jurisdiction, user role permissions, and active case guidelines.

#### 2. How should it retrieve evidence?
Through a **Multi-Tenant Document Retriever** that:
* Performs a similarity search on pgvector containing chunks of the active case's exhibits.
* Re-ranks the chunks using a cross-encoder model to select the top 3-5 most pertinent context fragments.

#### 3. How should it retrieve statutes?
Through a **Statute-Lookup Router** that:
* Detects mentions of legal rules (e.g., "Section 12 BNSS").
* Query-matches specifically against the structured Jurisdictional reference table (e.g., fetching Section 12 or the 531 sections of the BNSS legal framework).
* Injects the raw, precise text of the matched section into the LLM prompt.

#### 4. How should it retrieve precedents?
Through a **Citation Resolver Engine**:
* Matches citations in the chat input (e.g., "Writ Petition 132/2026").
* Queries a global litigation precedent DB to fetch summary briefs and key holdings.
* Passes the holding context into the assembled prompt context.

#### 5. How should it generate legal drafts?
Through a **Structured Generation Pipeline**:
* Assembles a detailed layout specification (JSON schema) based on jurisdictional rules.
* Prompts the AI (utilizing strong system schemas) to write standard formal pleadings.
* Streams the generation *word-by-word* directly to the **Drafting Canvas** JSON document tree, updating the canvas in real-time.

#### 6. Which components are still missing?
* **Inference Routing Layer:** Code that connects `callAIModel` to Anthropic Claude / Azure OpenAI instead of returning `"AI Response"`.
* **Prompt Engine Compilers:** Dynamic builders that compile prompt-variables based on context size limits.
* **Streaming Handler Hooks:** Server-sent event (SSE) API routes to allow real-time text streaming.

---

## SECTION 3: SYSTEM DEPENDENCY MAP

The map below illustrates NextCaseHQ's architectural stack.

* `[X]` indicates a **Disconnected, Missing, or Mocked Interface**
* `[#]` indicates a **Partially Built / Internal Simulation-only Hook**
* `[•]` indicates an **Active, Working, Type-Safe Component**

```
▲ [•] UI Layer (Web Dashboard, Search, Case Management, TriPaneChamber Canvas)
│
└───[X] Disconnected: State is hardcoded or local-only. Real-time sync absent.
    │
    ▼
▲ [•] API Layer (Edge Webhooks /api/webhooks, /api/documents/upload, /api/auth/session)
│
└───[#] Internal Simulation: Middleware verifies JWTs, Ingest validates headers,
    │   but execution paths bypass physical databases and terminate in memory.
    │
    ▼
▲ [•] Business Services (packages/workflow-engine, packages/country-packs, packages/legal-kernel)
│
├───[X] MISSING: PDF/docx Drafting compiler services.
├───[X] MISSING: Calendar calculation rules (FRCP / CPR scheduling automation).
├───[#] LOCAL SIMULATION: India telemetry BNSS compliance is calculated in-memory without persistent logs.
│
▼
▲ [•] AI Engine (packages/ai-kernel, packages/ai-registry, packages/prompt-library)
│
├───[X] BROKEN/MOCKED CONNECTION: callAIModel returns static mock JSON.
├───[X] MISSING: Chat History persistence layer.
├───[X] MISSING: Live Streaming SSE connections.
│
▼
▲ [•] Search Engine (packages/search-engine)
│
└───[X] DISCONNECTED: searchRelevantChunks is a completely empty mock array shell.
    │
    ▼
▲ [X] Database Layer (PostgreSQL, Redis, pgvector)
│
├───[X] MISSING CONNECTION: No ORM or Driver binds the live application to an active database.
├───[#] SIMULATED: RLS 'SET LOCAL nextcase.current_tenant_id' is mocked via console logs.
│
▼
▲ [X] Storage Layer (Multi-Tenant Secure S3 Buckets, Immutable Ledgers)
│
└───[X] MISSING CONNECTION: File uploads consume request streams but discard the bytes without saving.
    │
    ▼
▲ [X] External Services (OAuth, LLMs, Stripe, SendGrid, Twilio, Case Scrapers)
│
└───[X] MISSING: All external API keys and client SDK connections are stubbed with placeholders.
```

---

## CONCLUDING AUDIT SYNTHESIS

NextCaseHQ possesses **all the structural characteristics** of a world-class Litigation Operating System. The typescript boundaries are strict, the visual tokens are pristine, the country-pack validation mechanisms (such as BNSS Section 12 validation) are accurate, and the zero-trust security middleware is fully active.

However, to transform NextCaseHQ into a smoothly functioning, connected Litigation Operating System, the development team must prioritize **plumbing over scaffolding**. The next operational sprints must be dedicated to removing the mock barriers, instantiating the PostgreSQL/pgvector databases, configuring active cloud storage buffers, and routing the AI/Search engines to live models and indexes.
