# NextCaseHQ — Frequently Asked Questions

Practical answers for advocates, firm partners, clerks, and administrators
using NextCaseHQ day to day. Where a feature isn't built yet, this document
says so plainly rather than describing a workaround that doesn't exist.

---

## Getting Started

**Q: What is NextCaseHQ?**
A: NextCaseHQ is a litigation and matter-management platform for Indian advocates and law firms. It centers on a Matter Register for client engagements, Proceedings for formal court/forum instances, Court Notes for hearing records, a Matter Timeline, hearing reminders, an AI-backed Document Creator, and Universal Search.

**Q: Who is NextCaseHQ built for?**
A: Individual advocates, law firm partners, clerks who do day-to-day data entry, and firm administrators who configure roles, templates, and integrations. Each of these roles interacts with a different part of the product, but they all work from the same Matter and Proceeding data.

**Q: Is there a mobile app?**
A: No. NextCaseHQ is web-responsive only — it works in a mobile browser, but there is no dedicated iOS or Android app.

**Q: Do I need a special browser for dictation?**
A: Voice input on the Court Note screen uses browser dictation and is feature-detected, so it only appears when your browser supports it. If you don't see a dictation option, your browser doesn't support the underlying API and you can still type the note manually.

**Q: Where do I land when I log in?**
A: The Dashboard (`/dashboard`), which shows your recent Matters, Quick Actions (Draft a Document, Upload/Link a Document, Next Hearing & Stage), Today's Cases, and a Legal Search workspace.

**Q: What is the Command Center?**
A: It's the in-workspace search available inside a Matter (`/matters/[id]`), letting you search within that Matter's own context instead of the whole system.

**Q: What is an Action Card?**
A: Action Cards are the actionable prompts shown inside a Matter workspace — surfaces that point you toward the next useful step for that Matter.

**Q: I just signed up — where should I start?**
A: Create your first Matter in the Matter Register (`/matters`), fill in its engagement type and basic details, and then decide whether it needs a Proceeding. If it's advisory work with no court case, you can leave it with zero Proceedings and log activity on the Matter Timeline instead.

**Q: Do I need to create a Proceeding before I can do anything with a Matter?**
A: No. A Matter can exist with zero Proceedings — advisory, contractual, or transactional work is a fully valid state. You only need a Proceeding once there's a formal case before a court or forum.

**Q: What's the difference between a Matter and a Proceeding?**
A: A Matter is the client engagement — the overall relationship and scope of work. A Proceeding is one formal instance before one court or forum under that Matter, such as a suit, petition, appeal, execution application, or arbitration reference. One Matter can have several Proceedings, or none at all.

**Q: What is AI Chamber and can I use it for real casework?**
A: AI Chamber (`/dashboard/ai-chamber`) is a sample-data showcase, explicitly labeled on-screen as illustrative rather than real case records. It's not the primary landing surface and shouldn't be used as a source of truth for actual matters.

**Q: What's the difference between the Document Creator and `/documents/new`?**
A: The Document Creator (`/dashboard/draft-builder`) is the primary drafting surface — a guided interview with a full rich-text editor, autosave, focus mode, and print-accurate layout. `/documents/new` is a separate, simpler flow that generates a first draft from facts you type in and saves it as plain text.

---

## Matters & Engagements

**Q: What is a Matter?**
A: A Matter is a client engagement record — the container for everything related to one piece of work for one client, whether or not it involves a court case. It's the top-level object in the Matter Register.

**Q: What information does a Matter record?**
A: Title, matter number, engagement type, practice area, status, the client, opposing party name and opposing counsel, court, bench, judge, a description, and open/close dates.

**Q: What engagement types are available?**
A: LITIGATION, PRE_LITIGATION, ADVISORY, CONTRACTUAL, TRANSACTIONAL, ARBITRATION, MEDIATION, COMPLIANCE, INVESTIGATION, and OTHER.

**Q: Can I have a Matter with no court case attached?**
A: Yes. Advisory, contractual, compliance, and similar non-contentious engagements are first-class, valid Matters with zero Proceedings.

**Q: What statuses can a Matter have?**
A: ACTIVE, ON_HOLD, CLOSED, and ARCHIVED.

**Q: How do I move a Matter between statuses (e.g., reopen a closed one)?**
A: Status is a field on the Matter, so it can be updated to reflect where the engagement stands. The facts available don't describe a separate dedicated "reopen" workflow beyond changing the status field itself.

**Q: What is matter_number for?**
A: It's your firm's own reference number for the engagement, distinct from any court-assigned case number, which lives on the Proceeding instead.

**Q: Can I record who's on the other side?**
A: Yes — opposing_party_name and opposing_counsel are fields on the Matter itself.

**Q: Can I record court, bench, and judge directly on a Matter, separate from a Proceeding?**
A: Yes, court, bench, and judge are all fields on the Matter record itself, in addition to whatever is recorded at the Proceeding level.

**Q: What is the Matter workspace?**
A: It's the page at `/matters/[id]` — the working view for one Matter, with tabs for overview, health, proceedings, timeline, documents, team, an in-Matter Command Center search, and Action Cards.

**Q: Can one Matter have multiple Proceedings?**
A: Yes. A Matter can have any number of Proceedings under it — for example, a suit and, separately, an execution application arising from the same client relationship.

**Q: Is a client record required to create a Matter?**
A: A Matter has a client_id field linking it to a client, so a client association is part of the data model.

**Q: Can I search for a Matter directly?**
A: Yes, matters are one of the entity types covered by Universal Search, alongside cases, participants, and document types.

**Q: What does closing a Matter actually do?**
A: It sets the Matter's status to CLOSED and records a closed_at date. The facts don't describe any automatic archival, locking, or Timeline freeze triggered by closing.

**Q: Who can see a Matter?**
A: The Matter workspace has a "team" tab, implying visibility is scoped to the people associated with that Matter, though the facts sheet doesn't detail the exact permission rules beyond that.

**Q: Can I add colleagues to a Matter's team?**
A: The Matter workspace includes a team tab as part of its structure. Beyond its existence, no further detail on team-management mechanics is documented here.

---

## Proceedings

**Q: What is a Proceeding?**
A: A Proceeding (internally called LegalCase) is one formal instance before one court or forum — a suit, petition, appeal, execution application, criminal case, or arbitration reference — tracked under a Matter.

**Q: What fields does a Proceeding have?**
A: Title, case_number, country_code, court, judge, stage, status, hearing_date (the next scheduled hearing), notes, and an optional matter_id link.

**Q: What statuses can a Proceeding have?**
A: PENDING, HEARING, DISPOSED, and APPEAL.

**Q: What does "stage" mean on a Proceeding?**
A: Stage is a free-form field tracking where the case currently stands procedurally (for example, evidence, arguments, or final hearing) — it's also captured on each Court Note as the hearing happened.

**Q: Can a Proceeding exist without being attached to a Matter?**
A: The matter_id field on a Proceeding is nullable, so a Proceeding can technically exist without a Matter link, though pairing a Proceeding with its Matter is the normal setup.

**Q: Can I link an appeal to the original suit it arises from?**
A: Yes. When you add a new Proceeding as a "Further Proceeding" of an existing one — an appeal, revision, review, execution, and several other relationship types are supported — NextCaseHQ records the link back to the Proceeding it continues from. The original Proceeding is never edited or replaced; the appeal is a new Proceeding row carrying a reference back to it, so the full chain (trial → appeal → execution, for example) stays intact under the same Matter.

**Q: Where do I see the court-assigned case number?**
A: On the Proceeding, in the case_number field — distinct from the firm's internal matter_number on the parent Matter.

**Q: What is country_code used for?**
A: It's a field on the Proceeding record. The facts sheet doesn't elaborate on its current use beyond its presence in the schema.

**Q: Where do I create a new Proceeding?**
A: At `/cases/new`. You can browse existing ones at `/cases` and open a specific one at `/cases/[id]`.

**Q: Can one Proceeding be linked to more than one Matter?**
A: No — a Proceeding has a single, nullable matter_id, meaning it can belong to at most one Matter at a time.

**Q: What does the hearing_date field on a Proceeding actually represent?**
A: It's always the next scheduled hearing, not the one that just happened. Recording a Court Note for a past hearing automatically moves this field forward to whatever the next hearing date turns out to be.

**Q: How does hearing_date get updated?**
A: Automatically, when you save a Court Note against that Proceeding — the save atomically sets hearing_date to the next hearing date you enter.

**Q: Can I see a history of past hearings for a Proceeding, not just the next one?**
A: Yes, though that history lives on the Matter Timeline (via the Court Notes that generated it) rather than as a list attached to the Proceeding record itself.

**Q: Is there a field distinguishing a civil suit from a criminal case?**
A: Proceedings don't have a dedicated case-type field beyond title, case_number, and stage — but the Court Note recorded against a Proceeding does capture court_forum_type (e.g., Civil Court, Criminal Court), which indicates the forum the matter is being heard in.

**Q: Where do I see all my proceedings across matters?**
A: At `/cases`, which lists Proceedings; from there you can open any individual one at `/cases/[id]`.

---

## Court Notes & Case Diary

**Q: What is a Court Note?**
A: A Court Note (also called the Case Diary) is an immutable, append-only record of one hearing — the who/what/when of what happened in court, entered right after the hearing.

**Q: Can I edit a Court Note after saving it?**
A: No. Court Notes are immutable and append-only by design — they're meant to be an accurate record of what happened at the time, not something revised later.

**Q: What is court_forum_type?**
A: A fixed field on the Court Note capturing which kind of forum the hearing was before: Supreme Court, High Court, Civil Court, Criminal Court, Family Court, Commercial Court, Consumer Commission, Labour Court, MACT, Arbitration, Revenue Court, or Other.

**Q: Can I record a Court Note without a Proceeding?**
A: No. Recording a Court Note requires an existing Proceeding. A Matter with no Proceeding attached cannot have a Court Note recorded against it today.

**Q: What happens automatically when I save a Court Note?**
A: Three things happen atomically: the parent Proceeding's hearing_date is updated to the next hearing you entered, a Matter Timeline entry is appended, and — if you filled in next_actions — exactly one Task is created.

**Q: What is input_method / voice dictation on the Court Note screen?**
A: input_method records how the note was captured: Manual (typed), Voice (dictated via your browser's built-in dictation), or Hybrid (a mix of both). Voice input is feature-detected, so it only appears if your browser supports it.

**Q: Does voice dictation work in every browser?**
A: It's feature-detected, meaning NextCaseHQ only offers it where the browser's dictation API is available. If your browser doesn't support it, you'll only see the manual typing option.

**Q: What happens if I leave next_actions blank on a Court Note?**
A: No Task is created for that note. Task creation is conditional on next_actions being filled in — leave it empty if there's genuinely nothing pending.

**Q: Can one Court Note create more than one Task?**
A: No — saving a Court Note with next_actions creates exactly one Task, not a list of separate tasks.

**Q: What's the difference between hearing_date and next_hearing_date on a Court Note?**
A: hearing_date is the date of the hearing you're recording (the one that just happened); next_hearing_date is when the matter comes up again, and that value is what propagates forward to update the Proceeding.

**Q: Where do I record a Court Note?**
A: At `/cases/[id]/court-note`, for an existing Proceeding.

**Q: Can I delete a Court Note I entered by mistake?**
A: Court Notes are designed to be immutable and append-only, consistent with their role as a factual hearing record — the facts sheet doesn't describe an edit or delete path for them.

**Q: Can I attach a document directly while recording a Court Note?**
A: The facts sheet doesn't describe a document-attach step within the Court Note entry screen itself; documents are managed separately and can be linked to the Matter and/or Proceeding.

**Q: What forum types can I select on a Court Note?**
A: Supreme Court, High Court, Civil Court, Criminal Court, Family Court, Commercial Court, Consumer Commission, Labour Court, MACT, Arbitration, Revenue Court, and Other — it's a fixed list.

**Q: Is "Court Note" the same thing as "Case Diary"?**
A: Yes, they're the same feature — Court Note is the field/technical name, Case Diary is the everyday name for the same immutable hearing-record entry.

**Q: My Matter has no Proceeding — how do I log what happened today?**
A: Use the Matter Timeline's own "Add Entry" for a manual entry, since Court Notes require an existing Proceeding and won't work for a Matter that has none.

**Q: Does saving a Court Note affect Matter Health?**
A: Yes indirectly — Matter Health is live-derived from data including the last hearing date, forum, and note, so a newly saved Court Note feeds directly into what Matter Health displays.

**Q: Can a clerk enter a Court Note on behalf of an advocate?**
A: The facts sheet doesn't specify role-based restrictions on who can record a Court Note; it describes the feature itself (requires an existing Proceeding, manual/voice/hybrid input) without detailing per-role permissions.

---

## Tasks & Action Items

**Q: What is a Task in NextCaseHQ?**
A: A Task (MatterTask) is a correctable pending-action checklist item tied to a Matter, always originating from a Court Note's next_actions field.

**Q: How are Tasks created?**
A: Only by saving a Court Note that has next_actions filled in — that automatically creates exactly one Task. There's no other creation path today.

**Q: Can I create a Task manually, without a Court Note?**
A: No. There is no free-standing task creation independent of a Court Note in the current release.

**Q: What statuses can a Task have?**
A: Pending, Completed, and Dismissed.

**Q: Where do I see my pending Tasks?**
A: Pending action count is part of Matter Health, which is live-derived per Matter — that's the summary view of outstanding Tasks for that engagement.

**Q: Can I assign a Task to a specific team member?**
A: The facts sheet describes Tasks as pending-action checklist items with Pending/Completed/Dismissed statuses, but doesn't document a per-user assignment feature.

**Q: If I dismiss a Task by mistake, can I bring it back?**
A: The facts sheet documents Dismissed as one of the three Task statuses but doesn't describe a specific "undo" mechanic beyond whatever status changes the interface allows.

**Q: How do I mark a Task complete?**
A: By changing its status to Completed — one of the three defined statuses (Pending, Completed, Dismissed) a Task can carry.

---

## Matter Timeline & Matter Health

**Q: What is the Matter Timeline?**
A: It's the unified chronology of everything that's happened on a Matter — combining automatic hearing-outcome entries from Court Notes with manual entries you add yourself.

**Q: What are the two types of Timeline entries?**
A: source_type=HEARING entries are auto-created whenever a Court Note is saved; source_type=MANUAL entries are ones you add yourself via the Timeline's "Add Entry."

**Q: How do I add a manual entry to the Timeline?**
A: Through the Matter Timeline's own "Add Entry" function, available on the Matter workspace's timeline tab.

**Q: My Matter has no Proceeding — how do I log non-hearing activity like an advisory call?**
A: Use a manual Timeline entry. This is exactly the scenario the Matter Timeline's manual entries are meant for, since Court Notes require a Proceeding and won't apply here.

**Q: What is Matter Health?**
A: A live-derived summary for a Matter showing its current stage, last hearing date/forum/note, next hearing date, a count of pending actions, and a needs-attention flag.

**Q: What triggers the needs-attention flag?**
A: The facts sheet confirms Matter Health includes a needs-attention flag as part of its live-derived summary, without spelling out the exact trigger logic behind it.

**Q: Does Matter Health update automatically, or do I need to refresh it?**
A: It's described as live-derived, meaning it reflects current underlying data (hearings, notes, pending tasks) rather than something you manually recalculate.

**Q: Can I customize what counts as needs-attention?**
A: The facts sheet doesn't document a configuration option for this — it describes needs-attention as one fixed part of the Matter Health summary.

**Q: Is the Timeline visible to the whole Matter team?**
A: The Timeline is part of the Matter workspace, which has team-level access via its team tab; the facts sheet doesn't specify finer-grained visibility rules within that.

**Q: Can I edit or delete a Timeline entry after adding it?**
A: The facts sheet doesn't describe edit or delete functionality for Timeline entries — HEARING entries in particular come from immutable Court Notes, so treat manual entries with the same care.

**Q: Does closing a Matter stop new Timeline entries from being added?**
A: The facts sheet doesn't document any such lock; closing sets status to CLOSED and records closed_at, without a described effect on Timeline editability.

**Q: Does Matter Health show anything about documents or AI Credits?**
A: No — its documented fields are stage, last hearing date/forum/note, next hearing date, pending action count, and the needs-attention flag.

---

## Reminders & Notifications

**Q: How does NextCaseHQ remind me about upcoming hearings?**
A: A daily scheduled job called Seven-Day Preparation checks every Proceeding's next hearing date and notifies Matter participants whenever that date falls within seven days.

**Q: Will I get an email or text message before a hearing?**
A: Not today. Reminders are delivered only via the in-app Notification bell. The underlying email/SMS abstraction (Resend/Twilio) exists at the library level, but no route in the app currently calls it.

**Q: Where do notifications show up?**
A: In the in-app Notification bell, and via `GET /api/notifications` for anything programmatic.

**Q: Who receives a hearing reminder — just me, or the whole team?**
A: Matter participants are notified, per the Seven-Day Preparation job's description — so it's scoped to people associated with the Matter, not just the one person who created it.

**Q: Can I change the reminder window from seven days to, say, three?**
A: Not currently — the job is documented as a fixed Seven-Day Preparation check; no per-user or per-matter configurable window is described.

**Q: What exactly triggers a reminder?**
A: The Proceeding's next hearing date (hearing_date) falling within seven days of the current date, checked by the daily job.

**Q: Do I get reminders for Matters that don't have a Proceeding?**
A: No — reminders are tied to a Proceeding's hearing_date, so a Matter with zero Proceedings has no hearing date to trigger a reminder from.

**Q: Is there an API to pull my notifications programmatically?**
A: Yes, `GET /api/notifications`.

**Q: Can I turn off hearing reminders?**
A: The facts sheet describes the Seven-Day Preparation job and in-app bell delivery, but doesn't document a per-user opt-out setting.

**Q: If a hearing gets adjourned and rescheduled, does the reminder update?**
A: Saving the new Court Note updates the Proceeding's hearing_date to the new next hearing, and the daily job works off that field — so the reminder logic naturally follows whatever the current hearing_date is.

---

## Document Drafting (Document Creator)

**Q: What is the Document Creator?**
A: The production drafting surface at `/dashboard/draft-builder` — a guided interview engine paired with a full Tiptap rich-text editor, autosave, a focus mode, and print-accurate page layout.

**Q: How is the Document Creator different from `/documents/new`?**
A: The Document Creator is the primary, richer drafting surface with a guided interview, rich-text editing, and print-accurate layout. `/documents/new` is a simpler, separate flow: you type facts in, get an AI-generated first draft, and it's saved as plain text (viewable at `/documents/[id]`).

**Q: What editor powers the Document Creator?**
A: Tiptap, a rich-text editor, integrated with autosave and a focus mode for distraction-free drafting.

**Q: Does my draft save automatically?**
A: Yes, the Document Creator autosaves as you work.

**Q: What is focus mode?**
A: A distraction-reduced view within the Document Creator meant for concentrated drafting work.

**Q: Will my printed document look like what I see on screen?**
A: Yes — the Document Creator uses print-accurate page layout, so the on-screen view reflects how the document will print.

**Q: What's the guided interview engine?**
A: It's the structured question-and-answer flow in the Document Creator that walks you through gathering the facts needed for a document, rather than starting from a blank page.

**Q: Can the AI invent facts in my draft?**
A: No. The AI drafting backend is explicitly instructed never to invent facts, and it's grounded only in the facts you supply — either your own facts reworded or content retrieved from your own indexed documents.

**Q: Can the AI cite case law it found on its own?**
A: No. AI is never described as inventing legal authority — it never produces a citation NextCaseHQ "found" on its own; any citation-like content must come from facts you supplied or your own indexed documents.

**Q: What do DRAFT_CREATE and DRAFT_IMPROVE mean?**
A: They're the two operations of the AI drafting backend (`POST /api/ai/draft`) — DRAFT_CREATE generates a new draft from your facts, and DRAFT_IMPROVE revises an existing one.

**Q: Which AI provider does drafting use?**
A: The drafting backend is provider-agnostic, using OpenAI first and Anthropic as a second option.

**Q: Can I link a document I drafted to a Matter or Proceeding?**
A: Yes — documents in general (stored as DocumentEnvelope/DocumentVersion) are linkable to a Matter and/or a Proceeding.

**Q: Does drafting a document consume AI Credits?**
A: No — AI Credits are used in the Matter Register's chargeable-action flows, but they are explicitly not wired into the Document Creator.

**Q: Can I go back and edit an AI-drafted document later?**
A: Yes, within the Document Creator's rich-text editor, or via DRAFT_IMPROVE for an AI-assisted revision pass.

**Q: Is there a template library administrators can manage?**
A: Yes — templates are one of the sections managed in the Admin Console.

**Q: Can two people work on the same document at the same time?**
A: No. There is no collaborative/multi-user simultaneous editing in the Document Creator today.

**Q: What format does `/documents/new` save in?**
A: Plain text — its output is a simpler AI-generated first draft, not the rich-text/print-layout format used by the Document Creator.

**Q: Can I turn a `/documents/new` draft into a full Document Creator document?**
A: The facts sheet describes these as two separate flows with different storage (plain text vs. rich text) and doesn't document a conversion path between them.

**Q: Does the Document Creator require an existing Matter?**
A: The facts sheet doesn't specify that a Matter is a prerequisite to opening the Document Creator itself, only that resulting documents are linkable to a Matter and/or Proceeding.

---

## AI Assistant & Trust

**Q: How does NextCaseHQ prevent AI from inventing case law?**
A: By design and by rule: AI output is either your own facts reworded, or content retrieved from your own indexed documents — never a citation the system "found" on its own. This applies across every AI-related feature, not just drafting.

**Q: What is `/api/ai/ask`?**
A: The RAG (retrieval-augmented generation) chat endpoint — it answers questions grounded in your own indexed documents.

**Q: What happens if I ask the AI something and nothing relevant is indexed?**
A: It returns a defined "no context found" result rather than guessing or fabricating an answer.

**Q: What's the difference between generated, verified, and retrieved information in NextCaseHQ?**
A: Generated means AI-authored wording; verified means your own entered facts, Court Notes, and Matter data; retrieved means search results pulled from your own indexed documents. NextCaseHQ's trust rules require these to stay distinguishable rather than blurred together.

**Q: Can the AI look things up on the open internet for me?**
A: No — AI output is grounded only in facts you supply or your own indexed documents; it is never described as pulling in outside legal authority on its own.

**Q: Is the data in AI Chamber real?**
A: No — AI Chamber is explicitly labeled on-screen as illustrative sample data, not real case records.

**Q: Should I use an AI-drafted document without reviewing it?**
A: No — the AI reword/retrieve model means the output reflects your inputs, but you remain responsible for reviewing accuracy before relying on or filing anything.

**Q: Does the AI have access to a legal case-law database?**
A: No, not currently. Judgment Research exists only as an architecture milestone with a placeholder provider — zero external legal-research vendor is connected yet.

**Q: What is Judgment Research?**
A: A dashboard and API (`/dashboard/judgment-research`, `GET /api/judgments/search`) intended for case-law research. Today it's architecture only, with a placeholder provider and no real legal-research vendor behind it.

**Q: Is Judgment Research connected to a real database?**
A: No. It has zero external legal-research/citation provider connected at this time.

**Q: Can the RAG chat answer questions about documents I haven't uploaded/indexed?**
A: No — if nothing relevant is indexed, `/api/ai/ask` returns a "no context found" result rather than fabricating an answer.

**Q: Does asking the AI assistant a question cost AI Credits?**
A: The facts sheet documents AI Credits as used in the Matter Register's chargeable-action flows and explicitly not wired into the Document Creator; it does not specify whether `/api/ai/ask` itself is a metered action.

**Q: Can the AI draft using facts I never actually gave it?**
A: No — the drafting backend is explicitly instructed never to invent facts, and is grounded only in the facts you supply.

**Q: Who's ultimately responsible for the accuracy of AI-drafted content?**
A: You are. The system is built to avoid inventing facts or citations, but that's a guardrail on the AI, not a substitute for an advocate's own review before use.

---

## Search

**Q: What is Universal Search?**
A: NextCaseHQ's system-wide search, available at `/search` (and `GET /api/search`), covering both indexed documents (hybrid vector + full-text) and entities like matters, cases, participants, and document types.

**Q: What can I actually search for?**
A: Indexed documents (by content), plus matters, cases, participants, and document types as searchable entity categories.

**Q: What does "hybrid vector + full-text search" mean here?**
A: It combines pgvector-based semantic (meaning-based) search with traditional full-text keyword search over your indexed documents, so results can match on either meaning or exact wording.

**Q: Where's the search interface?**
A: The main one is at `/search`; there's also an in-Matter Command Center for searching within a single Matter's context.

**Q: Is there a search API for integrations?**
A: Yes, `GET /api/search`.

**Q: Can I restrict a search to just one Matter?**
A: The Command Center inside a Matter workspace is specifically for searching within that Matter's own context, as distinct from the system-wide `/search`.

**Q: Do documents need to be indexed before they're searchable?**
A: Yes — documents are stored with hybrid (pgvector + full-text) search indexing, which is what makes their content searchable.

**Q: Can I search for opposing counsel or other participants?**
A: Yes, participants are one of the entity types Universal Search covers, alongside matters, cases, and document types.

**Q: Does search return external case law or judgments?**
A: No — Universal Search covers your own indexed documents and internal entities; it isn't connected to any external case-law database (that's Judgment Research, which has no external provider connected either).

**Q: Is search available from the Dashboard too?**
A: The Dashboard includes a Legal Search workspace as one of its sections, alongside recent Matters, Quick Actions, and Today's Cases.

---

## Document Management

**Q: How are documents stored?**
A: In S3-compatible object storage, modeled as DocumentEnvelope (the document record) and DocumentVersion (each saved version), and indexed for hybrid search.

**Q: Are documents versioned?**
A: Yes — every save creates a DocumentVersion under the parent DocumentEnvelope, giving you a version history.

**Q: Can a document be linked to both a Matter and a Proceeding?**
A: Yes, documents can be linked to a Matter and/or a Proceeding.

**Q: What's the difference between DocumentEnvelope and DocumentVersion?**
A: DocumentEnvelope is the overall document record (its identity, links to Matter/Proceeding); DocumentVersion is a specific saved version of that document's content.

**Q: Can I upload existing files like PDFs or Word documents?**
A: Documents are stored in S3-compatible storage and are one of the Dashboard's Quick Actions ("Upload/Link a Document"), indicating uploading and linking existing files is supported.

**Q: Are uploaded documents automatically searchable?**
A: Yes — stored documents get hybrid (pgvector + full-text) search indexing, which is what powers Universal Search over document content.

**Q: Can I search by document type?**
A: Yes, document type is one of the entity categories Universal Search covers.

**Q: Who can access a given document?**
A: The facts sheet confirms documents link to a Matter and/or Proceeding but doesn't detail granular per-user document permission rules beyond that association.

**Q: Can I go back to an older version of a document?**
A: Versioning is part of the model (DocumentVersion under DocumentEnvelope), which implies version history exists; the facts sheet doesn't detail a specific rollback/restore workflow beyond that.

**Q: Where do administrators manage document templates?**
A: Templates are a section of the Admin Console (`/admin/*`).

**Q: Does NextCaseHQ OCR scanned documents automatically?**
A: This isn't documented as a current feature. The facts sheet describes S3-compatible storage with hybrid pgvector + full-text indexing, but no OCR pipeline for scanned images.

**Q: Can I download a document after editing it in the Document Creator?**
A: The facts sheet documents print-accurate page layout in the Document Creator, implying documents are meant to be printed/exported, without detailing the exact export/download mechanics.

---

## Judgment Research & eCourts Verification

**Q: What is the eCourts case-status reference?**
A: A manual, advocate-confirmed lookup guide at `/ecourts-verification` for checking case status against eCourts. It is never automated scraping — you look things up and confirm them yourself.

**Q: Does NextCaseHQ automatically scrape eCourts for me?**
A: No. eCourts verification is explicitly a manual, advocate-confirmed lookup guide, not an automated scraper.

**Q: Is Judgment Research a working case-law search engine today?**
A: No. It's architecture only right now — a dashboard and API exist (`/dashboard/judgment-research`, `GET /api/judgments/search`), but they sit on a placeholder provider with zero real legal-research vendor connected.

**Q: What legal database powers Judgment Research?**
A: None yet. There is no real legal-research/citation database connected — it's a placeholder architecture milestone.

**Q: Can I rely on Judgment Research results for a filing?**
A: No — since there's no real external provider connected, any results are from a placeholder, not a genuine case-law database, and shouldn't be relied on for actual legal research yet.

**Q: Where do I access eCourts verification?**
A: At `/ecourts-verification`.

**Q: Do I still need to manually confirm case status through eCourts myself?**
A: Yes — that's exactly what this feature is: a guided manual lookup, not an automated status feed.

**Q: Will Judgment Research eventually connect to a real provider?**
A: The facts sheet describes it as an architecture milestone with no external provider connected "yet," implying future connection is intended, though no specific provider or timeline is documented.

---

## Account & Access

**Q: How do I log in?**
A: The facts sheet doesn't detail the authentication mechanism itself; once logged in, you land on the Dashboard (`/dashboard`).

**Q: Can I use NextCaseHQ on my phone's browser?**
A: Yes, it's web-responsive, though there's no dedicated mobile app.

**Q: What roles exist in NextCaseHQ?**
A: The Admin Console has a dedicated "roles" section, indicating role-based access is part of the system, though the facts sheet doesn't enumerate every specific role name and its permissions.

**Q: Who manages roles and permissions?**
A: Administrators, via the roles section of the Admin Console (`/admin/*`).

**Q: Can a clerk create a Matter?**
A: The facts sheet doesn't document per-role restrictions on Matter creation specifically; roles and permissions themselves are configured in the Admin Console.

**Q: Can I add team members to a specific Matter?**
A: The Matter workspace includes a team tab, which indicates per-Matter team association exists as part of the interface.

**Q: What does the "team" tab on a Matter show?**
A: It's one of the documented tabs of the Matter workspace (`/matters/[id]`), alongside overview, health, proceedings, timeline, documents, Command Center search, and Action Cards.

**Q: Does NextCaseHQ support single sign-on (SSO)?**
A: This isn't documented in the facts sheet as a current feature.

**Q: Can one account manage multiple firms?**
A: The Admin Console includes firm management as one of its sections, which indicates firm-level administration exists, though the facts sheet doesn't detail cross-firm account switching mechanics.

**Q: Is there an audit trail of user actions?**
A: Yes — audit is one of the documented sections of the Admin Console.

**Q: Can I export my firm's data?**
A: This isn't documented in the facts sheet as a current feature.

**Q: What happens to my access if I leave a firm?**
A: User and role management is handled through the Admin Console's users and roles sections, though the facts sheet doesn't detail the specific offboarding workflow.

---

## Billing & AI Credits

**Q: What are AI Credits?**
A: A commercialization and metering layer — plans, per-action costs, a wallet balance, and a ledger — used to track chargeable AI-driven actions in the Matter Register.

**Q: Is real billing/payment collection wired up yet?**
A: No. A Stripe abstraction exists at the library level, but nothing in the app currently charges a real card. AI Credits is explicitly a local/mock persistence prototype today, not a production billing system.

**Q: How are AI Credits deducted?**
A: Through the Matter Register's chargeable-action flows, drawing down a wallet balance and recording each deduction in a ledger, based on configured per-action costs.

**Q: Does drafting a document in the Document Creator use AI Credits?**
A: No — AI Credits are explicitly not wired into the Document Creator; they apply to chargeable actions within the Matter Register instead.

**Q: Where do I check my AI Credit balance?**
A: At `/dashboard/credits`.

**Q: What is the AI Credits ledger?**
A: A record of AI Credit transactions — deductions against your wallet balance for chargeable actions — part of the plans/costs/wallet/ledger structure that makes up AI Credits.

**Q: Can administrators configure how much an action costs in credits?**
A: Yes — per-action costs and plans are part of the AI-credit commercialization configuration in the Admin Console.

**Q: Will my credit card be charged automatically when I run low on credits?**
A: No — there is no real payment collection in the current release. The Stripe abstraction exists at the library level, but no route actually charges a card.

**Q: What happens if my AI Credit wallet balance hits zero?**
A: The facts sheet documents the existence of a wallet balance and per-action costs but doesn't specify the exact behavior when a balance is exhausted.

**Q: Is AI Credits data safe to treat as an accurate, permanent billing record?**
A: Not yet — it's explicitly described as a local/mock persistence prototype. A real billing backend is a future milestone, not what's running today.

**Q: Can I purchase additional AI Credits?**
A: Not through a real payment flow today, since no real payment collection is wired up yet — purchasing would require the production billing backend that hasn't shipped.

**Q: Where do administrators configure AI-credit plans and commercialization settings?**
A: In the Admin Console, under its AI-credit commercialization configuration section.

**Q: Is there a published free tier or fixed price list?**
A: The facts sheet doesn't document a public pricing structure — plans and costs are configured by administrators through the commercialization settings rather than being fixed system-wide.

---

## Administration

**Q: What is the Admin Console?**
A: A set of pages under `/admin/*` covering firms, users, roles, security, feature flags, AI-credit commercialization config, templates, notices, audit, eCourts config, legal search config, integrations, and general settings.

**Q: What can administrators configure there?**
A: Firm details, user accounts, roles, security settings, feature flags, AI-credit plans/costs, document templates, notices, audit review, eCourts configuration, legal search (Judgment Research) configuration, third-party integrations, and general settings.

**Q: Can admins turn features on or off?**
A: Yes — feature flags are one of the documented Admin Console sections.

**Q: Where do I manage document/drafting templates as an admin?**
A: In the templates section of the Admin Console.

**Q: Is there an audit log administrators can review?**
A: Yes, audit is a dedicated Admin Console section.

**Q: Can admins configure eCourts-related settings?**
A: Yes — eCourts config is one of the Admin Console's sections.

**Q: Can admins configure Judgment Research / legal search settings?**
A: Yes — legal search config is a documented Admin Console section, even though Judgment Research itself has no external provider connected yet.

**Q: Where do security settings live?**
A: Under the security section of the Admin Console.

**Q: What are "Notices" in the Admin Console?**
A: A documented section of the Admin Console; the facts sheet confirms its existence as a management area without detailing its exact content beyond that.

**Q: Can admins manage third-party integrations?**
A: Yes, integrations is one of the Admin Console's sections.

**Q: Can a non-admin user access `/admin/*`?**
A: The facts sheet documents roles and security as configurable areas within the Admin Console, implying access to it is meant to be restricted, though it doesn't spell out the exact enforcement.

**Q: Can I add a new firm to the system?**
A: Firms are one of the Admin Console's management sections, indicating firm-level setup is an administrative function.

**Q: How do I add or remove users?**
A: Through the users section of the Admin Console.

**Q: Can I configure AI Credit plans as an administrator?**
A: Yes, that's covered by the AI-credit commercialization configuration section of the Admin Console.

**Q: Is there a general settings area for system-wide configuration?**
A: Yes, "settings" is one of the listed Admin Console sections.

**Q: Can I change which court forum types appear on the Court Note screen?**
A: The court_forum_type list (Supreme Court, High Court, Civil Court, Criminal Court, Family Court, Commercial Court, Consumer Commission, Labour Court, MACT, Arbitration, Revenue Court, Other) is documented as a fixed list; the facts sheet doesn't describe an admin control to customize it.

**Q: Are administrative actions themselves audited?**
A: Audit is a dedicated Admin Console section; the facts sheet doesn't detail exactly which actions are captured within it.

**Q: Can I bulk-import matters from a spreadsheet?**
A: This isn't documented as a current feature.

---

## Troubleshooting

**Q: Saving a Court Note fails — what should I check first?**
A: Confirm you're recording it against an existing Proceeding — Court Notes require one, and a Matter with no Proceeding cannot have a Court Note recorded against it at all.

**Q: The next hearing date on my Proceeding didn't change after I recorded today's hearing — why?**
A: Check that you entered a next_hearing_date on the Court Note — that's the value that atomically updates the Proceeding's hearing_date on save. If it wasn't entered, the Proceeding's hearing_date won't move.

**Q: I don't see a voice dictation option on the Court Note screen — why?**
A: Voice input is feature-detected based on your browser's support for dictation. If your browser doesn't support the underlying API, only manual typing will be offered.

**Q: I filled in next_actions but no Task appeared — what happened?**
A: Double-check the Court Note actually saved successfully; a Task is created automatically and only when next_actions is non-empty on a successful save. An empty or unsaved next_actions field won't produce a Task.

**Q: I can't find a way to record a Court Note for one of my Matters — why?**
A: That Matter likely has no Proceeding yet. Court Notes require an existing Proceeding; for a Matter without one, log activity on the Matter Timeline via "Add Entry" instead.

**Q: I uploaded a document but search isn't finding it — why?**
A: Documents need to complete hybrid (pgvector + full-text) indexing before they're searchable; if indexing hasn't finished or failed, the document won't yet surface in Universal Search results.

**Q: The AI assistant told me "no context found" — why?**
A: `/api/ai/ask` returns that result deliberately when nothing relevant is indexed for your question, rather than guessing. Index the relevant document first, or rephrase to match what's actually indexed.

**Q: Can a colleague and I both edit the same draft at once without conflicts?**
A: No — there's no collaborative/multi-user simultaneous editing in the Document Creator, so concurrent edits by two people aren't supported and should be avoided.

**Q: I didn't get an email about an upcoming hearing — is that a bug?**
A: No — that's expected. Reminders are delivered only through the in-app Notification bell today; email/SMS delivery isn't wired up in the app yet, even though the underlying library exists.

**Q: My Matter shows a needs-attention flag — how do I clear it?**
A: The facts sheet confirms needs-attention is a live-derived part of Matter Health but doesn't document the specific trigger conditions or a manual way to clear it; it should reflect underlying Matter/Proceeding/Task data once that data is updated.

**Q: I closed a Matter, but I want to double check nothing else changes silently — what actually happens?**
A: Closing sets the Matter's status to CLOSED and records closed_at. The facts sheet doesn't document any other automatic side effects (like locking the Timeline or documents) triggered by that status change.

**Q: My AI Credit balance looks wrong — who do I ask?**
A: Keep in mind AI Credits today is explicitly a local/mock persistence prototype, not a production billing ledger, so discrepancies should be raised with your firm administrator, who manages the commercialization configuration.

**Q: I can't find useful case-law results in Judgment Research — why?**
A: Because there's currently no real external legal-research provider connected — it's architecture with a placeholder provider, so results won't reflect an actual case-law database yet.

**Q: A payment/credit-card charge I expected didn't go through — why?**
A: No real payment collection exists in the current release; the Stripe abstraction is present at the library level but unused by the app, so no route currently charges a card.

**Q: A Proceeding still shows an old hearing date after I know the case was heard — what should I check?**
A: Confirm a Court Note was actually saved for that hearing with a next_hearing_date filled in — that's the only mechanism that updates a Proceeding's hearing_date, and it happens atomically only on a successful Court Note save.
