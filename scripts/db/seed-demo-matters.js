#!/usr/bin/env node
/**
 * Seeds realistic sample Matters, Proceedings, and Court Notes across every
 * supported court vertical (district, sessions, high court, Supreme Court,
 * tribunal, consumer commission, commercial, family, labour, revenue, MACT,
 * arbitration, advisory) into a single tenant, so the Matter Register has
 * something real to demonstrate.
 *
 * Every row is clearly marked as sample data: titles are suffixed
 * "(Sample)", matter_number carries a SAMPLE- prefix, and description opens
 * with an explicit disclaimer sentence. Clients, opposing parties, judges,
 * and dates are all fictional.
 *
 * Follows the same invariants the app itself enforces (see
 * apps/web/src/app/api/cases/[id]/court-notes/route.ts and
 * apps/web/src/app/api/matters/[id]/proceedings/route.ts): a Court Note
 * insert also updates the Proceeding's hearing_date/stage/court, appends a
 * Matter Timeline event, and — only when next_actions is set — creates
 * exactly one Matter Task linked back to that Court Note. Proceedings that
 * continue an earlier one (appeal, execution, ...) are separate LegalCase
 * rows linked via prior_proceeding_id/relationship_to_prior, never a
 * mutation of the one before them.
 *
 * Usage:
 *   DATABASE_URL=postgres://nextcase_app:...@localhost:5432/nextcase_dev \
 *   node scripts/db/seed-demo-matters.js
 *
 * Idempotent: skips any matter whose matter_number already exists in the
 * target tenant, so re-running is safe.
 */
const { Client } = require('pg');

const TENANT_ID = process.env.DEV_SEED_TENANT_ID || '00000000-0000-0000-0000-000000000001';
const DISCLAIMER =
  'SAMPLE DATA — for demonstration purposes only. This is not a real client, matter, or court record.';

const COURT_FORUM_LABELS = {
  SUPREME_COURT: 'Supreme Court',
  HIGH_COURT: 'High Court',
  CIVIL_COURT: 'Civil Court',
  CRIMINAL_COURT: 'Criminal Court',
  FAMILY_COURT: 'Family Court',
  COMMERCIAL_COURT: 'Commercial Court',
  CONSUMER_COMMISSION: 'Consumer Commission',
  LABOUR_COURT: 'Labour Court',
  MACT: 'Motor Accident Claims Tribunal',
  ARBITRATION: 'Arbitration',
  REVENUE_COURT: 'Revenue Court',
  OTHER: 'Other Court / Forum',
};

function forumDisplay(type, other) {
  if (type === 'OTHER') return (other || '').trim() || COURT_FORUM_LABELS.OTHER;
  return COURT_FORUM_LABELS[type];
}

function d(daysFromToday) {
  const dt = new Date();
  dt.setUTCDate(dt.getUTCDate() + daysFromToday);
  return dt.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Matter specs — one per requested court vertical, plus a few that chain
// multiple proceedings (appeal, execution) under one Matter and one closed/
// disposed matter, per the release requirement to show varied stages.
// ---------------------------------------------------------------------------
const MATTER_SPECS = [
  {
    matterNumber: 'SAMPLE-DIST-CIV-01',
    title: '(Sample) Textile Traders Cooperative Society vs. Kishore Enterprises — Recovery Suit',
    engagementType: 'LITIGATION',
    matterCategory: 'CIVIL',
    status: 'ACTIVE',
    court: 'District Civil Court, Pune',
    state: 'Maharashtra',
    district: 'Pune',
    clientName: '(Sample) Textile Traders Cooperative Society',
    opposingPartyName: 'Kishore Enterprises',
    description: `${DISCLAIMER} A civil recovery suit for outstanding dues under a supply agreement; currently at the evidence stage before the District Civil Court.`,
    proceedings: [
      {
        title: 'Recovery Suit No. 214/2025',
        caseNumber: 'RCS 214/2025',
        status: 'HEARING',
        court: 'District Civil Court, Pune',
        judge: "Hon'ble Civil Judge (Senior Division), Pune",
        stage: 'Filed',
        proceedingYear: 2025,
        courtNotes: [
          {
            hearingDate: d(-90),
            nextHearingDate: d(-45),
            courtForumType: 'CIVIL_COURT',
            stage: 'Summons issued to defendant',
            note: 'Suit admitted; summons ordered to be issued to the defendant returnable on the next date.',
            nextActions: 'Prepare and file affidavit of service.',
          },
          {
            hearingDate: d(-45),
            nextHearingDate: d(-10),
            courtForumType: 'CIVIL_COURT',
            stage: 'Written statement filed',
            note: 'Defendant entered appearance and filed written statement denying liability. Issues to be framed on the next date.',
            nextActions: 'Draft proposed issues for framing.',
          },
          {
            hearingDate: d(-10),
            nextHearingDate: d(24),
            courtForumType: 'CIVIL_COURT',
            stage: 'Issues framed; evidence stage',
            note: 'Issues framed. Plaintiff’s evidence to commence on the next date.',
            nextActions: 'Prepare plaintiff witness for examination-in-chief.',
          },
        ],
      },
    ],
  },
  {
    matterNumber: 'SAMPLE-DIST-CIV-02',
    title: '(Sample) Nationwide Textiles Pvt Ltd vs. Anmol Traders — Recovery Suit (Concluded)',
    engagementType: 'LITIGATION',
    matterCategory: 'CIVIL',
    status: 'CLOSED',
    court: 'District Civil Court, Surat',
    state: 'Gujarat',
    district: 'Surat',
    clientName: '(Sample) Nationwide Textiles Pvt Ltd',
    opposingPartyName: 'Anmol Traders',
    description: `${DISCLAIMER} A concluded recovery suit — decree passed in the plaintiff's favour and the matter closed after full satisfaction of the decree.`,
    proceedings: [
      {
        title: 'Recovery Suit No. 88/2023',
        caseNumber: 'RCS 88/2023',
        status: 'DISPOSED',
        court: 'District Civil Court, Surat',
        judge: "Hon'ble Civil Judge (Junior Division), Surat",
        stage: 'Filed',
        proceedingYear: 2023,
        courtNotes: [
          {
            hearingDate: d(-400),
            nextHearingDate: d(-300),
            courtForumType: 'CIVIL_COURT',
            stage: 'Evidence concluded',
            note: 'Both sides closed evidence. Matter listed for final arguments.',
            nextActions: 'Prepare written arguments.',
          },
          {
            hearingDate: d(-300),
            nextHearingDate: null,
            courtForumType: 'CIVIL_COURT',
            stage: 'Judgment pronounced — suit decreed',
            note: 'Judgment pronounced. Suit decreed in favour of the plaintiff with costs. Decree since fully satisfied; matter closed.',
            nextActions: null,
          },
        ],
      },
    ],
  },
  {
    matterNumber: 'SAMPLE-SESS-CRIM-01',
    title: '(Sample) State vs. Ramesh Kumar — Sessions Trial',
    engagementType: 'LITIGATION',
    matterCategory: 'CRIMINAL',
    status: 'ACTIVE',
    court: 'Court of Sessions, Thane',
    state: 'Maharashtra',
    district: 'Thane',
    clientName: '(Sample) Ramesh Kumar (Accused, represented on brief)',
    opposingPartyName: 'State of Maharashtra',
    description: `${DISCLAIMER} A sessions trial presently at the prosecution-evidence stage before the Sessions Court.`,
    proceedings: [
      {
        title: 'Sessions Case No. 142/2024',
        caseNumber: 'SC 142/2024',
        status: 'HEARING',
        court: 'Court of Sessions, Thane',
        judge: "Hon'ble Additional Sessions Judge, Thane",
        stage: 'Charges framed',
        proceedingYear: 2024,
        courtNotes: [
          {
            hearingDate: d(-120),
            nextHearingDate: d(-60),
            courtForumType: 'CRIMINAL_COURT',
            stage: 'Charges framed',
            note: 'Charges under the relevant penal provisions framed and read over to the accused, who pleaded not guilty and claimed trial.',
            nextActions: 'Brief the client on the prosecution witness list.',
          },
          {
            hearingDate: d(-60),
            nextHearingDate: d(-5),
            courtForumType: 'CRIMINAL_COURT',
            stage: 'Prosecution evidence — PW-1 examined',
            note: 'First prosecution witness examined-in-chief and partly cross-examined. Cross-examination to continue on the next date.',
            nextActions: 'Prepare cross-examination notes for PW-1.',
          },
          {
            hearingDate: d(-5),
            nextHearingDate: d(30),
            courtForumType: 'CRIMINAL_COURT',
            stage: 'Prosecution evidence continuing',
            note: 'Cross-examination of PW-1 concluded. PW-2 to be examined on the next date.',
            nextActions: 'Review case diary ahead of PW-2’s examination.',
          },
        ],
      },
    ],
  },
  {
    matterNumber: 'SAMPLE-CIV-APPEAL-01',
    title: '(Sample) Suresh Traders vs. Global Textiles Ltd. — Suit & First Appeal',
    engagementType: 'LITIGATION',
    matterCategory: 'CIVIL',
    status: 'ACTIVE',
    court: 'High Court',
    state: 'Maharashtra',
    district: 'Mumbai',
    clientName: '(Sample) Suresh Traders',
    opposingPartyName: 'Global Textiles Ltd.',
    description: `${DISCLAIMER} A civil suit decided at the trial court and now under a First Appeal before the High Court — demonstrates a linked, multi-proceeding matter.`,
    proceedings: [
      {
        title: 'Civil Suit No. 512/2022',
        caseNumber: 'CS 512/2022',
        status: 'DISPOSED',
        court: 'District Civil Court, Mumbai',
        judge: "Hon'ble Civil Judge (Senior Division), Mumbai",
        stage: 'Filed',
        proceedingYear: 2022,
        courtNotes: [
          {
            hearingDate: d(-500),
            nextHearingDate: null,
            courtForumType: 'CIVIL_COURT',
            stage: 'Judgment pronounced — suit dismissed',
            note: 'Judgment pronounced. Suit dismissed. Instructions taken to prefer a First Appeal.',
            nextActions: null,
          },
        ],
      },
      {
        title: 'First Appeal No. 77/2023',
        caseNumber: 'FA 77/2023',
        status: 'HEARING',
        court: 'High Court',
        judge: "Hon'ble High Court",
        stage: 'Admitted',
        proceedingYear: 2023,
        relationshipToPrior: 'APPEAL',
        priorProceedingIndex: 0,
        setAsCurrent: true,
        courtNotes: [
          {
            hearingDate: d(-200),
            nextHearingDate: d(-80),
            courtForumType: 'HIGH_COURT',
            stage: 'Appeal admitted; stay granted',
            note: 'First Appeal admitted. Operation of the trial court decree stayed pending disposal of the appeal.',
            nextActions: 'File paper book and compilation of trial court record.',
          },
          {
            hearingDate: d(-80),
            nextHearingDate: d(40),
            courtForumType: 'HIGH_COURT',
            stage: 'Final hearing — arguments in progress',
            note: 'Appellant’s arguments commenced. To continue on the next date.',
            nextActions: 'Prepare compilation of case law on the limitation point.',
          },
        ],
      },
    ],
  },
  {
    matterNumber: 'SAMPLE-SC-SLP-01',
    title: '(Sample) Coastal Minerals Pvt Ltd vs. Union of India — SLP',
    engagementType: 'LITIGATION',
    matterCategory: 'CONSTITUTIONAL',
    status: 'ACTIVE',
    court: 'Supreme Court of India',
    state: 'Delhi',
    district: 'New Delhi',
    clientName: '(Sample) Coastal Minerals Pvt Ltd',
    opposingPartyName: 'Union of India',
    description: `${DISCLAIMER} A writ petition dismissed by the High Court, now carried to the Supreme Court by Special Leave Petition.`,
    proceedings: [
      {
        title: 'Writ Petition No. 3390/2024',
        caseNumber: 'WP 3390/2024',
        status: 'DISPOSED',
        court: 'High Court',
        judge: "Hon'ble High Court (Division Bench)",
        stage: 'Filed',
        proceedingYear: 2024,
        courtNotes: [
          {
            hearingDate: d(-150),
            nextHearingDate: null,
            courtForumType: 'HIGH_COURT',
            stage: 'Writ petition dismissed',
            note: 'Writ petition dismissed on merits. Instructions taken to approach the Supreme Court by way of Special Leave Petition.',
            nextActions: null,
          },
        ],
      },
      {
        title: 'Special Leave Petition (Civil) No. 9981/2024',
        caseNumber: 'SLP(C) 9981/2024',
        status: 'PENDING',
        court: 'Supreme Court of India',
        judge: "Hon'ble Supreme Court",
        stage: 'Notice issued',
        proceedingYear: 2024,
        relationshipToPrior: 'SLP',
        priorProceedingIndex: 0,
        setAsCurrent: true,
        courtNotes: [
          {
            hearingDate: d(-60),
            nextHearingDate: d(50),
            courtForumType: 'SUPREME_COURT',
            stage: 'Notice issued to respondents',
            note: 'Leave petition taken up. Notice issued to the respondents, returnable on the next date.',
            nextActions: 'Prepare synopsis and list of dates for final hearing.',
          },
        ],
      },
    ],
  },
  {
    matterNumber: 'SAMPLE-TRIB-TAX-01',
    title: '(Sample) Anand Cements Ltd. vs. Commissioner of Income Tax — ITAT Appeal',
    engagementType: 'LITIGATION',
    matterCategory: 'TAXATION',
    status: 'ACTIVE',
    court: 'Income Tax Appellate Tribunal',
    state: 'Maharashtra',
    district: 'Mumbai',
    clientName: '(Sample) Anand Cements Ltd.',
    opposingPartyName: 'Commissioner of Income Tax',
    description: `${DISCLAIMER} An appeal against a reassessment order, pending before the Income Tax Appellate Tribunal.`,
    proceedings: [
      {
        title: 'ITA No. 2245/Mum/2024',
        caseNumber: 'ITA 2245/Mum/2024',
        status: 'PENDING',
        court: 'Income Tax Appellate Tribunal, Mumbai Bench',
        judge: 'Bench comprising a Judicial Member and an Accountant Member',
        stage: 'Paper book filed',
        proceedingYear: 2024,
        courtNotes: [
          {
            hearingDate: d(-70),
            nextHearingDate: d(20),
            courtForumType: 'OTHER',
            courtForumOther: 'Income Tax Appellate Tribunal',
            stage: 'Paper book filed; hearing part-heard',
            note: 'Paper book filed. Assessee’s submissions on the disallowance ground part-heard.',
            nextActions: 'Prepare written submissions on the disallowance ground.',
          },
        ],
      },
    ],
  },
  {
    matterNumber: 'SAMPLE-CONSUMER-01',
    title: '(Sample) Priya Mehta vs. SunHome Appliances Ltd. — Deficiency of Service',
    engagementType: 'LITIGATION',
    matterCategory: 'CONSUMER',
    status: 'ACTIVE',
    court: 'District Consumer Disputes Redressal Commission, Bengaluru',
    state: 'Karnataka',
    district: 'Bengaluru',
    clientName: '(Sample) Priya Mehta',
    opposingPartyName: 'SunHome Appliances Ltd.',
    description: `${DISCLAIMER} A consumer complaint alleging deficiency of service and defective goods, pending before the District Consumer Commission.`,
    proceedings: [
      {
        title: 'Consumer Complaint No. 401/2025',
        caseNumber: 'CC 401/2025',
        status: 'HEARING',
        court: 'District Consumer Disputes Redressal Commission, Bengaluru',
        judge: 'President and Members, District Commission',
        stage: 'Evidence by affidavit filed',
        proceedingYear: 2025,
        courtNotes: [
          {
            hearingDate: d(-40),
            nextHearingDate: d(15),
            courtForumType: 'CONSUMER_COMMISSION',
            stage: 'Evidence by affidavit filed',
            note: 'Complainant’s evidence by way of affidavit filed. Opposite party granted time to file reply evidence.',
            nextActions: 'Review opposite party’s written version for inconsistencies.',
          },
        ],
      },
    ],
  },
  {
    matterNumber: 'SAMPLE-COMM-01',
    title: '(Sample) Vertex Logistics Pvt Ltd vs. Orion Freight Carriers — Commercial Suit',
    engagementType: 'LITIGATION',
    matterCategory: 'COMMERCIAL',
    status: 'ACTIVE',
    court: 'Commercial Court, Chennai',
    state: 'Tamil Nadu',
    district: 'Chennai',
    clientName: '(Sample) Vertex Logistics Pvt Ltd',
    opposingPartyName: 'Orion Freight Carriers',
    description: `${DISCLAIMER} A commercial suit for breach of a freight contract, at the case-management stage before the Commercial Court.`,
    proceedings: [
      {
        title: 'Commercial Suit No. 63/2025',
        caseNumber: 'COMM SUIT 63/2025',
        status: 'HEARING',
        court: 'Commercial Court, Chennai',
        judge: "Hon'ble Judge, Commercial Court",
        stage: 'Case management hearing',
        proceedingYear: 2025,
        courtNotes: [
          {
            hearingDate: d(-20),
            nextHearingDate: d(18),
            courtForumType: 'COMMERCIAL_COURT',
            stage: 'Case management hearing',
            note: 'Case management hearing held. Timelines for admission/denial of documents fixed.',
            nextActions: 'Prepare admission-denial statement of documents.',
          },
        ],
      },
    ],
  },
  {
    matterNumber: 'SAMPLE-FAMILY-01',
    title: '(Sample) Meera Iyer vs. Arvind Iyer — Divorce & Maintenance',
    engagementType: 'LITIGATION',
    matterCategory: 'FAMILY',
    status: 'ACTIVE',
    court: 'Family Court, Chennai',
    state: 'Tamil Nadu',
    district: 'Chennai',
    clientName: '(Sample) Meera Iyer',
    opposingPartyName: 'Arvind Iyer',
    description: `${DISCLAIMER} A matrimonial petition seeking dissolution of marriage and interim maintenance, pending before the Family Court.`,
    proceedings: [
      {
        title: 'Family Court Original Petition No. 190/2025',
        caseNumber: 'OP 190/2025',
        status: 'HEARING',
        court: 'Family Court, Chennai',
        judge: "Hon'ble Judge, Family Court",
        stage: 'Interim maintenance application pending',
        proceedingYear: 2025,
        courtNotes: [
          {
            hearingDate: d(-35),
            nextHearingDate: d(12),
            courtForumType: 'FAMILY_COURT',
            stage: 'Interim maintenance application pending',
            note: 'Arguments heard on the interim maintenance application. Orders reserved to be pronounced on the next date.',
            nextActions: 'Collect updated income and expense documents from the client.',
          },
        ],
      },
    ],
  },
  {
    matterNumber: 'SAMPLE-LABOUR-01',
    title: '(Sample) Ashok Pawar vs. Everfresh Foods Pvt Ltd — Termination Dispute',
    engagementType: 'LITIGATION',
    matterCategory: 'LABOUR',
    status: 'ACTIVE',
    court: 'Labour Court, Nagpur',
    state: 'Maharashtra',
    district: 'Nagpur',
    clientName: '(Sample) Ashok Pawar',
    opposingPartyName: 'Everfresh Foods Pvt Ltd',
    description: `${DISCLAIMER} A workman’s reference alleging illegal termination, pending before the Labour Court.`,
    proceedings: [
      {
        title: 'Reference (IDA) No. 55/2024',
        caseNumber: 'REF 55/2024',
        status: 'HEARING',
        court: 'Labour Court, Nagpur',
        judge: "Hon'ble Presiding Officer, Labour Court",
        stage: 'Workman’s evidence stage',
        proceedingYear: 2024,
        courtNotes: [
          {
            hearingDate: d(-55),
            nextHearingDate: d(8),
            courtForumType: 'LABOUR_COURT',
            stage: 'Workman’s evidence stage',
            note: 'Workman examined-in-chief. Cross-examination by the management to proceed on the next date.',
            nextActions: 'Prepare cross-examination points from the personnel file.',
          },
        ],
      },
    ],
  },
  {
    matterNumber: 'SAMPLE-REVENUE-01',
    title: '(Sample) Balraj Singh vs. State Revenue Department — Mutation Dispute',
    engagementType: 'LITIGATION',
    matterCategory: 'PROPERTY',
    status: 'ACTIVE',
    court: 'Office of the Sub-Divisional Officer (Revenue), Jaipur',
    state: 'Rajasthan',
    district: 'Jaipur',
    clientName: '(Sample) Balraj Singh',
    opposingPartyName: 'State Revenue Department',
    description: `${DISCLAIMER} A dispute over entries in the revenue record following an inheritance, pending before the Revenue Court.`,
    proceedings: [
      {
        title: 'Mutation Case No. 132/2025',
        caseNumber: 'MUT 132/2025',
        status: 'PENDING',
        court: 'Office of the Sub-Divisional Officer (Revenue), Jaipur',
        judge: 'Sub-Divisional Officer (Revenue)',
        stage: 'Objections filed',
        proceedingYear: 2025,
        courtNotes: [
          {
            hearingDate: d(-25),
            nextHearingDate: d(22),
            courtForumType: 'REVENUE_COURT',
            stage: 'Objections filed',
            note: 'Objections to the proposed mutation entry filed on behalf of the client along with supporting revenue extracts.',
            nextActions: 'Collect certified copies of the succession certificate.',
          },
        ],
      },
    ],
  },
  {
    matterNumber: 'SAMPLE-MACT-01',
    title: '(Sample) Sunita Devi vs. National General Insurance Co. Ltd. — MACT Claim',
    engagementType: 'LITIGATION',
    matterCategory: 'CIVIL',
    status: 'ACTIVE',
    court: 'Motor Accident Claims Tribunal, Lucknow',
    state: 'Uttar Pradesh',
    district: 'Lucknow',
    clientName: '(Sample) Sunita Devi',
    opposingPartyName: 'National General Insurance Co. Ltd.',
    description: `${DISCLAIMER} A compensation claim arising from a road accident, pending before the Motor Accident Claims Tribunal.`,
    proceedings: [
      {
        title: 'MACT Claim Petition No. 271/2024',
        caseNumber: 'MACT 271/2024',
        status: 'HEARING',
        court: 'Motor Accident Claims Tribunal, Lucknow',
        judge: "Hon'ble Presiding Officer, MACT",
        stage: 'Claimant’s evidence stage',
        proceedingYear: 2024,
        courtNotes: [
          {
            hearingDate: d(-48),
            nextHearingDate: d(14),
            courtForumType: 'MACT',
            stage: 'Claimant’s evidence stage',
            note: 'Claimant examined. Medical and income documents exhibited. Insurer’s evidence to follow.',
            nextActions: 'Arrange the treating doctor’s attendance for evidence.',
          },
        ],
      },
    ],
  },
  {
    matterNumber: 'SAMPLE-ARB-EXEC-01',
    title: '(Sample) Meridian Constructions vs. Apex Developers — Arbitration & Execution',
    engagementType: 'ARBITRATION',
    matterCategory: 'ARBITRATION',
    status: 'ACTIVE',
    court: 'Arbitral Tribunal',
    state: 'Karnataka',
    district: 'Bengaluru',
    clientName: '(Sample) Meridian Constructions',
    opposingPartyName: 'Apex Developers',
    description: `${DISCLAIMER} A construction-contract dispute resolved by arbitral award, now at the execution stage before the Commercial Court — demonstrates an award followed by execution proceedings.`,
    proceedings: [
      {
        title: 'Arbitration Case No. 14/2023',
        caseNumber: 'ARB 14/2023',
        status: 'DISPOSED',
        court: 'Arbitral Tribunal (ad hoc)',
        judge: 'Sole Arbitrator',
        stage: 'Filed',
        proceedingYear: 2023,
        courtNotes: [
          {
            hearingDate: d(-260),
            nextHearingDate: null,
            courtForumType: 'ARBITRATION',
            stage: 'Award pronounced',
            note: 'Final arbitral award pronounced in favour of the claimant for the balance contract value with interest.',
            nextActions: null,
          },
        ],
      },
      {
        title: 'Execution Petition No. 96/2024',
        caseNumber: 'EP 96/2024',
        status: 'HEARING',
        court: 'Commercial Court, Bengaluru',
        judge: "Hon'ble Judge, Commercial Court",
        stage: 'Execution proceedings — attachment sought',
        proceedingYear: 2024,
        relationshipToPrior: 'EXECUTION',
        priorProceedingIndex: 0,
        setAsCurrent: true,
        courtNotes: [
          {
            hearingDate: d(-30),
            nextHearingDate: d(19),
            courtForumType: 'COMMERCIAL_COURT',
            stage: 'Execution proceedings — attachment sought',
            note: 'Execution petition for enforcement of the arbitral award as a decree taken up. Application for attachment of judgment-debtor’s bank account moved.',
            nextActions: 'Collect updated bank account details of the judgment-debtor.',
          },
        ],
      },
    ],
  },
  {
    matterNumber: 'SAMPLE-ADVISORY-01',
    title: '(Sample) Nimbus Retail Pvt Ltd — Contract & Compliance Advisory',
    engagementType: 'ADVISORY',
    matterCategory: 'COMMERCIAL',
    status: 'ACTIVE',
    court: null,
    state: 'Maharashtra',
    district: 'Mumbai',
    clientName: '(Sample) Nimbus Retail Pvt Ltd',
    opposingPartyName: null,
    description: `${DISCLAIMER} A non-litigation advisory engagement — vendor contract review and ongoing compliance advice, with no court proceeding attached. Demonstrates the Matter Timeline for advisory work.`,
    matterEvents: [
      { eventDate: d(-75), description: 'Engagement letter signed; scope agreed as vendor contract review and quarterly compliance advisory.', sourceType: 'MANUAL' },
      { eventDate: d(-52), description: 'Reviewed and marked up the standard vendor supply agreement; flagged indemnity and termination clauses for negotiation.', sourceType: 'MANUAL' },
      { eventDate: d(-30), description: 'Delivered a written opinion on data-protection obligations applicable to the client’s customer-loyalty programme.', sourceType: 'MANUAL' },
      { eventDate: d(-9), description: 'Advised on GST implications of the proposed new warehousing arrangement.', sourceType: 'MANUAL' },
    ],
  },
];

async function createMatter(client, tenantId, authorUserId, spec) {
  let clientId = null;
  if (spec.clientName) {
    const clientRow = await client.query(
      `INSERT INTO "Client" (tenant_id, name) VALUES ($1, $2) RETURNING id`,
      [tenantId, spec.clientName]
    );
    clientId = clientRow.rows[0].id;
  }

  const matterRow = await client.query(
    `INSERT INTO "Matter" (
       tenant_id, title, matter_number, engagement_type, matter_category, status,
       client_id, opposing_party_name, court, description, state, district,
       created_by_user_id, updated_by_user_id, closed_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13, $14)
     RETURNING id`,
    [
      tenantId,
      spec.title,
      spec.matterNumber,
      spec.engagementType,
      spec.matterCategory,
      spec.status,
      clientId,
      spec.opposingPartyName,
      spec.court,
      spec.description,
      spec.state || null,
      spec.district || null,
      authorUserId,
      spec.status === 'CLOSED' ? new Date().toISOString() : null,
    ]
  );
  const matterId = matterRow.rows[0].id;

  const proceedingIds = [];
  let currentProceedingId = null;
  let currentStage = null;
  let currentHearingDate = null;

  for (const proc of spec.proceedings || []) {
    const priorProceedingId =
      proc.priorProceedingIndex !== undefined ? proceedingIds[proc.priorProceedingIndex] : null;

    const caseRow = await client.query(
      `INSERT INTO "LegalCase" (
         tenant_id, title, case_number, country_code, status, court, judge, stage,
         matter_id, proceeding_year, relationship_to_prior, prior_proceeding_id
       ) VALUES ($1, $2, $3, 'IN', $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        tenantId,
        proc.title,
        proc.caseNumber || null,
        proc.status,
        proc.court || null,
        proc.judge || null,
        proc.stage || null,
        matterId,
        proc.proceedingYear || null,
        proc.relationshipToPrior || null,
        priorProceedingId,
      ]
    );
    const caseId = caseRow.rows[0].id;
    proceedingIds.push(caseId);

    let previousHearingDate = null;
    let previousStage = proc.stage || null;

    for (const note of proc.courtNotes || []) {
      const display = forumDisplay(note.courtForumType, note.courtForumOther);
      const noteRow = await client.query(
        `INSERT INTO "CourtNote" (
           tenant_id, case_id, matter_id, author_user_id, hearing_date, next_hearing_date,
           court_forum_type, court_forum_other, court_forum_display, stage, note, next_actions,
           input_method, source, verification_status, confirmed_by, confirmed_at,
           previous_hearing_date, previous_stage
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'MANUAL', 'ADVOCATE_ENTRY',
                   'ADVOCATE_CONFIRMED', $4, now(), $13, $14)
         RETURNING id`,
        [
          tenantId,
          caseId,
          matterId,
          authorUserId,
          note.hearingDate,
          note.nextHearingDate,
          note.courtForumType,
          note.courtForumOther || null,
          display,
          note.stage,
          note.note,
          note.nextActions || null,
          previousHearingDate,
          previousStage,
        ]
      );
      const courtNoteId = noteRow.rows[0].id;

      await client.query(
        `UPDATE "LegalCase" SET hearing_date = $2, stage = $3, court = $4, updated_at = now() WHERE id = $1`,
        [caseId, note.nextHearingDate, note.stage, display]
      );

      const eventParts = [`Court Note — ${note.stage} (${display}): ${note.note}`];
      if (note.nextHearingDate) eventParts.push(`Next hearing: ${note.nextHearingDate}`);
      if (note.nextActions) eventParts.push(`Next: ${note.nextActions}`);
      await client.query(
        `INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description, source_type, actor_user_id)
         VALUES ($1, $2, $3, $4, 'HEARING', $5)`,
        [tenantId, matterId, note.hearingDate, eventParts.join(' '), authorUserId]
      );

      if (note.nextActions && note.nextActions.trim()) {
        await client.query(
          `INSERT INTO "MatterTask" (tenant_id, matter_id, case_id, court_note_id, created_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [tenantId, matterId, caseId, courtNoteId, authorUserId]
        );
      }

      previousHearingDate = note.nextHearingDate;
      previousStage = note.stage;
    }

    if (proc.setAsCurrent || spec.proceedings.length === 1) {
      currentProceedingId = caseId;
      currentStage = previousStage;
      currentHearingDate = previousHearingDate;
    }
  }

  if (currentProceedingId) {
    await client.query(
      `UPDATE "Matter" SET current_proceeding_id = $2, current_stage = $3, next_hearing_date = $4 WHERE id = $1`,
      [matterId, currentProceedingId, currentStage, currentHearingDate]
    );
  }

  for (const event of spec.matterEvents || []) {
    await client.query(
      `INSERT INTO "MatterEvent" (tenant_id, matter_id, event_date, description, source_type, actor_user_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tenantId, matterId, event.eventDate, event.description, event.sourceType, authorUserId]
    );
  }

  return matterId;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Aborting.');
    process.exit(1);
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('nextcase.current_tenant_id', $1, true)`, [TENANT_ID]);

    const userRows = await client.query(
      `SELECT id FROM "User" WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [TENANT_ID]
    );
    if (userRows.rows.length === 0) {
      throw new Error(`No User found for tenant ${TENANT_ID}. Run scripts/db/seed-dev-user.js first.`);
    }
    const authorUserId = userRows.rows[0].id;

    let created = 0;
    let skipped = 0;
    for (const spec of MATTER_SPECS) {
      const existing = await client.query(
        `SELECT id FROM "Matter" WHERE tenant_id = $1 AND matter_number = $2`,
        [TENANT_ID, spec.matterNumber]
      );
      if (existing.rows.length > 0) {
        console.log(`[seed-demo-matters] Skipping ${spec.matterNumber} — already exists.`);
        skipped += 1;
        continue;
      }
      await createMatter(client, TENANT_ID, authorUserId, spec);
      console.log(`[seed-demo-matters] Created ${spec.matterNumber} — ${spec.title}`);
      created += 1;
    }

    await client.query('COMMIT');
    console.log(`[seed-demo-matters] Done. Created ${created} matter(s), skipped ${skipped} already-existing.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[seed-demo-matters] Failed, rolled back:', error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
