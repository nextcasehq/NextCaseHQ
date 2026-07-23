# NextCaseHQ — User Manual

## 1. Introduction

NextCaseHQ is a litigation and matter management platform built for Indian advocates and law firms. It exists to do one job well: give you a reliable, structured place to keep a client engagement, the court or forum proceedings arising from it, the record of every hearing, the documents you draft and receive, and the reminders that keep you from missing a date — all in one place, organised the way you already think about your practice.

If you have practised for any length of time, you know the alternative. A matter's history is scattered across a diary, a WhatsApp thread, a folder of Word files with names like "Draft_v3_FINAL_FINAL," and whatever you can remember from the last hearing. NextCaseHQ replaces that scatter with a single, dependable record per client engagement.

### The Matter is your digital desk

The organising idea behind NextCaseHQ is the **Matter**. A Matter is the client engagement itself — everything you do for a client on a given subject, whether or not it ever reaches a courtroom. Think of it as your desk for that client: the file that sits open in front of you, onto which everything else is laid. A Matter can carry one Proceeding, several parallel Proceedings, or none at all, because not every engagement is litigation. Advisory work, contract review, a compliance opinion — these are Matters too, and NextCaseHQ treats them as first-class from the start, not as an afterthought bolted onto a case-tracking tool.

Proceedings, Court Notes, documents, and the timeline all attach to the Matter. Wherever you are in the platform, the Matter is the thing that ties the work together.

### What the platform will never do

NextCaseHQ is careful — deliberately and permanently careful — about the line between what it knows and what it invents. This matters because legal work runs on precision, and nothing erodes trust in a tool faster than software that sounds confident while being wrong.

So the platform holds to a simple, non-negotiable rule: it never invents legal authority. It does not generate a citation, a section number, or a case name out of nothing and present it to you as fact. Everything you see in NextCaseHQ falls into one of three categories, and the platform is built to keep these categories distinct rather than blur them into one another:

- **Generated** information — wording an AI feature has produced for you, built only from facts you supplied. This is language, not law.
- **Verified** information — what you or a colleague actually entered: your Matter details, your Court Notes, your case data. This is the record you are responsible for and can trust because you wrote it.
- **Retrieved** information — search results pulled from documents you or your firm have indexed. This is real content, found in something real, never fabricated.

You will see this distinction echoed throughout this manual, because it is the single most important thing to understand about how NextCaseHQ behaves, particularly around drafting and the AI Assistant.

### Who this manual is for

This manual is written for the advocate or law firm user who signs in day to day to manage matters, log hearings, draft documents, and keep track of deadlines. If your firm has also given you administrative responsibilities — managing users, roles, or firm-wide configuration — those functions live in a separate admin console, referenced briefly here and covered in full in the Admin Manual.

Whether you practise solo, run a small chambers, or work within a larger firm with a team spread across several courts, the underlying structure is the same: a Matter for each client engagement, one or more Proceedings under it where litigation is involved, and a record of every hearing that stays put once it's written. This manual walks through each of those pieces in the order you're likely to meet them — starting with signing in, and ending with the day-to-day habits that make the platform work for you rather than becoming one more thing to maintain.

### How to read this manual

You don't need to read this document start to finish before you begin using NextCaseHQ. The early sections (Getting Started, the Dashboard) will orient you in a few minutes. The middle sections (the Matter Register, Proceedings, Court Notes, the Timeline, Reminders) describe the core record-keeping model in the order data actually flows through it — a Matter, then its Proceedings, then the notes recorded against them, then the timeline and reminders those notes feed. The later sections (drafting, the AI Assistant, search, document management) cover the tools you'll reach for once the core records are in place, and the closing sections (Daily Workflow, Hearing Workflow, Best Practices, FAQ, Troubleshooting) are meant to be returned to — a quick reference for a specific moment rather than something to memorise in advance.

---

## 2. Getting Started

### Signing in

You sign in to NextCaseHQ using the credentials your firm has set up for your account. Once authenticated, you land on your **Dashboard** — the launch page for your working day.

### First impressions

The Dashboard is deliberately uncluttered. Rather than presenting a wall of menus, it opens with the things you are statistically most likely to need the moment you sit down: the matters you've touched recently, the actions you take most often, the cases due in court today, and a place to search. Everything else — the full Matter Register, the Proceedings list, document management, search, and (for administrators) the admin console — is reachable from the navigation, but the Dashboard itself is built to answer the question "what do I need to look at right now?" without you having to go hunting.

If your firm has enabled it, you may also notice a **notification bell**. This is where hearing reminders and other alerts surface — more on this in the Reminders section. It's worth a glance every time you sign in, since it's the one place a coming hearing will actively announce itself to you rather than waiting for you to go looking.

You won't find a long onboarding tour or a checklist of setup steps standing between you and your work. Because a Matter can exist perfectly well with nothing attached to it yet — no Proceeding, no documents, no timeline entries — there's nothing stopping you from creating your first Matter within moments of signing in and building it out as the engagement itself develops. The platform is built to match the pace of a real engagement: sparse at the start, richer as the work accumulates.

### Finding your way around

Broadly, your working areas are:

- The **Dashboard** (`/dashboard`) — your launch page.
- The **Matter Register** (`/matters`) — every client engagement, open or closed.
- **Proceedings** (`/cases`) — the individual court or forum matters under your Matters.
- **Search** (`/search`) — a single place to look across matters, proceedings, participants, and indexed documents.
- **Document Creator** (`/dashboard/draft-builder`) — where you build real drafting documents.
- **AI Credits** (`/dashboard/credits`) — if your firm has enabled AI Credits, this is where you track usage.

There is also an **AI Chamber** (`/dashboard/ai-chamber`) reachable from the dashboard area. It is worth knowing upfront that this is a showcase built on sample data — clearly labelled on screen as illustrative — used to demonstrate what the platform's AI-assisted views can look like. It is not where your real case records live, and it is not the page you land on when you sign in.

NextCaseHQ today is a web application, used through your browser. There is no separate mobile app; the interface is responsive and usable on a tablet or phone browser, but it is not a dedicated app you install.

---

## 3. The Dashboard

Your Dashboard is built around four things, each answering a different question about your day.

### Recent Matters

At the top, you'll find the Matters you've opened or worked on most recently — a shortcut back into whatever you were doing yesterday or an hour ago, without having to search or scroll through the full Matter Register. This is simply the fastest path back to your current work.

### Quick Actions

Three Quick Actions sit prominently on the Dashboard, and each one goes straight to real, working functionality rather than a generic landing page:

- **Draft a Document** — takes you into the drafting flow so you can start a new document without first navigating to a Matter.
- **Upload / Link a Document** — lets you bring a file into NextCaseHQ and attach it to a Matter or Proceeding.
- **Next Hearing & Stage** — a shortcut into recording or reviewing where a Proceeding stands and when it is next listed.

These exist because a large share of what you do in a day falls into one of these three buckets, and the Dashboard saves you the extra clicks of finding the right Matter first.

### Today's Cases

This panel shows the Proceedings listed for hearing today, pulled from the hearing dates recorded against your cases. If you've stepped away from your diary and want a fast answer to "what am I in court for today," this is the place to look. It reflects whatever hearing date is currently recorded on each Proceeding — which is itself only ever updated when you (or a colleague) save a Court Note, a point covered in detail in Section 6.

### Legal Search

The Dashboard also surfaces a Legal Search workspace — your entry point into searching. Because Universal Search covers your matters, proceedings, participants, and indexed documents through a single hybrid search (vector plus full-text), this is often the fastest way to jump straight to a specific case, party name, or a passage inside a document you or your firm has uploaded, without navigating through the Matter Register first.

Together, these four panels mean that on most days you should be able to open NextCaseHQ, glance at the Dashboard, and know exactly what to do next — without a single unnecessary click.

---

## 4. The Matter Register

The **Matter Register**, at `/matters`, is the full list of every client engagement your firm has on NextCaseHQ — active, on hold, closed, or archived. This is the system of record for "who is our client, what are we doing for them, and where does that work stand."

### Creating a Matter

When you open a new Matter, you're recording the shape of a client engagement, not a court case — those are two different things in NextCaseHQ, and the distinction is deliberate (see Section 5). A Matter carries:

- A **title** and a **matter number** — your own reference for the engagement.
- An **engagement type** — see below.
- A **practice area**.
- A **status** — see below.
- The **client**.
- The **opposing party name** and **opposing counsel**, where relevant.
- **Court, bench, and judge**, where the engagement centres on a specific forum.
- A free-text **description**.
- **Opened at** and, once relevant, **closed at** dates.

Not every field will apply to every engagement — an advisory Matter, for instance, may have no opposing party or court at all, and that is entirely expected.

### Engagement types — litigation and beyond

One of the more important design decisions in NextCaseHQ is that a Matter does not require a court case to exist. The **engagement type** field lets you record exactly what kind of work this is:

- **Litigation** — an active or contemplated court proceeding.
- **Pre-Litigation** — work done before a suit or petition is filed: notices, demand letters, pre-suit negotiation.
- **Advisory** — an opinion or ongoing advice engagement with no proceeding attached.
- **Contractual** — drafting, reviewing, or negotiating agreements.
- **Transactional** — deal-related work.
- **Arbitration** — a reference before an arbitral tribunal.
- **Mediation** — a mediated dispute.
- **Compliance** — regulatory or statutory compliance work.
- **Investigation** — internal or external investigative engagements.
- **Other** — anything that doesn't fit the categories above.

This matters in practice because a substantial amount of an advocate's work — an advisory opinion, a compliance review, a contract negotiation — never produces a court filing at all. NextCaseHQ treats a Matter with zero Proceedings as a completely valid, first-class state, not a broken or incomplete record. If you're retained to advise a client on a regulatory question and there is never a case number involved, you still open a Matter, set the engagement type appropriately, and use the Matter Timeline (Section 7) to log the work as it happens.

It's also worth noting that an engagement's type is not necessarily fixed for its whole life. A matter that opens as Pre-Litigation — a demand notice, some correspondence, an attempt to settle before filing — may well end up in Litigation once a suit is actually filed. You are free to update the engagement type as the true nature of the work becomes clear, rather than being locked into whatever you guessed at the outset.

A Matter is also, by design, one client's engagement — the client field ties every Matter back to who you are actually acting for. Where a single dispute involves several proceedings across different forums, the discipline of keeping them all under one Matter, against one client record, is what makes the Matter workspace's Health snapshot and Timeline actually mean something: a single, trustworthy picture of everything happening for that client, rather than fragments you have to reassemble yourself.

### Matter status

A Matter's status is one of:

- **Active** — current, ongoing work.
- **On Hold** — paused, for whatever reason, without being finished.
- **Closed** — the engagement has concluded.
- **Archived** — closed and put away for long-term reference.

### Editing a Matter

The details you set on creation are not fixed. You can go back into a Matter and update its title, status, court and bench details, opposing party information, description, and the other fields as the engagement evolves — a case may move from one bench to another, an opposing counsel may change, or you may simply need to correct a typo in the matter number.

### Closing and reopening a Matter

When an engagement concludes, you set its status to **Closed**, which records a closed-at date alongside it. This is how you keep your working Matter Register — the one you and your colleagues look at day to day — free of engagements that are finished, while preserving the full history underneath.

Because status is simply an editable field on the Matter, if a closed engagement comes back to life — a client returns with a related dispute, or a matter you thought was settled resumes — you can move its status back to Active in the same way you changed it to Closed. Nothing about the Matter's history, its Proceedings, its Timeline, or its documents is lost by changing status; the status field only governs where the Matter sits in your day-to-day view.

### The Matter workspace

Opening a specific Matter (`/matters/[id]`) takes you into its full workspace, organised as:

- **Overview** — the core Matter details.
- **Health** — a live, derived snapshot: current stage, the date and forum of the last hearing and what the note said, the next hearing date, how many pending actions remain, and a needs-attention flag if something is overdue or at risk. You don't maintain this yourself; it is assembled automatically from your Proceedings, Court Notes, and Tasks.
- **Proceedings** — every Proceeding linked to this Matter.
- **Timeline** — the unified chronological record covered in Section 7.
- **Documents** — everything filed under this Matter.
- **Team** — who on your side is working this Matter.
- **Command Center search** — a search scoped to this Matter, for when you know what you're looking for is somewhere in this specific engagement.
- **Action Cards** — surfaced items needing attention within this Matter.

This workspace is where you will spend most of your time once a Matter is underway — it is the single screen that answers "where does this engagement stand, right now."

---

## 5. Proceedings

A **Proceeding** is a formal instance of a matter before one specific court or forum — a suit, a petition, an appeal, an execution application, a criminal case, an arbitration reference. In NextCaseHQ's model, a Matter is the client engagement; a Proceeding is one particular case within it. This separation is what lets a single Matter — a large commercial dispute, say — carry a trial court suit, a connected writ petition, and an arbitration reference all at once, each tracked as its own Proceeding, while remaining visibly part of the same overall client engagement.

### Linking a Proceeding to a Matter

Proceedings live at `/cases`, with the full detail view at `/cases/[id]` and creation at `/cases/new`. When you create a Proceeding, you link it to the Matter it belongs to. A Proceeding carries its own title, case number, country code, court, judge, stage, status, hearing date, and notes.

### Multiple, parallel proceedings under one Matter

Because the link runs from the Proceeding to its Matter, nothing stops you from attaching several Proceedings to the same Matter. This is the correct way to model a client engagement that spans more than one forum: an original suit and a connected appeal, a criminal complaint alongside a civil recovery suit arising from the same facts, or parallel proceedings in different courts. Each Proceeding is tracked, listed, and reminded on independently, while the Matter workspace's Proceedings tab and Timeline give you the combined picture.

One limitation worth knowing plainly: there is currently no formal parent/child link between Proceedings themselves. If you have a suit and its appeal both recorded as Proceedings, NextCaseHQ does not yet model "this appeal arises from that suit" as a structured relationship — both simply sit under the same Matter. This is a known gap, flagged as a possible future enhancement rather than something built today, and it's worth keeping in mind if you're relying on the platform to trace an appeal back to its originating suit automatically.

### Proceeding status and stage

Each Proceeding carries a **status** — Pending, Hearing, Disposed, or Appeal — reflecting where the case sits in broad terms, and a **stage**, a more granular description of procedural posture (for instance, where arguments or evidence currently stand). The stage field is free-form enough to match however your practice describes procedural posture, while status gives you and anyone else looking at the Matter a quick read on whether a case is live, moving, decided, or under appeal.

The Proceeding's **hearing date** deserves a special note: it always reflects the *next* scheduled hearing, not the last one that took place. That value is not something you edit directly on the Proceeding — it is set automatically, as part of recording a Court Note, which is the subject of the next section.

---

## 6. Court Notes / Case Diary

The **Court Note** — what many advocates will recognise as a case diary entry — is the single record of what happened at one hearing. It is deliberately built to be fast, because the reality of court practice is that you often have minutes, not hours, to record what just happened before the next matter is called or you're heading to your next courtroom.

### Recording a hearing in under thirty seconds

You record a Court Note from the Proceeding itself, at `/cases/[id]/court-note`. The form asks for exactly what you need and nothing more:

- **Hearing date** — the date of the hearing that just happened.
- **Next hearing date** — when the matter is listed next.
- **Court/forum type** — chosen from a fixed list: Supreme Court, High Court, Civil Court, Criminal Court, Family Court, Commercial Court, Consumer Commission, Labour Court, MACT, Arbitration, Revenue Court, or Other.
- **Stage** — the procedural stage at this hearing.
- **Note** — what actually happened.
- **Next actions** — what needs to be done before the next date, if anything.

That's the entire form. There's no multi-step wizard, no unrelated fields to skip past — you can be in and out in well under a minute, which is the point.

### Dictation

The note field supports voice dictation through your browser, feature-detected so it appears when your browser supports it. This means you can speak the substance of what happened at the hearing rather than typing it out — useful when you're stepping out of a crowded courtroom corridor with your phone in hand and want to get the note down before it's out of your head. The record of how a note was entered — Manual, Voice, or Hybrid — is stored with it, so your firm can see whether a note was typed, dictated, or a mix of both.

### What happens the instant you save

Saving a Court Note is not just "adding a note somewhere." A single save does three things at once, atomically:

1. It **updates the Proceeding's hearing date** to the next hearing date you just entered — meaning the Proceeding itself always reflects, at a glance, when the matter is next listed.
2. It **appends an entry to the Matter Timeline**, so the hearing becomes part of the unified chronological record of the whole engagement, not just something buried in the case file.
3. If you entered anything in **next actions**, it **creates exactly one Task** — a pending item for you or your team to complete before the next hearing.

You don't have to remember to do any of this separately. Recording the hearing is the single action; the platform takes care of propagating it everywhere it needs to be reflected.

One important boundary to know: recording a Court Note requires an existing Proceeding. A Matter that has no Proceeding attached to it cannot have a Court Note recorded against it — there is, after all, no hearing to record, because there is no case before a court or forum yet. If you're doing advisory or non-litigation work under a Matter with no Proceeding, the place to log that activity is the Matter Timeline's manual entry, covered next.

### Why Court Notes are append-only

Court Notes cannot be edited once saved. This is a deliberate design decision, not a missing feature. A case diary is meant to be a reliable record of what actually happened and when — if entries could be silently rewritten after the fact, the diary would lose the one property that makes it worth trusting: that it reflects, permanently, what was recorded at the time.

If you made a mistake, or a fact changes, or you simply need to add something you left out — the correction is a new Court Note, not an edit to the old one. This keeps every version of events in the record, in order, rather than letting a later "fix" quietly erase what was actually written down on the day. In practice this is exactly how a paper case diary works: you don't tear out yesterday's page, you add today's entry.

---

## 7. Matter Timeline

The **Matter Timeline** is the unified chronology of everything that has happened on a Matter, in one continuous, ordered feed. It draws from two sources:

- **Hearing entries** (source type: Hearing) — created automatically the moment you save a Court Note against any Proceeding under this Matter. You never add these by hand; they appear because the underlying hearing was recorded.
- **Manual entries** (source type: Manual) — added directly on the Timeline itself, through its own "Add Entry" action.

### The right place for advisory and non-hearing work

This is where the Timeline earns its keep for the substantial share of your practice that isn't litigation. If a Matter has no Proceeding at all — an advisory engagement, a compliance review, contract negotiation — there is no Court Note to generate Timeline entries automatically, because there is no hearing happening. The Timeline's manual entry is exactly the tool for this: whenever you make a call to the client, send an opinion, attend a meeting, or complete a piece of work on an advisory Matter, you log it directly on the Timeline as a manual entry.

The result is that whether a Matter is a full-blown litigation with multiple Proceedings and dozens of hearings, or a quiet advisory engagement that never sees a courtroom, the Timeline gives you the same thing: one continuous, chronological account of the engagement, readable top to bottom, without needing to piece it together from separate hearing records and your memory of phone calls.

---

## 8. Reminders

NextCaseHQ runs a daily scheduled job called **Seven-Day Preparation**. Each day, it checks every Proceeding's next hearing date and, when that date falls within the coming seven days, notifies the Matter's participants.

### Where the reminder appears

Today, this notification is delivered through the **in-app Notification bell** — you'll see it when you sign in and check the bell icon in the application. It is worth being direct about a current limitation: reminders are not yet delivered by email or SMS. The underlying capability to send messages that way exists in the platform's infrastructure, but no part of the application currently calls it to send you a reminder outside NextCaseHQ itself. In practice, this means the safeguard only works if you (or someone on your team) is actually opening the application regularly to see the bell — it is not, today, a system that will reach you if you go a week without logging in.

### Why this matters for how you use the platform

Given that the Seven-Day Preparation reminder is in-app only, the sensible habit is to make checking the notification bell part of your daily routine — much as you'd glance at a physical diary each morning — rather than relying on it to interrupt you the way a text message would. The reminder only ever fires off the Proceeding's recorded next hearing date, which brings us back to a point already made in Section 6: that hearing date is only as current as your last Court Note. If a hearing has passed and you haven't yet logged a Court Note for it, the "next hearing" the reminder is watching may already be stale.

---

## 9. Document Drafting

NextCaseHQ gives you two distinct ways to produce a document, and they are genuinely different tools built for different moments — not two versions of the same thing. Knowing which one you're in, and why, will save you frustration.

### The Document Creator — the real drafting surface

The primary, production drafting tool lives at `/dashboard/draft-builder`. This is where you build a document you actually intend to use — a plaint, a reply, an opinion, a notice — start to finish, with the structure and formatting a real filed or delivered document needs. It gives you:

- A **guided interview engine** that walks you through the information the document needs, rather than presenting a blank page and leaving you to remember everything yourself.
- A **rich-text editor** (built on Tiptap) for the actual drafting and editing — formatting, headings, the full toolkit of a proper word processor, not a plain text box.
- **Autosave**, so your work is continuously preserved as you write, without you needing to remember to save.
- **Focus mode**, for when you want the editing surface itself and nothing else on screen.
- **Print-accurate page layout**, so what you see while drafting is a genuine preview of what the document will look like printed or exported — margins, pagination, and all.

This is the tool for anything you expect to revise, format properly, and ultimately file or send. If a document matters enough to need version history and a polished final form, this is where it belongs.

The guided interview is worth dwelling on for a moment, because it changes how drafting actually feels. Rather than opening on a blank page and expecting you to recall every fact, party name, date, and detail the document requires, the interview steps you through gathering that information first, in a structured way, before you ever get to the business of wording the document itself. This is particularly useful for documents you don't draft often enough to have the structure memorised, or for a junior colleague drafting something senior counsel will review — the interview keeps the necessary facts from being forgotten, without dictating your language.

Once the underlying facts are captured, you move into the rich-text editor to do the actual drafting and refining. Because autosave is continuously running underneath you, there's no moment where a browser crash, a closed tab, or a dropped connection costs you real work — you can draft in short bursts between calls and hearings without worrying about losing your place. And because the page layout is print-accurate as you work, you're never guessing what a document will look like once it leaves the editor; what's on your screen is a genuine preview of the printed or exported page.

### The quick AI-draft flow

A second, separate document flow lives at `/documents/new`, with completed documents viewable at `/documents/[id]`. This is a much simpler tool: you type in the relevant facts, and an AI-generated first draft comes back, saved as plain text.

It is worth being honest about what this second flow is and isn't. It does not give you the rich-text editor, the guided interview, the autosave-as-you-refine experience, or the print-accurate layout of the Document Creator. What it gives you is speed — a fast first cut of a document from a short set of facts, saved as plain text you can then copy elsewhere, adapt, or use as a starting point. Think of it as a quick rough draft generator, not a finishing tool.

### Choosing between them

If you need a real, polished document you'll actually file, send to a client, or keep as a firm record with proper formatting — go to the Document Creator at `/dashboard/draft-builder`. If you just need a fast first draft of something from a handful of facts, and you're comfortable taking that plain text elsewhere to finish it, `/documents/new` is the quicker path. They are not competing features; they serve different points in your process, and it's entirely normal to use the quick flow to get an idea down and then build the real document properly in the Document Creator.

---

## 10. AI Assistant

NextCaseHQ's AI-backed features are built around one governing principle, worth restating plainly: **the platform never invents legal authority.** It does not manufacture a citation, a section, or a case name and hand it to you as though it were real. Every piece of AI-generated content you see is grounded in one of two things — facts you supplied, or content retrieved from documents you or your firm have actually indexed.

### What the drafting AI does

Behind the Document Creator and the quick-draft flow sits a drafting backend (`POST /api/ai/draft`), which supports two operations: creating a first draft (DRAFT_CREATE) and improving an existing one (DRAFT_IMPROVE). It is provider-agnostic — built to work with OpenAI first and Anthropic as a second option — but regardless of which provider is behind it, the same rule applies: it is grounded only in the facts you supply, and it is explicitly instructed never to invent facts or citations. If you didn't tell it a fact, it should not appear as though it came from somewhere authoritative — because it didn't.

This is the **generated** category from the trust rules in Section 1: wording the AI has produced, built from what you gave it, not new legal substance it discovered on its own.

### What the AI Assistant's chat does

The other AI-backed feature is a retrieval-augmented chat (`POST /api/ai/ask`) — you can ask it questions and it answers grounded in documents that have been indexed for search. Critically, when nothing relevant has been indexed, it is built to return a defined "no context found" result rather than guess at an answer. This is a deliberate refusal to fill a gap with a plausible-sounding but ungrounded response — an answer that comes back empty is far more useful, and far more trustworthy, than one that sounds confident but is fabricated.

This is the **retrieved** category: real content, found in something real (your own indexed documents), never invented.

### Judgment Research — what it is today

You may notice a Judgment Research area (`/dashboard/judgment-research`, backed by `GET /api/judgments/search`). It is important to be direct about what this currently is: an architecture milestone, not a live legal-research product. It exists with a placeholder provider and zero external legal-research or citation vendor connected. If you are looking for a real case-law database with genuine citation retrieval, that is not what this feature is today — it is scaffolding for a future capability, not a working substitute for your existing legal research tools.

### The three categories, in practice

As you use NextCaseHQ's AI features day to day, it helps to keep asking yourself which of the three categories you're looking at:

- Is this **generated** — the AI's own wording, built from facts I gave it?
- Is this **verified** — something I or a colleague actually entered as Matter data, a Court Note, or a Proceeding detail?
- Is this **retrieved** — a result pulled from an actual document I indexed?

NextCaseHQ is built so that you should always be able to tell which one you're looking at. If you ever find yourself unsure, treat the content as generated language to be checked, never as a settled legal fact.

---

## 11. Search

**Universal Search**, at `/search` (backed by `GET /api/search`), is your single point of entry for finding anything across the platform. It runs as a **hybrid search** — combining vector similarity search with traditional full-text search — over your indexed documents, and it extends beyond documents to cover entity search across matters, cases, participants, and document types.

In practice, this means you can search for something you remember roughly, not just something you remember exactly. A phrase you recall being in a document, a party's name, a matter number, a document type — Universal Search is built to surface the relevant entity or passage even when your query isn't a precise keyword match, because it isn't relying on exact text matching alone.

This is the tool to reach for when you know something exists in NextCaseHQ but aren't sure which Matter, Proceeding, or document it lives in.

---

## 12. Document Management

Documents in NextCaseHQ are backed by real, versioned file storage — an S3-compatible object store underneath the platform's document model (referred to internally as DocumentEnvelope and DocumentVersion). Practically, this means:

- Every document you upload or generate is **versioned** — a new version is recorded rather than silently overwriting the last one, so a document's history is preserved.
- Documents are **linkable to a Matter and/or a Proceeding**, so a filing can sit correctly against both the specific case it belongs to and the broader client engagement.
- Documents are **indexed for hybrid search** — combining vector and full-text indexing — which is what makes them findable through Universal Search (Section 11) and usable as retrieval context for the AI Assistant's chat (Section 10).

This is genuine file storage, not a placeholder — when you upload a contract, a filed pleading, or a client's correspondence, it is being stored as a real, versioned file, tied to the Matter or Proceeding you attach it to, and made searchable for later.

---

## 13. Daily Workflow

To make all of the above concrete, here is what a realistic working day with NextCaseHQ tends to look like for a busy advocate.

**Morning, before leaving for court.** You open NextCaseHQ and land on your Dashboard. You check the notification bell for anything the Seven-Day Preparation reminder has flagged, glance at Today's Cases to confirm what's listed, and skim Recent Matters in case anything from yesterday needs a follow-up before you head out.

**Mid-morning, in the corridor outside the courtroom.** Your matter is called, the hearing happens, and the next date is fixed. Before you move to the next matter, you open the Proceeding on your phone and go straight to its Court Note entry. You dictate a quick note — what happened, the stage reached, the next hearing date — and, if there's something to be done before that date, a line in next actions. You save. In that one action, the Proceeding's next hearing date updates, the Matter Timeline gets a new entry, and if you flagged a next action, a Task is waiting for you to track it.

**Back at your desk, early afternoon.** You want to send a first draft of a reply to a colleague for review. Rather than starting from a blank page, you go to the quick AI-draft flow at `/documents/new`, type in the facts of what needs to be said, and get a rough first cut back as plain text — something to react to, not something to file.

**Later, working on a matter that actually needs to go out the door.** For the plaint or the formal reply that will actually be filed, you go to the Document Creator at `/dashboard/draft-builder`, work through the guided interview, and build the document properly in the rich-text editor — trusting autosave to keep your work safe as you go, switching to focus mode when you need to concentrate on the language itself.

**Advisory work, the same afternoon.** You take a call from a client on a purely advisory Matter — no Proceeding, no hearing, just a question you need to answer and a conversation you need on record. You open the Matter, go to its Timeline, and add a manual entry describing the call and your advice. It sits in the same chronological record as any hearing entry would, on a Matter that will likely never have a Proceeding at all.

**End of day.** You check Universal Search for a document you recall a colleague mentioning last month, confirm it's indexed and findable, and close out your Tasks for the day — marking the ones you've completed, dismissing any that are no longer relevant.

None of this requires you to remember which system holds which piece of information. It's all under the Matter.

**A quieter day.** Not every day is a court day. On a day with no hearings, the rhythm shifts toward the Matter Register and the Document Creator: reviewing which Matters need a status update, following up on Tasks that are still Pending, drafting the documents that a busier week didn't leave time for, and using Universal Search to pull together everything relevant to a client meeting later that week. The platform doesn't demand a hearing to be useful — the Matter Register, Timeline, and Document Creator are exactly as valuable on a quiet Tuesday as on a day with three courtrooms to get to.

---

## 14. Hearing Workflow

Because hearings are the heartbeat of litigation practice, it's worth walking through the full lifecycle of one hearing, end to end, as NextCaseHQ is built to support it.

### Before the hearing

Open the Proceeding and review its current stage, status, and the last Court Note recorded against it — this is your quickest refresher on exactly where things stood the last time this matter was before the court. If the Matter's health snapshot flags anything needing attention (an overdue pending action, for instance), address it before you go in. If you're relying on the Seven-Day Preparation reminder, this is the moment it should have already put the hearing on your radar.

### During the hearing

NextCaseHQ has no role to play while you're actually in front of the court — this is where your own judgment, advocacy, and note-taking (mental or on paper) do the work. What matters for the platform is what you do immediately after.

### After the hearing

As soon as you can — ideally within minutes, while it's fresh — open the Proceeding's Court Note entry. Record the hearing date that just passed, the next hearing date fixed by the court, the forum type, the stage reached, a note on what actually happened, and anything that needs doing before the next date. If your hands are full or you're stepping out of a crowded space, dictate it.

Saving this one form does the rest of the work for you: the Proceeding's hearing date now correctly shows the *next* date, not the one just gone; the Matter Timeline has a new entry reflecting what happened; and if you gave a next action, a Task now exists to track it. There is nothing further to update by hand — the Court Note is the single point of entry, and everything downstream follows from it.

If you later realise you got something wrong, or need to add a detail you missed, you record a new Court Note rather than editing the old one — the diary stays a true, ordered record of what was written and when.

---

## 15. Best Practices

**Log the Court Note the same day, ideally within minutes.** Everything downstream — the Proceeding's next hearing date, the Timeline, any Task — depends on it. A delayed note means a stale hearing date sitting in front of you and your team until you catch up.

**Use the Matter Timeline's manual entries for advisory and non-hearing work.** If a Matter has no Proceeding, the Timeline's "Add Entry" is your record-keeping tool — don't let a Matter's history go untracked simply because there's no hearing to log.

**Never edit around a mistake — record a new Court Note instead.** The append-only design of Court Notes is a feature protecting the integrity of your case diary; work with it rather than looking for a workaround.

**Choose the right document tool for the job.** Reach for `/documents/new` when you want a fast rough draft to react to; use the Document Creator at `/dashboard/draft-builder` for anything that will actually be filed, sent, or kept as a polished firm record.

**Treat AI-generated wording as a draft to verify, not a finished answer.** The drafting AI works only from facts you give it and is instructed never to invent facts or citations — but "instructed never to" is not the same as "impossible to get wrong," and your own review remains essential, especially for anything with legal consequence.

**Don't rely on Judgment Research for real case-law validation today.** It is an architecture milestone with no connected external provider — treat any output there as a placeholder, not as legal research.

**Set engagement type accurately when opening a Matter.** It's a small step that pays off later, when you or a colleague are trying to understand, at a glance across the Matter Register, what kind of work a given engagement actually is.

**Keep an eye on the notification bell rather than expecting it to chase you.** Reminders are in-app only today — there is no email or SMS fallback yet — so the habit of checking it needs to be yours.

**Close Matters when they conclude, but don't worry about "losing" a closed Matter.** Status is just a field; a closed Matter can be reopened by changing its status back, with its full history intact underneath.

---

## 16. Frequently Asked Questions

**Can I open a Matter with no court case attached?**
Yes. Advisory, compliance, contractual, and similar engagement types are meant to exist without a Proceeding — this is a fully supported, first-class state, not an edge case.

**Can I edit a Court Note after I've saved it?**
No. Court Notes are append-only by design. If something needs correcting or adding, record a new Court Note rather than editing the old one.

**Can more than one Proceeding belong to the same Matter?**
Yes. A Matter can carry several parallel Proceedings — for example, a suit and a related petition arising from the same client engagement.

**Can I link an appeal to the original suit it arises from?**
Not yet. There is currently no parent/child relationship modelled between Proceedings — both would simply be recorded under the same Matter, without a formal structured link between them.

**Will I get an SMS or email when a hearing is coming up?**
Not today. The Seven-Day Preparation reminder is delivered only through the in-app notification bell.

**What's the real difference between the two document-creation flows?**
The Document Creator at `/dashboard/draft-builder` is the full production tool — guided interview, rich-text editing, autosave, focus mode, print-accurate layout — for documents you intend to finish and use. `/documents/new` is a quicker, simpler flow: type facts in, get an AI-generated first draft back as plain text.

**Does the AI Assistant cite real case law?**
No live case-law or citation database is connected today. Judgment Research exists as architecture with a placeholder provider, not a working legal-research vendor. Nothing in NextCaseHQ invents legal authority — every AI output is either your own facts reworded, or content retrieved from your own indexed documents.

**What happens if the AI chat has nothing relevant to answer from?**
It returns a defined "no context found" response rather than guessing. This is intentional.

**Is there a mobile app?**
No. NextCaseHQ is a web-responsive application usable through a browser on a phone or tablet, but there is no dedicated mobile app.

**Can two colleagues edit the same document at the same time?**
No. There is no collaborative, simultaneous multi-user editing in the Document Creator today.

**How are Tasks created?**
Every Task comes from the next actions field of a Court Note. There is currently no way to create a free-standing task independent of a Court Note.

**What are the possible statuses for a Task?**
Pending, Completed, or Dismissed.

**What is the AI Chamber?**
A showcase built on sample data, clearly labelled on screen as illustrative rather than real case records. It is not where your actual matters and cases live, and it isn't the page you land on when you sign in.

**Are AI Credits a real billing system?**
Not yet. AI Credits — plans, per-action costs, wallet balance, and the usage ledger — exist today as a local, mock persistence layer used within the Matter Register's chargeable-action flows. A real billing backend is a future milestone; nothing in the app currently charges a real payment card.

**Can I reopen a Matter after closing it?**
Yes — status is simply an editable field. Setting it back to Active brings the Matter back into your active working view, with its full history intact.

**Where do I search for something I can't remember which Matter it's in?**
Universal Search at `/search` — it runs a hybrid vector and full-text search across your indexed documents, plus entity search across matters, cases, participants, and document types.

**Does a Proceeding's hearing date show the last hearing or the next one?**
The next one, always. It's updated automatically the moment you save a Court Note — never something you set by hand directly on the Proceeding.

**How do I log advisory work that never involves a hearing?**
Through the Matter Timeline's manual entry, added directly against the Matter, independent of any Proceeding.

**Is eCourts case-status information pulled in automatically?**
No. `/ecourts-verification` is a manual, advocate-confirmed lookup guide — there is no automated scraping of eCourts behind it.

**Can I change a Matter's engagement type after I've created it?**
Yes. Engagement type is an editable field, the same as status or court details — useful when work that started as Pre-Litigation correspondence turns into an actual filed suit.

**What's the difference between a Matter's status and a Proceeding's status?**
A Matter's status (Active, On Hold, Closed, Archived) describes the overall client engagement. A Proceeding's status (Pending, Hearing, Disposed, Appeal) describes where one specific case before one specific forum stands. A Matter can be Active while one of its Proceedings is Disposed and another is still at the Hearing stage.

**Do I need to create a Proceeding before I can create a Matter?**
No — it's the other way round. You always create the Matter first; a Proceeding is created afterward and linked to it. A Matter is allowed to have no Proceeding at all, but a Proceeding always belongs to a Matter.

**Can I attach a document to both a Matter and a Proceeding at once?**
Yes. Documents can be linked to a Matter and/or a Proceeding, which is useful for a filing that belongs to a specific case but that you also want visible from the Matter's overall document list.

---

## 17. Troubleshooting

**"My Proceeding still shows an old hearing date, even though the hearing already happened."**
This almost always means a Court Note hasn't been recorded yet for that hearing. The hearing date on a Proceeding only ever updates when a Court Note is saved — nothing else changes it. If a hearing has come and gone but you haven't logged the Court Note, the Proceeding will keep showing the previous next-hearing date until you do. The fix is simply to go to the Proceeding and record the Court Note for what happened.

**"I can't find a way to record a Court Note for this Matter."**
Check whether the Matter actually has a Proceeding attached. Court Notes are recorded against a Proceeding, at `/cases/[id]/court-note` — a Matter with no Proceeding at all has nowhere for a Court Note to be recorded, because there is no case before a court or forum to log a hearing for. If this is advisory or non-litigation work, log the activity as a manual entry on the Matter Timeline instead.

**"I saved a Court Note but no Task appeared."**
A Task is only created when you enter something in the next actions field. If you left it blank, no Task is generated — this is expected, not a fault. If there is something to track before the next date, go back and add a new Court Note with next actions filled in.

**"I didn't get an email or text about an upcoming hearing."**
Reminders are currently delivered only through the in-app notification bell. There is no email or SMS delivery today, so nothing will reach you outside the application itself.

**"I need to link an appeal to the suit it came from, and I can't find how."**
There isn't a way to do this yet — Proceedings don't currently support a parent/child relationship. Both the suit and the appeal should be recorded as separate Proceedings under the same Matter; just be aware the formal link between them isn't modelled today.

**"Judgment Research isn't returning real case law."**
That's expected for now — it's an architecture milestone with a placeholder provider and no external legal-research vendor connected yet. It is not a working substitute for your existing citation research process today.

**"I don't recognise the cases shown in AI Chamber."**
That's because AI Chamber is a sample-data showcase, explicitly labelled illustrative on screen — it isn't showing your real matters or cases.

**"My AI Credits balance doesn't look right, or I was expecting a real charge."**
AI Credits today are a local, mock persistence layer — plans, wallet balance, and the ledger are not yet connected to a real billing system, and no real payment is currently being collected through the app.

**"A colleague and I tried to edit the same document at the same time and something went wrong."**
The Document Creator does not currently support simultaneous multi-user editing. Coordinate who is actively editing a given document to avoid conflicting changes.
