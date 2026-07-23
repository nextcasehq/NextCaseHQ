# NextCaseHQ — Glossary

A single alphabetical reference covering both NextCaseHQ product terminology
and general Indian litigation terms a user will encounter while working in
the platform. Entries with an **In NextCaseHQ:** line describe a real,
shipped product feature or field; general legal terms without a direct
product feature skip that line.

---

**Action Card** — A prompt shown inside a Matter workspace pointing you toward a useful next step for that Matter.
*In NextCaseHQ:* Displayed on `/matters/[id]` alongside the overview, health, proceedings, timeline, documents, and team tabs.
*See also:* Matter Workspace, Command Center, Matter Health.

**Adjournment** — The postponement of a hearing to a later date, ordered by the court or requested by a party.
*In NextCaseHQ:* Recorded by entering the new date as next_hearing_date on a Court Note, which automatically becomes the Proceeding's next hearing_date.
*See also:* Court Note, Hearing Date, Stage.

**Admin Console** — The set of administrative pages where a firm configures NextCaseHQ itself, as opposed to doing casework.
*In NextCaseHQ:* Lives at `/admin/*` and covers firms, users, roles, security, feature flags, AI-credit commercialization config, templates, notices, audit, eCourts config, legal search config, integrations, and settings.
*See also:* Feature Flag, Audit Log, AI Credits.

**Advocate** — A lawyer licensed to practice and argue cases before Indian courts, the general professional term used throughout NextCaseHQ instead of "attorney."
*See also:* Counsel, Vakalatnama, Bench.

**Affidavit** — A written statement of facts sworn or affirmed before an authorized officer, submitted as evidence or in support of an application.
*See also:* Pleadings, Written Statement, Deposition.

**AI Chamber** — A sample-data showcase area demonstrating what an AI-assisted workspace could look like.
*In NextCaseHQ:* Found at `/dashboard/ai-chamber`, explicitly labeled on-screen as illustrative, not real case records, and is not the primary landing surface.
*See also:* Dashboard, Generated Information.

**AI Credits** — NextCaseHQ's commercialization and metering layer for chargeable AI-driven actions: plans, per-action costs, a wallet balance, and a ledger.
*In NextCaseHQ:* Used in the Matter Register's chargeable-action flows (not the Document Creator); today it is explicitly a local/mock persistence prototype, not a production billing ledger. Balance is viewed at `/dashboard/credits`; plans/costs are configured in the Admin Console.
*See also:* Ledger, Wallet Balance, Admin Console.

**AI Drafting Backend** — The server-side endpoint that produces and revises document drafts.
*In NextCaseHQ:* `POST /api/ai/draft`, supporting DRAFT_CREATE and DRAFT_IMPROVE operations, provider-agnostic (OpenAI first, Anthropic second), grounded only in facts supplied and explicitly instructed never to invent facts or citations.
*See also:* DRAFT_CREATE / DRAFT_IMPROVE, Document Creator, Generated Information.

**Appeal** — A request to a higher court to review and reverse or modify a lower court's judgment or order.
*In NextCaseHQ:* Modeled as its own Proceeding with status APPEAL, linked back to the suit it appeals via a "Further Proceeding" relationship (relationship_to_prior: APPEAL) — the original Proceeding is never edited, and the chain between the two stays intact under the same Matter.
*See also:* Proceeding, Revision, Execution.

**Arbitration** — A private dispute-resolution process where parties submit their dispute to one or more arbitrators for a binding decision, outside the regular court system.
*In NextCaseHQ:* Both an engagement_type on a Matter and a court_forum_type on a Court Note, and one of the kinds of formal instance a Proceeding can represent (an "arbitration reference").
*See also:* Mediation, Engagement Type, Court Forum Type.

**Audit Log** — A record of administrative and system actions kept for accountability and review.
*In NextCaseHQ:* A dedicated section of the Admin Console; the facts sheet confirms its existence without detailing exactly which actions are captured.
*See also:* Admin Console, Security Settings.

**Bail** — An order releasing an accused person from custody, with or without conditions, pending trial or appeal.
*See also:* Criminal Court, FIR, Remand.

**Bench** — The judge or panel of judges hearing a case; also used to refer to a specific court division.
*In NextCaseHQ:* A field on both the Matter and, separately, tracked via the Proceeding's judge field.
*See also:* Judge, Court, Stage.

**Case Diary** — The everyday name for a Court Note: the running, hearing-by-hearing record of a Proceeding.
*In NextCaseHQ:* Synonymous with Court Note; recorded at `/cases/[id]/court-note`.
*See also:* Court Note, Matter Timeline.

**Cause List** — The published daily list of cases scheduled for hearing before a particular court or bench on a given day.
*See also:* Hearing Date, Stage, Court.

**Cause of Action** — The set of facts that gives a party the legal right to sue another party.
*See also:* Plaint, Suit, Limitation Period.

**Caveat** — A notice lodged with a court asking to be heard before any order is passed against the caveator in a matter, typically anticipating an application by the opposing side.
*See also:* Interim Application, Interim Order.

**Civil Court** — A court that hears disputes between private parties (contracts, property, torts, etc.), as opposed to criminal prosecutions.
*In NextCaseHQ:* One of the fixed court_forum_type options on a Court Note.
*See also:* Court Forum Type, Criminal Court, Family Court.

**Client** — The party a Matter is being handled on behalf of.
*In NextCaseHQ:* Referenced on a Matter via its client_id field.
*See also:* Matter, Opposing Party.

**Command Center** — The in-workspace search available inside a single Matter.
*In NextCaseHQ:* Lets you search within one Matter's own context, distinct from the system-wide Universal Search at `/search`.
*See also:* Matter Workspace, Universal Search, Action Card.

**Commercial Court** — A designated court (or division of a court) handling commercial disputes above a specified value, under India's Commercial Courts Act framework.
*In NextCaseHQ:* One of the fixed court_forum_type options on a Court Note.
*See also:* Court Forum Type, Civil Court.

**Compliance (Engagement Type)** — Ongoing regulatory or statutory compliance work for a client, not tied to a dispute.
*In NextCaseHQ:* One of the ten engagement_type values a Matter can carry.
*See also:* Engagement Type, Advisory Matter.

**Consumer Commission** — A quasi-judicial forum (District, State, or National) that adjudicates consumer disputes under consumer protection law.
*In NextCaseHQ:* One of the fixed court_forum_type options on a Court Note.
*See also:* Court Forum Type, MACT.

**Contempt of Court** — Conduct that disobeys or disrespects the authority of a court, punishable by the court itself.
*See also:* Order, Stay Order.

**Contractual (Engagement Type)** — Matter work centered on drafting, reviewing, or negotiating contracts, rather than a dispute or advisory question.
*In NextCaseHQ:* One of the ten engagement_type values a Matter can carry.
*See also:* Engagement Type, Transactional Matter.

**Counsel** — A lawyer representing a party in a proceeding; "opposing counsel" refers to the lawyer(s) representing the other side.
*In NextCaseHQ:* opposing_counsel is a field on the Matter record.
*See also:* Advocate, Opposing Party, Vakalatnama.

**Court** — The judicial body before which a Matter or Proceeding is pending.
*In NextCaseHQ:* A field on both the Matter and the Proceeding.
*See also:* Bench, Judge, Court Forum Type.

**Court Forum Type** — The fixed category of forum a hearing took place before.
*In NextCaseHQ:* A field on every Court Note, chosen from a fixed list: Supreme Court, High Court, Civil Court, Criminal Court, Family Court, Commercial Court, Consumer Commission, Labour Court, MACT, Arbitration, Revenue Court, Other.
*See also:* Court Note, Proceeding.

**Court Note** — An immutable, append-only record of one hearing under a Proceeding.
*In NextCaseHQ:* Fields include hearing_date, next_hearing_date, court_forum_type, stage, note, next_actions, and input_method. Recorded at `/cases/[id]/court-note`; requires an existing Proceeding. Saving one atomically updates the Proceeding's hearing_date, appends a Matter Timeline entry, and — if next_actions is given — creates exactly one Task.
*See also:* Case Diary, Matter Timeline, Task, Proceeding.

**Criminal Court** — A court that hears prosecutions for offenses under criminal law, as distinguished from civil disputes.
*In NextCaseHQ:* One of the fixed court_forum_type options on a Court Note.
*See also:* Court Forum Type, FIR, Bail.

**Dashboard** — The launch page shown after logging in.
*In NextCaseHQ:* Found at `/dashboard`, showing recent Matters, Quick Actions (Draft a Document, Upload/Link a Document, Next Hearing & Stage), Today's Cases, and a Legal Search workspace.
*See also:* Quick Actions, Matter Register.

**Decree** — The formal expression of a court's final adjudication of the rights of the parties in a civil suit.
*See also:* Judgment, Order, Execution.

**Defendant** — The party against whom a civil suit is brought.
*See also:* Plaintiff, Suit, Written Statement.

**Deposition** — Sworn out-of-court testimony recorded for use in litigation; less common in Indian civil procedure than in some other systems, where affidavit evidence and cross-examination in open court are more typical.
*See also:* Affidavit, Cross-Examination.

**Disposed** — A case status indicating the Proceeding has concluded — decided, dismissed, withdrawn, or otherwise closed by the court.
*In NextCaseHQ:* One of the four status values a Proceeding can carry (PENDING, HEARING, DISPOSED, APPEAL).
*See also:* Proceeding, Status (Proceeding).

**DocumentEnvelope** — The overall record for a stored document, holding its identity and links to a Matter and/or Proceeding.
*In NextCaseHQ:* Paired with DocumentVersion for version history; stored in S3-compatible storage with hybrid search indexing.
*See also:* DocumentVersion, Document Management.

**DocumentVersion** — One specific saved version of a document's content under a DocumentEnvelope.
*In NextCaseHQ:* Created each time a document is saved, giving version history.
*See also:* DocumentEnvelope.

**Document Creator** — The primary, production drafting surface in NextCaseHQ.
*In NextCaseHQ:* Located at `/dashboard/draft-builder`; combines a guided interview engine with a Tiptap rich-text editor, autosave, focus mode, and print-accurate page layout. Has no collaborative/multi-user simultaneous editing, and AI Credits are not wired into it.
*See also:* AI Drafting Backend, Focus Mode, Guided Interview Engine.

**DRAFT_CREATE / DRAFT_IMPROVE** — The two operations supported by the AI drafting backend.
*In NextCaseHQ:* DRAFT_CREATE generates a new draft from supplied facts; DRAFT_IMPROVE revises an existing draft. Both are provider-agnostic (OpenAI first, Anthropic second) and grounded only in facts supplied.
*See also:* AI Drafting Backend, Document Creator.

**eCourts Verification** — A manual, advocate-confirmed guide for checking case status against the government eCourts system.
*In NextCaseHQ:* Found at `/ecourts-verification`; never automated scraping — you look up and confirm status yourself.
*See also:* Cause List, Judgment Research.

**Engagement Type** — The category describing what kind of work a Matter represents.
*In NextCaseHQ:* A required field on every Matter, with ten possible values: LITIGATION, PRE_LITIGATION, ADVISORY, CONTRACTUAL, TRANSACTIONAL, ARBITRATION, MEDIATION, COMPLIANCE, INVESTIGATION, OTHER.
*See also:* Matter, Advisory Matter, Litigation.

**Ex Parte** — Proceedings or an order made on the application of, or affecting, one party without the other side being present or heard.
*See also:* Interim Order, Notice.

**Examination-in-Chief** — The initial questioning of a party's own witness in court, before cross-examination by the opposing side.
*See also:* Cross-Examination, Affidavit.

**Execution** — The legal process of enforcing a court's decree or order, such as recovering money or possession awarded by a judgment.
*In NextCaseHQ:* One of the kinds of formal instance a Proceeding can represent ("an execution application"), recorded as its own Proceeding linked back to the decree/suit it enforces via a "Further Proceeding" relationship (relationship_to_prior: EXECUTION).
*See also:* Decree, Proceeding, Appeal.

**Family Court** — A court with jurisdiction over matrimonial and family disputes such as divorce, maintenance, and custody.
*In NextCaseHQ:* One of the fixed court_forum_type options on a Court Note.
*See also:* Court Forum Type.

**Feature Flag** — A configuration switch that turns a specific product feature on or off for a firm.
*In NextCaseHQ:* Managed in the Admin Console.
*See also:* Admin Console.

**FIR (First Information Report)** — The document prepared by police upon receiving information about the commission of a cognizable criminal offense, which sets a criminal investigation in motion.
*See also:* Criminal Court, Bail, Prosecution.

**Focus Mode** — A distraction-reduced editing view for concentrated drafting.
*In NextCaseHQ:* A feature of the Document Creator.
*See also:* Document Creator.

**Generated Information** — Content authored by AI, as distinguished from your own verified data or content retrieved from your indexed documents.
*In NextCaseHQ:* One of three categories NextCaseHQ's trust rules require documentation and product surfaces to distinguish — generated (AI-authored wording), verified (your own entered facts, Court Notes, Matter data), and retrieved (search results from your own indexed documents). AI is never described as inventing legal authority on its own.
*See also:* Verified Information, Retrieved Information, AI Drafting Backend.

**Guided Interview Engine** — The structured question-and-answer flow that gathers facts needed to produce a document.
*In NextCaseHQ:* Part of the Document Creator at `/dashboard/draft-builder`.
*See also:* Document Creator.

**Hearing Date** — The date a Proceeding is scheduled to be heard.
*In NextCaseHQ:* A field on the Proceeding that always holds the *next* scheduled hearing, never the one that just happened; it is updated automatically to the next hearing whenever a Court Note is saved.
*See also:* Proceeding, Court Note, Next Hearing.

**High Court** — The highest court in an Indian state (or group of states/union territories), sitting above district and subordinate courts and below the Supreme Court.
*In NextCaseHQ:* One of the fixed court_forum_type options on a Court Note.
*See also:* Supreme Court, Court Forum Type.

**Injunction** — A court order requiring a party to do, or refrain from doing, a specific act, typically to prevent harm pending final resolution of a dispute.
*See also:* Interim Order, Stay Order.

**Interim Application / Interlocutory Application** — An application made to the court for temporary relief or a procedural direction while the main proceeding is still pending.
*See also:* Interim Order, Suit, Petition.

**Interim Order** — A temporary order made by a court to preserve the status quo or provide relief while a case is pending, before final judgment.
*See also:* Injunction, Stay Order, Interim Application.

**Interrogatories** — Written questions formally served by one party on another during a suit, which must be answered under oath, used to obtain admissions or clarify facts before trial.
*See also:* Discovery, Pleadings.

**Investigation (Engagement Type)** — Matter work centered on fact-finding or internal investigation for a client, rather than a court dispute.
*In NextCaseHQ:* One of the ten engagement_type values a Matter can carry.
*See also:* Engagement Type, Compliance.

**Judge** — The judicial officer presiding over a case.
*In NextCaseHQ:* A field on both the Matter and the Proceeding.
*See also:* Bench, Court.

**Judgment** — A court's final reasoned decision resolving the issues in a case.
*See also:* Decree, Order, Disposed.

**Judgment Research** — A dashboard and API intended for case-law and judgment research.
*In NextCaseHQ:* Found at `/dashboard/judgment-research` and `GET /api/judgments/search`; today it is architecture only, running on a placeholder provider with zero external legal-research vendor connected.
*See also:* eCourts Verification, Universal Search.

**Junior/Senior Advocate** — Informal seniority terms among Indian advocates; "Senior Advocate" is also a formal designation conferred by a High Court or the Supreme Court on advocates of standing and expertise.
*See also:* Advocate, Vakalatnama.

**Labour Court** — A court or tribunal adjudicating disputes between employers and workmen under labour and industrial-relations law.
*In NextCaseHQ:* One of the fixed court_forum_type options on a Court Note.
*See also:* Court Forum Type.

**Ledger** — The transaction record of AI Credit deductions against a wallet balance.
*In NextCaseHQ:* Part of the AI Credits model (plans, per-action costs, wallet balance, ledger), currently a local/mock persistence prototype rather than a production billing ledger.
*See also:* AI Credits, Wallet Balance.

**Limitation Period** — The statutory time limit within which a suit, appeal, or application must be filed, after which the right to sue is generally barred.
*See also:* Cause of Action, Suit, Appeal.

**Litigation (Engagement Type)** — Matter work centered on an active or contemplated court dispute.
*In NextCaseHQ:* One of the ten engagement_type values a Matter can carry.
*See also:* Engagement Type, Proceeding, Pre-Litigation.

**MACT (Motor Accidents Claims Tribunal)** — A specialized tribunal that adjudicates compensation claims arising from motor vehicle accidents.
*In NextCaseHQ:* One of the fixed court_forum_type options on a Court Note.
*See also:* Court Forum Type, Consumer Commission.

**Matter** — The client engagement — the top-level record for a piece of work for a client, whether or not it involves a court case.
*In NextCaseHQ:* Fields include title, matter_number, engagement_type, practice_area, status, client_id, opposing_party_name, opposing_counsel, court, bench, judge, description, opened_at, closed_at. A Matter can exist with zero Proceedings (advisory work is a first-class, valid state).
*See also:* Proceeding, Engagement Type, Matter Register.

**Matter Health** — A live-derived summary of a Matter's current standing.
*In NextCaseHQ:* Shows current stage, last hearing date/forum/note, next hearing date, pending action count, and a needs-attention flag.
*See also:* Matter, Needs-Attention Flag, Task.

**Matter Number** — A firm's own internal reference number for a Matter, distinct from any court-assigned case number.
*In NextCaseHQ:* The matter_number field on a Matter, as opposed to case_number on a Proceeding.
*See also:* Matter, Case Number, Proceeding.

**Matter Register** — The list and management view of all Matters.
*In NextCaseHQ:* Found at `/matters`, with individual Matter workspaces at `/matters/[id]`.
*See also:* Matter, Matter Workspace.

**Matter Timeline** — The unified chronology of a Matter, combining automatic hearing outcomes with manually added entries.
*In NextCaseHQ:* Technically the MatterEvent model; source_type=HEARING entries are auto-created by Court Notes, source_type=MANUAL entries are added via the Timeline's own "Add Entry" — the correct place to log advisory or non-hearing activity for a Matter with no Proceeding.
*See also:* Court Note, Matter, Matter Health.

**Matter Workspace** — The working page for a single Matter.
*In NextCaseHQ:* `/matters/[id]`, with tabs for overview, health, proceedings, timeline, documents, team, an in-Matter Command Center, and Action Cards.
*See also:* Matter, Matter Register, Command Center.

**Mediation** — A voluntary, facilitated negotiation process where a neutral third party helps disputing parties reach a settlement, without imposing a binding decision.
*In NextCaseHQ:* Both an engagement_type on a Matter and a distinct concept from Arbitration (which is binding).
*See also:* Arbitration, Engagement Type.

**Memorandum of Appeal** — The formal document setting out the grounds on which a party appeals a lower court's decision.
*See also:* Appeal, Petition.

**Needs-Attention Flag** — An indicator that a Matter requires review.
*In NextCaseHQ:* Part of the live-derived Matter Health summary.
*See also:* Matter Health.

**NI Act Section 138** — Section 138 of the Negotiable Instruments Act, 1881 — the provision criminalizing dishonour of a cheque for insufficiency of funds, one of the most commonly litigated criminal provisions in Indian commercial practice.
*See also:* Criminal Court, Complainant, Notice.

**Next Hearing** — The date entered on a Court Note for when a Proceeding is next listed.
*In NextCaseHQ:* Captured as next_hearing_date on a Court Note; saving the note atomically propagates this value onto the Proceeding's hearing_date field.
*See also:* Court Note, Hearing Date, Seven-Day Preparation.

**Notice** — A formal communication informing a party of a legal action, requirement, or deadline (e.g., a legal notice, a notice of demand, a court notice).
*See also:* Summons, NI Act Section 138.

**Notification Bell** — The in-app alert indicator for reminders and system messages.
*In NextCaseHQ:* Where hearing reminders from the Seven-Day Preparation job are delivered; backed by `GET /api/notifications`. There is no email/SMS delivery of these reminders yet.
*See also:* Seven-Day Preparation, Reminders.

**Opposing Party** — The party on the other side of a Matter's dispute.
*In NextCaseHQ:* opposing_party_name is a field on the Matter, alongside opposing_counsel.
*See also:* Matter, Counsel.

**Order** — A formal direction issued by a court, which may be interim (temporary) or final, as distinct from a full judgment or decree.
*See also:* Judgment, Decree, Stay Order.

**Petition** — A formal written application to a court invoking its jurisdiction, used in place of a plaint for certain kinds of proceedings (e.g., writ petitions, company petitions, matrimonial petitions).
*In NextCaseHQ:* One of the kinds of formal instance a Proceeding can represent.
*See also:* Proceeding, Writ Petition, Plaint.

**Petitioner** — The party who files a petition, analogous to a plaintiff in a suit.
*See also:* Petition, Respondent.

**Plaint** — The formal written statement of a plaintiff's claim that institutes a civil suit.
*See also:* Suit, Plaintiff, Written Statement.

**Plaintiff** — The party who institutes a civil suit against another party.
*See also:* Defendant, Plaint, Suit.

**Pleadings** — The formal written statements exchanged by parties in a suit (plaint, written statement, rejoinder, etc.) that define the issues to be tried.
*See also:* Plaint, Written Statement, Rejoinder.

**Power of Attorney** — A document authorizing a person to act on another's behalf, including in legal or court proceedings.
*See also:* Vakalatnama.

**Practice Area** — The subject-matter specialization associated with a Matter (e.g., property, family, commercial, criminal).
*In NextCaseHQ:* A field on the Matter record.
*See also:* Matter, Engagement Type.

**Pre-Litigation (Engagement Type)** — Matter work undertaken before a formal court case is filed, such as sending notices or exploring settlement.
*In NextCaseHQ:* One of the ten engagement_type values a Matter can carry.
*See also:* Engagement Type, Litigation, Notice.

**Proceeding** — One formal instance before one court or forum under a Matter — a suit, petition, appeal, execution application, criminal case, or arbitration reference.
*In NextCaseHQ:* Internally modeled as LegalCase. Fields: title, case_number, country_code, court, judge, stage, status (PENDING, HEARING, DISPOSED, APPEAL), hearing_date, notes, a nullable matter_id, and an optional link back to a prior Proceeding (prior_proceeding_id + relationship_to_prior) for appeals, revisions, executions, and similar continuations.
*See also:* Matter, Court Note, Status (Proceeding).

**Prosecution** — The party (typically the state, represented by a public prosecutor) bringing criminal charges against an accused.
*See also:* Criminal Court, FIR, Bail.

**Quick Actions** — Shortcut entry points shown on the Dashboard.
*In NextCaseHQ:* Draft a Document, Upload/Link a Document, and Next Hearing & Stage — each pointing at real, working functionality.
*See also:* Dashboard.

**RAG Chat** — Retrieval-augmented generation chat: an AI feature that answers questions grounded in your own indexed documents.
*In NextCaseHQ:* `POST /api/ai/ask`; returns a defined "no context found" result when nothing relevant is indexed, rather than guessing.
*See also:* Retrieved Information, Universal Search.

**Rejoinder** — A pleading filed by the plaintiff in reply to the defendant's written statement.
*See also:* Written Statement, Pleadings.

**Remand** — An order sending an accused back into custody (police or judicial) during investigation or trial, or a higher court sending a case back to a lower court for reconsideration.
*See also:* Bail, Appeal.

**Reminders** — Automated notifications about upcoming hearings.
*In NextCaseHQ:* Generated by the daily Seven-Day Preparation job and delivered via the in-app Notification bell only — not email or SMS today, even though that delivery library exists unused at the library level.
*See also:* Seven-Day Preparation, Notification Bell.

**Respondent** — The party against whom a petition, appeal, or application is filed, analogous to a defendant in a suit.
*See also:* Petitioner, Petition.

**Retrieved Information** — Search results pulled from your own indexed documents, as distinguished from AI-generated wording or your own verified data.
*In NextCaseHQ:* One of the three categories (generated, verified, retrieved) NextCaseHQ's trust rules require to stay distinguishable; powers `/api/ai/ask` and Universal Search.
*See also:* Generated Information, Verified Information, Universal Search.

**Revenue Court** — A court or authority dealing with land-revenue and tenancy matters.
*In NextCaseHQ:* One of the fixed court_forum_type options on a Court Note.
*See also:* Court Forum Type.

**Revision** — An application to a higher court asking it to examine the legality or propriety of a lower court's order, typically on narrower grounds than a full appeal.
*See also:* Appeal, Order.

**Seven-Day Preparation** — The daily scheduled job that checks for hearings coming up soon.
*In NextCaseHQ:* Notifies Matter participants whenever a Proceeding's next hearing_date falls within seven days, delivered via the in-app Notification bell.
*See also:* Reminders, Notification Bell, Hearing Date.

**Stage** — The current procedural point a case has reached (e.g., evidence, arguments, final hearing).
*In NextCaseHQ:* A field on both the Proceeding and each Court Note, and one of the values shown in the Matter Health summary.
*See also:* Proceeding, Court Note, Matter Health.

**Status (Matter)** — The current lifecycle state of a Matter.
*In NextCaseHQ:* ACTIVE, ON_HOLD, CLOSED, or ARCHIVED.
*See also:* Matter.

**Status (Proceeding)** — The current lifecycle state of a Proceeding.
*In NextCaseHQ:* PENDING, HEARING, DISPOSED, or APPEAL.
*See also:* Proceeding, Disposed.

**Stay Order** — A court order temporarily suspending the operation or enforcement of a lower order, decree, or proceeding.
*See also:* Interim Order, Injunction.

**Sub-Judice** — A matter that is currently under judicial consideration and has not yet been decided, and about which public comment is therefore generally restricted.
*See also:* Contempt of Court, Proceeding.

**Suit** — A civil action instituted in a court by a plaintiff against a defendant, begun by filing a plaint.
*In NextCaseHQ:* One of the kinds of formal instance a Proceeding can represent.
*See also:* Plaint, Proceeding, Plaintiff.

**Summons** — A court's formal notice to a defendant or accused requiring their appearance or response.
*See also:* Notice, Written Statement.

**Supreme Court** — The apex court of India, the final court of appeal.
*In NextCaseHQ:* One of the fixed court_forum_type options on a Court Note.
*See also:* High Court, Court Forum Type.

**Task** — A correctable pending-action checklist item on a Matter.
*In NextCaseHQ:* Modeled as MatterTask, always created from a Court Note's next_actions field — there is no free-standing manual task creation. Statuses: Pending, Completed, Dismissed.
*See also:* Court Note, Matter Health.

**Transactional (Engagement Type)** — Matter work centered on structuring and closing a transaction (e.g., a deal or acquisition), rather than a dispute.
*In NextCaseHQ:* One of the ten engagement_type values a Matter can carry.
*See also:* Engagement Type, Contractual Matter.

**Universal Search** — NextCaseHQ's system-wide search.
*In NextCaseHQ:* Available at `/search` and `GET /api/search`; hybrid (pgvector + full-text) search over indexed documents, plus entity search across matters, cases, participants, and document types.
*See also:* Command Center, Retrieved Information.

**Vakalatnama** — The formal document by which a client authorizes an advocate to represent them in a proceeding, filed with the court.
*See also:* Advocate, Power of Attorney, Counsel.

**Verified Information** — Your own entered facts, Court Notes, and Matter data, as distinguished from AI-generated wording or retrieved search results.
*In NextCaseHQ:* One of the three categories (generated, verified, retrieved) NextCaseHQ's trust rules require to stay distinguishable across every AI-related feature.
*See also:* Generated Information, Retrieved Information, Court Note.

**Voice Dictation / Input Method** — How a Court Note was captured: Manual (typed), Voice (browser dictation), or Hybrid (a mix).
*In NextCaseHQ:* input_method field on a Court Note; voice input is feature-detected and only appears when the browser supports it.
*See also:* Court Note.

**Wallet Balance** — The current AI Credit balance available for chargeable actions.
*In NextCaseHQ:* Viewed at `/dashboard/credits`, drawn down by the Matter Register's chargeable-action flows and recorded in the ledger; part of the local/mock AI Credits prototype today, not a production billing balance.
*See also:* AI Credits, Ledger.

**Writ Petition** — A petition invoking a High Court's or the Supreme Court's constitutional writ jurisdiction (e.g., habeas corpus, mandamus, certiorari) to enforce fundamental rights or ensure legality of official action.
*See also:* Petition, High Court, Supreme Court.

**Written Statement** — The defendant's formal written reply to a plaint, setting out their defense and any counter-claims.
*See also:* Plaint, Pleadings, Rejoinder.
