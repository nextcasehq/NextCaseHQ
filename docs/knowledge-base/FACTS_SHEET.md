# NextCaseHQ — Facts Sheet (internal grounding document)

Not customer-facing. This is the single accuracy reference every other document
in `docs/knowledge-base/` is written against. Every feature claim in the user
manual, admin manual, FAQ, glossary, and workflow library must trace back to a
fact listed here — nothing is described that isn't real and shipped.

## What NextCaseHQ is

A litigation and matter management platform for Indian advocates and law
firms: a Matter Register (client engagements), Proceedings (formal
court/forum instances under a Matter), Court Notes (hearing records), a
Matter Timeline, hearing reminders, a real Document Creator with an AI-backed
drafting pipeline, Universal Search, and an AI Credits (commercialization)
layer. Judgment Research exists as an architecture milestone with no external
provider connected yet.

## Core domain model (confirmed via db/schema.sql and live testing)

- **Matter** — the client engagement. Fields: title, matter_number,
  engagement_type (LITIGATION, PRE_LITIGATION, ADVISORY, CONTRACTUAL,
  TRANSACTIONAL, ARBITRATION, MEDIATION, COMPLIANCE, INVESTIGATION, OTHER),
  practice_area, status (ACTIVE, ON_HOLD, CLOSED, ARCHIVED), client_id,
  opposing_party_name, opposing_counsel, court, bench, judge, description,
  opened_at, closed_at. A Matter can exist with zero Proceedings (advisory
  work is a first-class, valid state).
- **Proceeding (LegalCase)** — one formal instance before one court/forum: a
  suit, petition, appeal, execution application, criminal case, arbitration
  reference. Fields: title, case_number, country_code, court, judge, stage,
  status (PENDING, HEARING, DISPOSED, APPEAL), hearing_date (the *next*
  scheduled hearing — see Court Note below), notes, matter_id (nullable FK).
  No parent/child link between Proceedings exists yet (an appeal is not
  formally linked to the suit it appeals — flagged as a future enhancement,
  not built).
- **Court Note ("Case Diary")** — an immutable, append-only record of one
  hearing. Fields: hearing_date, next_hearing_date, court_forum_type (fixed
  list: Supreme Court, High Court, Civil Court, Criminal Court, Family Court,
  Commercial Court, Consumer Commission, Labour Court, MACT, Arbitration,
  Revenue Court, Other), stage, note, next_actions, input_method (Manual,
  Voice, Hybrid — voice via browser dictation, feature-detected). Saving one
  atomically updates the Proceeding's hearing_date to the *next* hearing
  (never the one that just happened), appends a Matter Timeline entry, and —
  if next_actions is given — creates exactly one Task. Recorded at
  `/cases/[id]/court-note`, requires an existing Proceeding (a Matter with no
  Proceeding cannot record a Court Note today — this is accurate to say, not
  a bug to hide).
- **Matter Timeline (MatterEvent)** — the unified chronology of a Matter:
  hearing outcomes (source_type=HEARING, auto-created by Court Notes) and
  manual entries (source_type=MANUAL, added via the Matter Timeline's own
  "Add Entry"). This is the correct place to log advisory/non-hearing
  activity for a Matter with no Proceeding.
- **Task (MatterTask)** — a correctable pending-action checklist item,
  always derived from a Court Note's next_actions (no free-standing manual
  task creation exists yet). Statuses: Pending, Completed, Dismissed.
- **Reminders** — a daily scheduled job (Seven-Day Preparation) notifies
  Matter participants when a Proceeding's next hearing falls within 7 days.
  Delivered via the in-app Notification bell, not email/SMS today (the
  Resend/Twilio abstraction exists at the library level but nothing in the
  app calls it yet).
- **Matter Health** — a live-derived summary per Matter: current stage, last
  hearing date/forum/note, next hearing date, pending action count, a
  needs-attention flag.
- **Documents (DocumentEnvelope/DocumentVersion)** — real file storage (S3-
  compatible), versioned, linkable to a Matter and/or a Proceeding, with
  hybrid (pgvector + full-text) search indexing.
- **AI Credits** — a commercialization/metering layer (plans, per-action
  costs, wallet balance, ledger) that is explicitly a local/mock persistence
  prototype today — a real billing backend is a future milestone. It is used
  in the Matter Register's chargeable-action flows; not wired into the
  Document Creator.

## Real, shipped features (with their actual routes)

- Matter Register: `/matters` (list), `/matters/[id]` (workspace: overview,
  health, proceedings, timeline, documents, team, Command Center search,
  Action Cards).
- Proceedings: `/cases`, `/cases/[id]`, `/cases/new`.
- Court Note quick entry: `/cases/[id]/court-note` (dictation-assisted).
- Document Creator (the real, production drafting surface): `/dashboard/
  draft-builder` — guided interview engine, Tiptap rich-text editor,
  autosave, focus mode, print-accurate page layout.
- A second, separate document flow: `/documents/new` (AI-generated first
  draft from typed facts, saved as plain text) and `/documents/[id]`.
- AI drafting backend: `POST /api/ai/draft` (DRAFT_CREATE/DRAFT_IMPROVE,
  provider-agnostic — OpenAI first, Anthropic second — grounded only in
  facts supplied, explicitly instructed never to invent facts or
  citations) and `POST /api/ai/ask` (RAG chat grounded in indexed documents,
  returns a defined "no context found" result rather than guessing when
  nothing relevant is indexed).
- Universal Search: `/search`, `GET /api/search` (hybrid vector + full-text
  over indexed documents, plus matter/case/participant/document-type entity
  search).
- Judgment Research: `/dashboard/judgment-research`, `GET /api/judgments/
  search` — architecture only, a placeholder provider, zero external legal-
  research vendor connected.
- eCourts case-status reference: `/ecourts-verification` — a manual,
  advocate-confirmed lookup guide; never automated scraping.
- Dashboard launch page: `/dashboard` — recent Matters, Quick Actions
  (Draft a Document, Upload/Link a Document, Next Hearing & Stage — all
  pointing at real functionality), Today's Cases, Legal Search workspace.
- AI Chamber: `/dashboard/ai-chamber` — a sample-data showcase (explicitly
  labeled on-screen as illustrative, not real case records); not the
  primary landing surface.
- Admin console: `/admin/*` — firms, users, roles, security, feature flags,
  AI-credit commercialization config, templates, notices, audit, eCourts
  config, legal search config, integrations, settings.
- Notifications: `GET /api/notifications`, in-app bell, hearing-reminder
  delivery.
- AI Credits (user-facing): `/dashboard/credits`.

## What does NOT exist (do not describe these as real)

- No mobile app (web-responsive only).
- No email/SMS delivery of reminders yet (library exists, unused by any
  route).
- No real legal-research/citation database (Judgment Research has zero
  connected provider).
- No collaborative/multi-user simultaneous editing in the Document Creator.
- No parent/child link between Proceedings (appeal/execution relationships
  are not modeled).
- No free-standing task creation independent of a Court Note.
- No real payment collection (Stripe abstraction exists at the library
  level; nothing in the app charges a real card yet).
- AI Credits balances/plans are a local mock store, not a real billing
  ledger.

## Standing product/trust rules (apply to every AI-related claim in the docs)

- AI must never be described as inventing legal authority. Every AI output
  is either the advocate's own facts reworded, or content retrieved from
  the advocate's own indexed documents — never a citation NextCaseHQ
  "found" on its own.
- Distinguish, in documentation as in the product: **generated** language
  (AI-authored wording), **verified** information (the advocate's own
  entered facts, Court Notes, Matter data), and **retrieved** information
  (search results from the advocate's own indexed documents).
