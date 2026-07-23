# NextCaseHQ Workflow Library

This library shows how real litigation and advisory work gets set up and
progressed inside NextCaseHQ, screen by screen. Every field name, route,
status value, and behaviour described below is drawn directly from
`docs/knowledge-base/FACTS_SHEET.md` — the platform's Matter Register,
Proceedings, Court Notes, Matter Timeline, Tasks, Reminders, Matter Health,
and Documents. Nothing here is a hypothetical feature; where the platform
does not yet do something (e.g., link an appeal Proceeding back to the
original suit), that gap is called out honestly rather than papered over.

All matter names, parties, advocates, judges, and case numbers below are
invented placeholders for illustration only. No real case citations, real
judgments, or real precedents appear anywhere in this document, and none
should be added when this library is extended.

---

## 1. Civil Litigation

**Scenario:** *Rina Kapoor vs. Kapoor Textiles Pvt. Ltd. — Commercial Suit
for Recovery of Money.* Rina Kapoor supplied dyed fabric to Kapoor Textiles
Pvt. Ltd. under a running account; the company stopped paying after a
dispute over a rejected consignment. Rina's advocate is filing a civil suit
for recovery of ₹38,00,000 with interest before the District Civil Court.

**Matter setup (`/matters`):** The advocate creates a new Matter with:
- **Title:** "Rina Kapoor vs. Kapoor Textiles Pvt. Ltd. — Recovery Suit"
- **Matter number:** an internal reference the firm assigns (e.g.
  `RK-2026-014`)
- **Engagement type:** `LITIGATION`
- **Practice area:** Civil / Commercial Recovery
- **Status:** `ACTIVE`
- **Client:** Rina Kapoor (linked via `client_id`)
- **Opposing party name:** Kapoor Textiles Pvt. Ltd.
- **Opposing counsel:** the company's advocate on record
- **Court / bench / judge:** filled in once the suit is numbered and
  assigned
- **Description:** a short factual note — outstanding invoices, the
  rejected-consignment dispute, and the recovery amount claimed
- **Opened at:** the date the client is onboarded and drafting begins

**Proceeding (`/cases/new`):** Once the suit is filed and numbered, the
advocate creates a Proceeding linked to this Matter (`matter_id` set):
- **Title:** "Civil Suit for Recovery of Money"
- **Case number:** the number allotted by the court registry
- **Country code:** IN
- **Court:** District Civil Court (name of the specific court/district)
- **Judge:** assigned presiding officer
- **Stage:** "Filing" initially
- **Status:** `PENDING`
- **Hearing date:** the first date fixed by the registry for appearance

**Court Note sequence (`/cases/[id]/court-note`):** Each hearing is
recorded as its own immutable Court Note, with `court_forum_type` set to
**Civil Court** throughout. A representative run:

1. *First hearing* — stage "Summons/Appearance", note recording that
   summons were served and the defendant sought time to file a written
   statement, `next_hearing_date` fixed four weeks out, `next_actions`:
   "Follow up if written statement is not filed by next date" (this
   automatically creates one Task).
2. *Second hearing* — stage moves to "Written Statement filed", note
   records the defence taken (dispute over the rejected consignment),
   `next_actions`: "Prepare replication."
3. *Third hearing* — stage "Framing of Issues", note records the issues
   settled by the court, `next_actions`: "Prepare list of witnesses and
   documents for plaintiff's evidence."
4. *Fourth and fifth hearings* — stage "Evidence — Plaintiff", recording
   Rina Kapoor's examination-in-chief and cross-examination dates.
5. *Sixth hearing* — stage "Evidence — Defendant", recording the
   company's witness testimony.
6. *Seventh hearing* — stage "Arguments", note summarising submissions on
   both sides, `next_actions`: "File written submissions within two
   weeks."
7. *Final hearing* — stage "Judgment", note recording that the suit is
   decreed in Rina Kapoor's favour for the claimed amount with interest.
   Here the advocate also updates the Proceeding's **status to
   `DISPOSED`** (done from the Proceeding record itself; a Court Note
   captures the hearing outcome, but marking the case as fully disposed
   is a status change on the Proceeding).

Each Court Note save atomically updates the Proceeding's `hearing_date` to
the *next* hearing fixed by the court (never the date that just happened),
and appends a Matter Timeline entry for that hearing automatically.

**Timeline after disposal (`/matters/[id]` → timeline tab):** Reading top
to bottom, the Matter Timeline shows an unbroken `source_type=HEARING`
chronology — appearance, written statement, framing of issues, both
sides' evidence, arguments, and judgment — each entry carrying the stage
and note text recorded at the time. If the advocate also logged anything
outside a hearing (e.g., a settlement-talk phone call that went nowhere),
that would appear interleaved as a `source_type=MANUAL` entry added via
the Timeline's own "Add Entry" control.

**Documents:** The plaint, written statement, issues order, evidence
affidavits, and the final judgment are uploaded as Documents linked to
both the Matter and this Proceeding, each new upload/version tracked by
the platform's versioned document storage.

**What to watch for:** Civil recovery suits are exactly the case the
Court Note → Timeline → Task loop is built for — long-running, many
hearings, with a Task always outstanding until the next date. Because
Tasks only ever originate from a Court Note's `next_actions`, the
advocate should get in the habit of always filling that field, even with
something as small as "confirm next date," since there is no free-standing
way to add a task later. Matter Health on the Matter workspace gives a
one-glance summary — current stage, last hearing date/forum/note, next
hearing date, and pending action count — useful for a recovery suit that
may run for several years across dozens of hearings.

---

## 2. Criminal Litigation

**Scenario:** *State vs. Arvind Malhotra — Sessions Case under
IPC/BNS provisions for cheating and criminal breach of trust.* Arvind
Malhotra has been arraigned as an accused following a complaint by a former
business partner. His advocate is defending him at trial and separately
moving for bail.

**Matter setup:** A Matter is created:
- **Title:** "State vs. Arvind Malhotra — Sessions Case"
- **Engagement type:** `LITIGATION`
- **Practice area:** Criminal Defence
- **Status:** `ACTIVE`
- **Client:** Arvind Malhotra
- **Opposing party name:** State (through the complainant's name is noted
  in the description)
- **Court / bench / judge:** the Sessions Court once the case is committed
- **Description:** FIR number, sections invoked, and a short factual
  summary of the defence position

**Proceeding — the trial case:** Created at `/cases/new` with `matter_id`
linked to the Matter above:
- **Title:** "Sessions Case — Cheating and Criminal Breach of Trust"
- **Case number:** the Sessions Case number after committal
- **Court:** Sessions Court
- **Stage:** "Charge Sheet Filed" initially
- **Status:** `PENDING`

**Proceeding — the bail application:** Because a bail application in
Indian practice is typically filed as its own numbered application (a
separate Bail Application / Crl.M.P. number) even though it concerns the
same accused and the same facts, the advocate creates a **second**
Proceeding, also linked to the same Matter (`matter_id` set to the same
Matter, since a Matter can have any number of Proceedings under it):
- **Title:** "Bail Application — Arvind Malhotra"
- **Case number:** the separate bail application number
- **Court:** the same Sessions Court (or High Court, if bail is sought
  there instead)
- **Stage:** "Bail Application Filed"
- **Status:** `PENDING`

When creating the bail Proceeding, add it as a Further Proceeding of the
Sessions Case with relationship "Connected Proceeding" — this records a
formal link back to the trial Proceeding it relates to, so the two stay
traceable as one matter even though each carries its own number and
Court Notes. Consistent naming ("Bail Application — Arvind Malhotra"
clearly reading alongside "Sessions Case — Arvind Malhotra") is still
good practice on top of that link, not a substitute for it.

**Court Note sequence:** All Court Notes for both Proceedings use
`court_forum_type` = **Criminal Court**.

- On the bail Proceeding: a single Court Note recording the bail hearing,
  stage "Bail Heard", note summarising the order (bail granted on
  furnishing a surety), `next_actions`: "File surety bonds within the time
  granted." Its status is then updated to `DISPOSED` once the bail order
  is complied with.
- On the trial Proceeding, over subsequent months: "Charges Framed" →
  "Prosecution Evidence" (several hearings recording each prosecution
  witness examined and cross-examined) → "Defence Evidence" → "Statement
  under Section 313" (or equivalent) → "Arguments" → "Judgment", with
  `next_actions` at each stage (e.g., "Prepare cross-examination notes for
  next prosecution witness").

**Timeline:** Because both Proceedings share the same `matter_id`, the
Matter Timeline interleaves hearing entries from *both* the bail
application and the main trial in one chronological feed — so the
advocate sees "Bail Heard" sitting in context right alongside the trial's
"Charges Framed" a few weeks later, even though they come from two
different Proceeding rows.

**What to watch for:** Criminal defence work benefits most from disciplined
Court Note discipline on the trial Proceeding — each prosecution witness
examined should get its own dated Court Note so the Timeline preserves an
exact record of who testified when, which matters if a cross-examination
needs to be revisited later. Because Reminders (the Seven-Day Preparation
job) fire per-Proceeding off `hearing_date`, keeping both the bail and
trial Proceedings' next-hearing dates current ensures the advocate is
notified via the in-app bell for either track independently.

---

## 3. Family Disputes

**Scenario:** *Meera Iyer vs. Sanjay Iyer — Maintenance and Custody
Petition.* Meera Iyer has filed a petition seeking maintenance for herself
and interim custody of the couple's minor child, pending divorce
proceedings.

**Matter setup:**
- **Title:** "Meera Iyer vs. Sanjay Iyer — Maintenance & Custody"
- **Engagement type:** `LITIGATION`
- **Practice area:** Family Law
- **Status:** `ACTIVE`
- **Client:** Meera Iyer
- **Opposing party name:** Sanjay Iyer
- **Description:** kept deliberately factual and restrained — marriage
  date, separation date, child's age, the maintenance amount sought — since
  the Matter description is visible to whoever has access to the Matter

**Proceeding:**
- **Title:** "Maintenance and Custody Petition"
- **Case number:** the Family Court's petition number
- **Court:** Family Court
- **Stage:** "Petition Filed"
- **Status:** `PENDING`

**Court Note sequence:** `court_forum_type` = **Family Court** throughout.

1. *First hearing* — stage "Notice", note recording that notice was
   issued to the respondent, `next_actions`: "Confirm service of notice."
2. *Second hearing* — stage "Reply Filed", note summarising Sanjay Iyer's
   response contesting the maintenance quantum.
3. *Third hearing* — stage "Interim Application — Custody", note recording
   arguments on interim custody and the court's direction for a home visit
   report, `next_actions`: "Follow up on the court-ordered welfare
   report."
4. *Fourth hearing* — stage "Interim Order", note recording that interim
   maintenance was fixed and interim custody granted to Meera Iyer with
   visitation rights to Sanjay Iyer, `next_actions`: "Communicate interim
   order terms to client."
5. Subsequent hearings continue toward final disposal — "Evidence",
   "Arguments", "Final Order" — following the same Civil/Family Court
   pattern as any other suit, just tagged with the Family Court forum
   type.

**Sensitive-matter handling — what NextCaseHQ actually offers:**
NextCaseHQ does not have a dedicated "confidential matter" flag or a
special sealed-record mode. What it does offer, and what an advocate
handling a family matter should actually rely on, is:
- **Team-scoped access** on the Matter workspace (`/matters/[id]` → team
  tab): only the team members explicitly added to this Matter can see it,
  so a firm can keep a sensitive family matter restricted to the handling
  advocate and one associate rather than the whole firm roster.
- **Disciplined, factual note-writing**: because Court Notes are
  immutable once saved and feed directly into the Matter Timeline (which
  anyone with Matter access will read), the advocate should keep hearing
  notes to what was actually recorded/ordered in court rather than
  personal commentary about the parties.
- **Document-level care**: custody evaluation reports, income affidavits,
  and other sensitive filings are uploaded as Documents linked to the
  Matter/Proceeding, benefiting from the same versioned, access-controlled
  storage as any other document — but access is still governed by who is
  on the Matter's team, not by a separate confidentiality layer.

**What to watch for:** Family matters often run interim applications
(maintenance pendente lite, interim custody) inside the same Proceeding
rather than as separate case numbers, unlike the bail-application pattern
in criminal work — so the advocate typically records these as stage
changes and notes on the single Family Court Proceeding rather than
creating new Proceedings for each interim application, unless the court
actually assigns a distinct application number.

---

## 4. Commercial Litigation

**Scenario:** *Vantage Fabrics Ltd. vs. Orion Retail Chain Pvt. Ltd. —
Commercial Suit for Breach of Supply Agreement.* Vantage Fabrics is suing
Orion Retail for breach of a long-term supply agreement, with damages
claimed at ₹4.2 crore. This is the kind of matter — high value, multiple
workstreams, heavy paper — that exercises the Matter's Documents tab hardest.

**Matter setup:**
- **Title:** "Vantage Fabrics Ltd. vs. Orion Retail Chain Pvt. Ltd."
- **Matter number:** e.g. `VF-2026-002`
- **Engagement type:** `LITIGATION`
- **Practice area:** Commercial Litigation
- **Status:** `ACTIVE`
- **Client:** Vantage Fabrics Ltd.
- **Opposing party name:** Orion Retail Chain Pvt. Ltd.
- **Opposing counsel:** the firm representing Orion
- **Court / bench:** the designated Commercial Court (commercial suits of
  this value are typically heard by a court specifically designated under
  the Commercial Courts framework)
- **Description:** supply agreement date, the specific breach alleged
  (short-supply and non-payment across several purchase orders), and the
  damages basis

**Proceeding:**
- **Title:** "Commercial Suit for Breach of Supply Agreement"
- **Case number:** the commercial suit number
- **Court:** Commercial Court
- **Stage:** "Filing"
- **Status:** `PENDING`

**Court Note sequence:** `court_forum_type` = **Commercial Court**
throughout. Commercial suits follow a more front-loaded case-management
rhythm than an ordinary civil suit:

1. *Case management hearing* — stage "Case Management", note recording
   the timetable the court has fixed for pleadings, disclosure, and
   admission/denial of documents, `next_actions`: "Complete document
   disclosure by the date fixed."
2. *Admission/denial of documents* — stage "Admission/Denial", note
   recording which of the (numerous) exhibits were admitted without formal
   proof.
3. *Framing of issues* — stage "Issues Framed."
4. *Evidence* — several hearings, stage "Evidence — Plaintiff" then
   "Evidence — Defendant," given the volume of witnesses typical in a
   supply-chain dispute (procurement staff, warehouse managers, and the
   parties' own commercial teams).
5. *Arguments* and *Judgment*, same pattern as Section 1.

**Documents at volume:** This is the matter type where the Documents tab
does the most work: purchase orders, delivery challans, correspondence
threads, the supply agreement and its amendments, inspection reports, and
expert valuation reports on damages are all uploaded as Documents linked
to the Matter and/or this Proceeding. Because Document storage is
versioned, re-uploads of an amended draft (e.g., a revised damages
computation) keep prior versions rather than overwriting them, and because
indexing is hybrid (vector + full-text), the advocate can later use
Universal Search (`/search`) to pull up "which purchase order references
the July shipment" across the whole indexed set rather than re-opening
each file by hand.

**What to watch for:** With this much paper, discipline in **linking**
each Document to the right Proceeding (not just the Matter generally)
pays off — it keeps the Documents tab usable when the Matter later
also carries an appeal or execution Proceeding (see Sections 13–14),
since Documents can be attached to a specific Proceeding as well as to
the Matter as a whole.

---

## 5. Arbitration

**Scenario:** *Kunal Devani vs. Solstice Infra Projects Ltd. — Arbitration
Reference under a construction contract's arbitration clause.* Following a
payment dispute on a construction project, Kunal Devani has invoked
arbitration under the contract's dispute-resolution clause.

**Matter setup:**
- **Title:** "Kunal Devani vs. Solstice Infra Projects Ltd. — Arbitration"
- **Engagement type:** `ARBITRATION`
- **Practice area:** Construction / Commercial Arbitration
- **Status:** `ACTIVE`
- **Client:** Kunal Devani
- **Opposing party name:** Solstice Infra Projects Ltd.
- **Court / bench:** left blank or noted as the seat of arbitration (the
  arbitral tribunal, not a state court, is the actual forum, but the
  Matter's court field can record the seat/venue for reference)
- **Description:** contract date, arbitration clause reference, the
  amount claimed, and the notice invoking arbitration

**Proceeding:**
- **Title:** "Arbitration Reference — Payment Dispute"
- **Case number:** the tribunal's or institution's reference number (or
  an internally assigned reference if ad hoc)
- **Court:** the name/seat of the Arbitral Tribunal
- **Judge:** the sole arbitrator or presiding arbitrator's name
- **Stage:** "Notice Invoking Arbitration"
- **Status:** `PENDING`

**Court Note sequence:** `court_forum_type` = **Arbitration** for every
sitting, since the fixed list of forum types includes Arbitration as its
own category distinct from any state court:

1. *First sitting* — stage "Appointment of Arbitrator", note recording
   the arbitrator's appointment and the procedural order on timelines,
   `next_actions`: "File Statement of Claim within the time fixed."
2. *Second sitting* — stage "Statement of Claim Filed."
3. *Third sitting* — stage "Statement of Defence Filed", note recording
   Solstice's defence and any counter-claim.
4. *Fourth sitting* — stage "Evidence", recording examination of the
   parties' witnesses/experts before the tribunal.
5. *Fifth sitting* — stage "Arguments."
6. *Final sitting* — stage "Award", note recording that the tribunal has
   reserved/pronounced the award; the Proceeding's status is updated to
   `DISPOSED` once the award is made.

**Timeline:** The Matter Timeline reads as a clean procedural history of
the reference — appointment, pleadings, evidence, arguments, award — even
though none of it happened before a state court, because Court Notes are
recorded against the Proceeding regardless of forum type, and the Timeline
is agnostic to which forum type produced the entry.

**What to watch for:** If the award is later challenged (e.g., under a
petition to set aside the award before the relevant court), that
challenge is itself a new Proceeding under the same Matter — same pattern
as an appeal (see Section 13): a separate Proceeding row, no structural
link back to the arbitration reference beyond shared `matter_id` and
disciplined naming/notes. The `engagement_type=ARBITRATION` on the Matter
itself does not change — it correctly continues to describe what kind of
engagement this always was, even once a court becomes involved at the
challenge stage.

---

## 6. Tribunal Matters

**Scenario:** *Devraj Transport Co. vs. Union of India — Compensation
Claim before the Motor Accidents Claims Tribunal.* A commercial vehicle
owned by Devraj Transport Co. was involved in an accident; the claim for
compensation is being pursued before the MACT.

**Matter setup:**
- **Title:** "Devraj Transport Co. — MACT Compensation Claim"
- **Engagement type:** `LITIGATION`
- **Practice area:** Motor Accident Claims
- **Status:** `ACTIVE`
- **Client:** Devraj Transport Co.
- **Description:** accident date, vehicle and policy details, and the
  compensation basis (loss of vehicle use, repair cost, injury
  compensation, as applicable)

**Proceeding:**
- **Title:** "MACT Claim Petition"
- **Case number:** the Tribunal's claim petition number
- **Court:** Motor Accidents Claims Tribunal
- **Stage:** "Claim Petition Filed"
- **Status:** `PENDING`

**Court Note sequence:** `court_forum_type` = **MACT**, one of the fixed
forum types in NextCaseHQ's Court Note list, distinct from ordinary Civil
Court entries:

1. *First hearing* — stage "Notice to Insurer", note recording that
   notice has gone out to the insurance company as a party.
2. *Second hearing* — stage "Written Statement/Reply Filed", recording the
   insurer's defence on liability or quantum.
3. *Third hearing* — stage "Evidence", recording the claimant's and any
   medical/technical witnesses' testimony.
4. *Fourth hearing* — stage "Arguments."
5. *Final hearing* — stage "Award/Order", note recording the
   compensation awarded, Proceeding status updated to `DISPOSED`.

**A note on the broader "tribunal" category:** NextCaseHQ's Court Note
`court_forum_type` fixed list already carries dedicated entries for
several tribunal-like forums by name — **Consumer Commission**, **Labour
Court**, **MACT**, and **Revenue Court** each get their own value (covered
in Sections 8, 7, and 9 of this library). For a tribunal that isn't one of
those named categories — an Income Tax Appellate Tribunal matter, an NCLT
company-law petition, a GST Appellate Tribunal matter, and so on — the
advocate selects **Other** as the `court_forum_type` on each Court Note
and puts the tribunal's actual name in the Proceeding's `court` field and
in the Court Note text itself, since "Other" is the only fixed-list value
available for a tribunal category the platform hasn't given its own named
option.

**What to watch for:** Because MACT claims often name an insurance company
as a formal party (recorded via `opposing_party_name`/description, or in
the Court Note text, since there is no separate "party" data model beyond
the Matter's opposing-party field), the advocate should be explicit in the
Matter description about who the real contesting party is — the vehicle
owner, the insurer, or both — so anyone else on the Matter's team reading
the Matter Health summary understands the claim posture at a glance.

---

## 7. Labour Disputes

**Scenario:** *Suresh Yadav vs. Bhavani Textile Mills — Industrial Dispute
for Wrongful Termination.* Suresh Yadav, a machine operator, was
terminated without notice; a reference has been made to the Labour Court
for adjudication of the dispute.

**Matter setup:**
- **Title:** "Suresh Yadav vs. Bhavani Textile Mills — Wrongful
  Termination"
- **Engagement type:** `LITIGATION`
- **Practice area:** Labour & Employment
- **Status:** `ACTIVE`
- **Client:** Suresh Yadav
- **Opposing party name:** Bhavani Textile Mills
- **Description:** date of termination, tenure of employment, and the
  relief sought (reinstatement with back wages, or compensation in lieu)

**Proceeding:**
- **Title:** "Industrial Dispute — Reference Case"
- **Case number:** the reference number assigned by the Labour Court
- **Court:** Labour Court
- **Stage:** "Reference Received"
- **Status:** `PENDING`

**Court Note sequence:** `court_forum_type` = **Labour Court** throughout.

1. *First hearing* — stage "Claim Statement Filed" (the workman's
   statement of claim), `next_actions`: "Await management's written
   statement."
2. *Second hearing* — stage "Written Statement Filed" by the management,
   note summarising the employer's defence (alleged misconduct, or a
   claim that the termination was simplicitor and compensated).
3. *Third hearing* — stage "Evidence — Workman", recording Suresh Yadav's
   examination.
4. *Fourth hearing* — stage "Evidence — Management", recording the
   employer's witnesses (HR manager, supervisor).
5. *Fifth hearing* — stage "Arguments."
6. *Final hearing* — stage "Award", note recording the Labour Court's
   award (e.g., reinstatement with partial back wages), Proceeding status
   updated to `DISPOSED`.

**Timeline:** As with any Proceeding, each of the above Court Notes
appends a `source_type=HEARING` entry to the Matter Timeline automatically,
and the Proceeding's `hearing_date` field always reflects the *next*
hearing the advocate needs to prepare for — useful in labour references,
which can proceed at a slower cadence than civil suits with longer gaps
between evidence dates.

**What to watch for:** If the employer challenges the award later (e.g.,
a writ petition against the Labour Court's award before the High Court),
that is again a new, separate Proceeding under the same Matter — same
appeal pattern discussed in Section 13, tracked by naming convention and
notes rather than a structural link, and this time using the **High
Court** forum type rather than Labour Court on its own Court Notes (see
Section 11 on Writ Proceedings).

---

## 8. Consumer Matters

**Scenario:** *Anjali Bose vs. Everstar Appliances Pvt. Ltd. — Consumer
Complaint for Deficiency in Service.* Anjali Bose purchased a refrigerator
that developed a recurring defect; after repeated failed repairs, she has
filed a complaint before the District Consumer Disputes Redressal
Commission.

**Matter setup:**
- **Title:** "Anjali Bose vs. Everstar Appliances Pvt. Ltd."
- **Engagement type:** `LITIGATION`
- **Practice area:** Consumer Protection
- **Status:** `ACTIVE`
- **Client:** Anjali Bose
- **Opposing party name:** Everstar Appliances Pvt. Ltd.
- **Description:** purchase date, defect history, repair attempts, and the
  relief sought (replacement, refund, and compensation for harassment)

**Proceeding:**
- **Title:** "Consumer Complaint — Deficiency in Service"
- **Case number:** the Commission's complaint number
- **Court:** District Consumer Disputes Redressal Commission
- **Stage:** "Complaint Filed"
- **Status:** `PENDING`

**Court Note sequence:** `court_forum_type` = **Consumer Commission**
throughout, its own value in the fixed list.

1. *First hearing* — stage "Notice", note recording notice issued to the
   opposite party.
2. *Second hearing* — stage "Version/Reply Filed", recording Everstar's
   written version denying deficiency.
3. *Third hearing* — stage "Evidence by Affidavit", note recording that
   both sides have filed evidence affidavits (Consumer Commission
   practice generally proceeds on affidavit evidence rather than lengthy
   oral examination), `next_actions`: "File rejoinder affidavit."
4. *Fourth hearing* — stage "Arguments."
5. *Final hearing* — stage "Order", note recording the Commission's order
   (e.g., directing replacement of the appliance and compensation),
   Proceeding status updated to `DISPOSED`.

**Timeline and Documents:** The purchase invoice, service/repair records,
correspondence with the manufacturer, and the final order are uploaded as
Documents linked to the Proceeding. The Timeline shows the fairly compact
hearing sequence typical of consumer matters, which usually move faster
than a full civil suit.

**What to watch for:** If Everstar Appliances appeals the District
Commission's order to the State Commission, that appeal is — once again —
a new Proceeding under the same Matter, following the same honesty
constraint as Section 13: no structural link, tracked by naming and
notes. The `court_forum_type` on the appeal's Court Notes would still be
recorded as **Consumer Commission**, since that fixed-list value covers
the consumer forum hierarchy generally rather than being limited to the
District tier specifically.

---

## 9. Revenue Matters

**Scenario:** *Harpreet Singh Dhillon vs. State Revenue Authorities —
Mutation and Land Records Dispute.* Harpreet Singh Dhillon is contesting an
incorrect mutation entry recorded in the revenue records following his
father's death, which a rival claimant is relying on to assert title.

**Matter setup:**
- **Title:** "Harpreet Singh Dhillon — Mutation Dispute"
- **Engagement type:** `LITIGATION`
- **Practice area:** Revenue / Land Records
- **Status:** `ACTIVE`
- **Client:** Harpreet Singh Dhillon
- **Opposing party name:** the rival claimant named in the mutation
  dispute
- **Description:** the property/khasra details, the disputed mutation
  entry, and the relief sought (correction of records)

**Proceeding:**
- **Title:** "Mutation Correction Application"
- **Case number:** the revenue authority's case/file number
- **Court:** Revenue Court (the relevant revenue officer — Tehsildar,
  SDM, or Revenue Court as applicable to the state's revenue hierarchy)
- **Stage:** "Application Filed"
- **Status:** `PENDING`

**Court Note sequence:** `court_forum_type` = **Revenue Court** throughout.

1. *First hearing* — stage "Notice to Respondent", note recording notice
   issued to the rival claimant.
2. *Second hearing* — stage "Reply Filed", recording the opposing claim
   to title/possession.
3. *Third hearing* — stage "Evidence — Documents", note recording that
   revenue record extracts, the succession certificate, and other
   documentary evidence were tendered.
4. *Fourth hearing* — stage "Arguments."
5. *Final hearing* — stage "Order", note recording the revenue
   authority's decision on the mutation entry, Proceeding status updated
   to `DISPOSED`.

**Timeline:** Revenue proceedings can move in fits and starts, with long
adjournments common; the Matter Timeline's chronological view is
particularly useful here to reconstruct, months later, exactly what was
last recorded and what the pending action was, since the Proceeding's
`hearing_date` and the Task from the last Court Note's `next_actions`
remain visible even across a long gap.

**What to watch for:** Revenue hierarchies vary by state (Tehsildar →
SDM → Collector → Revenue/Board of Revenue, or equivalent) and an appeal
within that hierarchy again means a new Proceeding under the same Matter
— same appeal-tracking discipline as Section 13, and the `court` field on
each new Proceeding should be updated to the actual next authority in the
hierarchy rather than reused verbatim from the Proceeding it succeeds.

---

## 10. Taxation

**Scenario:** *Nalanda Exports Pvt. Ltd. — GST Advisory on Input Tax
Credit Eligibility.* Nalanda Exports has asked its advocate to advise
on whether input tax credit can be claimed on a category of business
expenses following a change in departmental interpretation — a pure
advisory question with no notice, assessment, or litigation on foot yet.

**Matter setup:**
- **Title:** "Nalanda Exports Pvt. Ltd. — ITC Eligibility Advisory"
- **Engagement type:** `ADVISORY`
- **Practice area:** Taxation / GST
- **Status:** `ACTIVE`
- **Client:** Nalanda Exports Pvt. Ltd.
- **Opposing party name / opposing counsel / court / bench / judge:**
  left blank — there is no adversary and no forum, because this Matter is
  not litigation
- **Description:** the specific ITC question, the expense category in
  question, and the departmental circular or interpretation change
  prompting the query

**No Proceeding is created.** This is deliberate and correct: a Matter is
fully valid with zero Proceedings under it, and pure tax advisory work is
the textbook example. Because Court Notes require an existing Proceeding
(`/cases/[id]/court-note` only exists for a Proceeding that already
exists), **this Matter cannot and should not have a Court Note** — there
is no hearing to record, and there is no Proceeding to record it against.

**Tracking the advisory work — Matter Timeline manual entries:** All of
the substantive work on this Matter is logged as `source_type=MANUAL`
entries added directly on the Matter's Timeline tab via its "Add Entry"
control, since that is the correct and only place to log non-hearing
activity for a Matter with no Proceeding. A representative sequence:

1. An entry logging the initial client query and the facts as understood.
2. An entry logging research findings on the relevant GST provisions and
   the departmental circular.
3. An entry logging a call with the client's finance team to confirm the
   exact nature of the expenses in question.
4. An entry logging that a written advisory note has been finalised and
   shared with the client.

**Documents:** The advisory memo itself — drafted using the Document
Creator at `/dashboard/draft-builder` or the AI-assisted first-draft flow
at `/documents/new` — is saved and linked to this Matter (Documents can
be linked to a Matter alone, with no Proceeding required, since the
Document ↔ Matter/Proceeding link is independent of whether a Proceeding
exists).

**What to watch for:** Because there is no Proceeding, there is no
`hearing_date` for the Seven-Day Preparation reminder job to act on, and
the Matter Health summary's "next hearing date" will simply stay empty —
correctly so, since there is no hearing to be reminded of. If the advisory
question later escalates into an actual dispute (e.g., the department
issues a show-cause notice or assessment order), the advocate would at
that point create a Proceeding under this same Matter and begin recording
Court Notes against it; until then, the Timeline's manual entries are the
complete and accurate record of the engagement.

---

## 11. Writ Proceedings

**Scenario:** *Ramesh Chandra Oberoi vs. State Public Service Commission —
Writ Petition challenging denial of promotion.* Ramesh Chandra Oberoi was
passed over for promotion in violation, he contends, of the applicable
seniority rules; his advocate is filing a writ petition before the High
Court.

**Matter setup:**
- **Title:** "Ramesh Chandra Oberoi vs. State Public Service Commission"
- **Engagement type:** `LITIGATION`
- **Practice area:** Service Law / Writ
- **Status:** `ACTIVE`
- **Client:** Ramesh Chandra Oberoi
- **Opposing party name:** State Public Service Commission (and the
  state, as applicable)
- **Court / bench:** the High Court, once the writ is numbered and a
  bench is assigned
- **Description:** the promotion cycle in question, the seniority rule
  said to have been violated, and the relief sought (quashing of the
  impugned order and a direction for promotion with consequential
  benefits)

**Proceeding:**
- **Title:** "Writ Petition — Challenge to Denial of Promotion"
- **Case number:** the High Court's writ petition number
- **Court:** High Court
- **Judge:** the bench hearing the matter
- **Stage:** "Petition Filed"
- **Status:** `PENDING`

**Court Note sequence:** `court_forum_type` = **High Court** throughout.

1. *First hearing (admission)* — stage "Admission", note recording that
   the writ petition was admitted and notice issued to the respondents,
   `next_actions`: "Confirm service on the State Public Service
   Commission."
2. *Second hearing* — stage "Counter Affidavit Filed", recording the
   Commission's reply defending the promotion decision.
3. *Third hearing* — stage "Rejoinder Filed."
4. *Fourth hearing* — stage "Final Hearing/Arguments", note recording
   submissions on both sides.
5. *Final hearing* — stage "Judgment", note recording the High Court's
   decision (e.g., the writ is allowed and the promotion order is quashed
   with a direction for reconsideration), Proceeding status updated to
   `DISPOSED`.

**Timeline:** The writ's Timeline is typically shorter and faster-moving
than a full civil trial — writ petitions usually proceed on affidavits
without oral evidence — and this shows up as fewer, more widely spaced
Court Notes covering admission, pleadings, and final hearing rather than
a long evidence phase.

**What to watch for:** Interim relief (e.g., a stay of the impugned order
pending final hearing) is recorded as a stage/note on the *same* writ
Proceeding rather than a separate Proceeding, since it is heard within the
same writ petition and does not get its own case number — unlike the bail
application pattern in Section 2, where Indian practice does typically
assign a separate number. The advocate distinguishes the two by simply
checking whether the court/registry has actually issued a distinct
application number; if yes, a second Proceeding is warranted, if no, it is
just a stage/note update on the existing one.

---

## 12. Advisory Engagements

**Scenario:** *Crestline Realty Developers Pvt. Ltd. — Pre-Litigation
Advisory on a Vendor Dispute.* Crestline Realty is in a payment dispute
with a construction vendor and wants legal advice on its options —
negotiation, a legal notice, or litigation — before deciding how to
proceed. This kind of engagement may resolve without ever becoming
litigation, and NextCaseHQ treats that as a fully valid, ordinary outcome
rather than an incomplete matter.

**Matter setup:**
- **Title:** "Crestline Realty Developers — Vendor Payment Dispute"
- **Engagement type:** `PRE_LITIGATION` (or `ADVISORY`, depending on how
  far along the dispute is — `PRE_LITIGATION` fits here since a legal
  notice may be sent, whereas a Matter that is pure "should we even worry
  about this" strategic advice with no notice contemplated would more
  naturally be `ADVISORY`)
- **Practice area:** Commercial / Construction
- **Status:** `ACTIVE`
- **Client:** Crestline Realty Developers Pvt. Ltd.
- **Opposing party name:** the vendor in question (recorded even though
  no case has been filed, since the Matter's opposing-party field is
  independent of whether there is a Proceeding)
- **Description:** the payment dispute's facts, the amounts in question,
  and the client's stated preference (avoid litigation if possible)

**No Proceeding, by design.** As with the taxation example in Section 10,
this Matter may never acquire a Proceeding at all, and that is not a gap
to be "completed" later — it is simply what a successfully-resolved
pre-litigation matter looks like.

**Tracking the work — Matter Timeline manual entries:**
1. An entry logging the initial consultation and the advocate's
   preliminary assessment of the client's legal position.
2. An entry logging that a legal notice was drafted and sent to the
   vendor.
3. An entry logging the vendor's response to the notice.
4. An entry logging a negotiation call between both sides' advocates.
5. A final entry logging that a settlement was reached and the matter is
   resolved without litigation — at which point the advocate updates the
   Matter's **status to `CLOSED`** and sets `closed_at`.

**Documents:** The legal notice itself is drafted through the Document
Creator (`/dashboard/draft-builder`), and the vendor's reply, the
settlement correspondence, and any settlement agreement are uploaded as
Documents linked to the Matter.

**What to watch for:** Because Matter Health derives its "current stage"
and "needs-attention" signals from the *Matter's* data (including its
Timeline), a well-maintained pre-litigation Matter still shows a useful,
current picture even with zero Proceedings — the advocate should not
mistake "no Proceeding" for "nothing to track" and should keep logging
manual Timeline entries at each real step, exactly as they would for
Section 10's tax advisory example. If the dispute later fails to settle
and litigation becomes necessary, the advocate creates a Proceeding under
this same Matter at that point, and the pre-litigation Timeline entries
remain as the accurate history of everything that happened before suit
was filed.

---

## 13. Appeals

**Scenario:** Returning to Section 1's *Rina Kapoor vs. Kapoor Textiles
Pvt. Ltd.* recovery suit: Kapoor Textiles Pvt. Ltd. is dissatisfied with
the decree and files a first appeal before the appropriate appellate
court.

**How this is set up in NextCaseHQ, accurately:** NextCaseHQ formally
links an appeal Proceeding back to the suit it appeals. The practical
way an advocate tracks an appeal is:

1. **Keep the same Matter.** The appeal is not a new client engagement —
   it is the continuation of the same dispute — so the advocate does
   **not** create a new Matter. They continue using the original "Rina
   Kapoor vs. Kapoor Textiles Pvt. Ltd." Matter.
2. **Add a Further Proceeding** from the Matter's Proceedings panel,
   choosing the original recovery suit as the Proceeding it continues
   from and "Appeal" as the relationship:
   - **Title:** something that reads unmistakably as the appeal against
     the first Proceeding — e.g., "First Appeal against Recovery Suit
     Decree" — still good practice for readability, even though the
     relationship itself is now recorded structurally rather than only
     in the title.
   - **Case number:** the appellate court's own appeal number (unrelated
     to the trial court's suit number).
   - **Court:** the appellate court (e.g., District Judge's court hearing
     first appeals, or the High Court, depending on pecuniary/subject
     jurisdiction).
   - **Stage:** "Appeal Filed."
   - **Status:** `PENDING`.
3. **Update the original Proceeding's status.** On the original recovery
   suit Proceeding (Section 1), the advocate changes its **status to
   `APPEAL`** — one of the four enumerated status values (`PENDING`,
   `HEARING`, `DISPOSED`, `APPEAL`) — which correctly flags, on that
   Proceeding's own record, that it has been taken up in appeal, in
   addition to the structural link recorded on the new appeal
   Proceeding.

**Court Notes on the appeal:** Recorded exactly as any other Proceeding's
Court Notes — `court_forum_type` set to whatever the appellate forum
actually is (Civil Court, High Court, etc.), with its own stage
progression: "Appeal Admitted" → "Respondent's Reply" → "Arguments" →
"Judgment," ending with the appeal Proceeding's own status set to
`DISPOSED` once decided.

**Timeline:** Because both Proceedings share the same `matter_id`, the
Matter Timeline shows the full life of the dispute in one chronological
feed — the original suit's hearings followed, later, by the appeal's
hearings — even though, underneath, they come from two entirely separate
Proceeding rows with no structural link. Anyone reading the Timeline sees
a continuous story; anyone looking only at the raw Proceedings list has to
rely on the title/notes convention above to understand the relationship.

**What to watch for:** This naming-and-notes discipline is entirely
manual and only as reliable as the advocate who applies it consistently.
Firms handling many appeals should adopt a firm-wide convention (e.g.,
always naming the appeal Proceeding starting with "Appeal — " followed by
the original Proceeding's title) so that anyone on the Matter's team,
not just the advocate who created it, can immediately understand the
relationship without reading the notes field.

---

## 14. Execution Proceedings

**Scenario:** Continuing the same *Rina Kapoor vs. Kapoor Textiles Pvt.
Ltd.* Matter: after the appeal in Section 13 is dismissed and the decree
is confirmed, Kapoor Textiles Pvt. Ltd. still does not pay, so Rina Kapoor's
advocate files an execution petition to enforce the decree.

**Same structural link as appeals:** Execution proceedings link back to
the Proceeding whose decree they enforce, the same way an appeal links
back to the suit it appeals. The workflow is therefore identical in
shape to Section 13:

1. **Same Matter, no new one created.** Execution is enforcement of the
   same underlying claim, not a new engagement.
2. **Add a third Proceeding as a Further Proceeding** under this Matter
   (the recovery suit and the appeal already being the first two),
   choosing the appeal Proceeding as the one it continues from and
   "Execution" as the relationship:
   - **Title:** "Execution Petition — Recovery Suit Decree" — still
     worded so its relationship to the underlying decree is obvious on
     sight, on top of the structural link.
   - **Case number:** the executing court's execution petition number.
   - **Court:** the executing court (often the same trial court that
     passed the decree, since execution is typically filed where the
     decree was passed unless transferred).
   - **Stage:** "Execution Petition Filed."
   - **Status:** `PENDING`.
3. **The original suit and appeal Proceedings are left as `DISPOSED`**
   (the appeal, once dismissed, was updated to `DISPOSED` following its
   own judgment as described in Section 13) — there is no status value
   meaning "decree confirmed and now under execution," so `DISPOSED`
   correctly remains the status of both the original suit and the appeal;
   only the new execution Proceeding carries an active `PENDING`/`HEARING`
   status going forward.

**Court Notes on the execution petition:** `court_forum_type` set to
whatever the executing forum actually is (typically Civil Court), with a
stage progression suited to execution practice: "Execution Petition
Filed" → "Notice to Judgment-Debtor" → "Objections Filed" (if the
judgment-debtor contests execution) → "Attachment Ordered" (if assets are
attached) → "Execution Satisfied", at which point the Proceeding's status
is updated to `DISPOSED` and, if this closes out all outstanding work on
the Matter, the Matter's own status can be moved to `CLOSED` with
`closed_at` set.

**Timeline:** The Matter Timeline now carries the complete three-stage
life of the dispute in one place — suit, appeal, execution — purely
because all three Proceedings share the same `matter_id`. This is, in
practice, the single biggest reason to *always* create a new Proceeding
under the existing Matter rather than starting a fresh Matter for an
appeal or an execution petition: it is what keeps the Timeline (and Matter
Health) telling the whole story, even without a structural Proceeding-to-
Proceeding link.

**What to watch for:** As with appeals, the cross-referencing here is a
manual, notes/title-based discipline, not an automated feature. An
advocate auditing a Matter with a long procedural history — suit, appeal,
execution, and possibly further proceedings — should periodically check
the Proceedings list on the Matter workspace and confirm every entry's
title and notes still clearly signal which prior Proceeding it follows
from, since this is the only mechanism NextCaseHQ offers today for
tracing that lineage.
