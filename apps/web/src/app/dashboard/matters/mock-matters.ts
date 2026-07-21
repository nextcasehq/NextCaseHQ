/**
 * Synthetic Matter Register dataset for the "Advocate Matter Register Page"
 * prototype milestone. Entirely fictional — no production client records,
 * no database, no real AI calls. Deliberately separate from the real,
 * DB-backed /matters and /matters/[id] workspace (which is unaffected by
 * this milestone) so the full future vision of a Matter Register (linked
 * documents, proceedings chain, timeline, tasks, research, parties,
 * arguments, evidence) can be explored without any production integration.
 */

export type MatterCategory =
  | 'Civil'
  | 'Criminal'
  | 'Writ'
  | 'Appeal'
  | 'Execution'
  | 'Consumer'
  | 'SLP';

export type MatterRegisterStatus = 'Active' | 'Hearing Soon' | 'Awaiting Filing' | 'Closed';

export interface EarlierCaseReference {
  type: string;
  caseNumber: string;
  court: string;
  year: string;
  relationship: string;
  earlierPartyRoles: string;
  currentPartyRoles: string;
}

export interface RepresentationEntry {
  advocateName: string;
  role: string;
  period: string;
  status: 'Active' | 'Previous';
}

export interface MatterDocumentItem {
  id: string;
  title: string;
  type: string;
  date: string;
  status: string;
  relatedProceeding: string;
  reviewStatus: string;
}

export interface ProceedingLink {
  id: string;
  court: string;
  caseNumber: string;
  year: string;
  partyRoles: string;
  status: string;
  relationshipToEarlier: string;
}

/**
 * Categorises timeline entries so a future eCourts integration milestone can
 * write typed events (CNR Linked, eCourts Checked, etc.) without changing
 * this shape. Nothing in this milestone writes those event types yet —
 * existing entries stay 'General' — this is model readiness only.
 */
export type MatterEventType =
  | 'General'
  | 'CNR Linked'
  | 'eCourts Checked'
  | 'No Change Found'
  | 'Hearing Date Updated'
  | 'Stage Updated'
  | 'Court Or Bench Updated'
  | 'Disposal Status Updated'
  | 'Advocate Confirmation Recorded';

export interface TimelineEvent {
  id: string;
  date: string;
  label: string;
  eventType?: MatterEventType;
}

export type ECourtsVerificationStatus =
  | 'Not checked'
  | 'Pending advocate confirmation'
  | 'Advocate confirmed'
  | 'Needs rechecking';

export type ECourtsSyncMode =
  | 'Manual verification'
  | 'Authorised API sync unavailable'
  | 'Authorised API sync pending approval'
  | 'Authorised API sync active';

/**
 * A Matter Register's link to its official eCourts identity. cnrNumber is
 * null until the advocate manually adds one — no automatic lookup, scraping,
 * or CAPTCHA handling exists anywhere in this milestone. officialSourceLink
 * always points at the public eCourts services domain (services.ecourts.gov.in),
 * never a scraped or undocumented endpoint.
 */
export interface ECourtsReference {
  cnrNumber: string | null;
  courtType: string | null;
  courtEstablishment: string | null;
  district: string | null;
  state: string | null;
  /** Case type as used in eCourts' Search by Case Number (e.g. "Civil Suit"). */
  caseType: string | null;
  /** Year of institution, for Search by Case Number. */
  year: string | null;
  /** The case number as entered for Search by Case Number — distinct from
   * MockMatter.caseNumber's full display form (e.g. "214" vs "O.S. No. 214/2024"). */
  searchCaseNumber: string | null;
  officialSourceLink: string;
  lastCheckedAt: string | null;
  lastConfirmedAt: string | null;
  confirmedBy: string | null;
  verificationStatus: ECourtsVerificationStatus;
  synchronisationMode: ECourtsSyncMode;
  /** Fields only ever populated by an advocate-confirmed "Record an update". */
  officialCaseStatus: string | null;
  courtroomOrBench: string | null;
  latestOrderDate: string | null;
  disposalStatus: string | null;
  lastVerificationNote: string | null;
}

export const OFFICIAL_ECOURTS_URL = 'https://services.ecourts.gov.in/ecourtindia_v6/';

/** A CNR is a fixed 16-character alphanumeric identifier. */
export function isValidCnr(value: string): boolean {
  return /^[A-Za-z0-9]{16}$/.test(value.trim());
}

export interface TaskItem {
  id: string;
  title: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue';
  dueDate?: string;
}

export interface ResearchItem {
  id: string;
  caseTitle: string;
  court: string;
  citation: string;
  proposition: string;
  verificationStatus: string;
  advocateNote?: string;
  linkedUse: 'Arguments' | 'Pleadings' | 'Evidence-related legal issue' | 'General reference';
}

export interface PartyItem {
  id: string;
  name: string;
  currentRole: string;
  earlierRole?: string;
  side: 'Represented' | 'Opposing';
  contactPlaceholder: string;
  representationStatus: string;
}

export interface ArgumentsBlock {
  issuesForDetermination: string[];
  keyConfirmedFacts: string[];
  applicableProvisions: string[];
  supportingAuthorities: string[];
  opponentLikelyArguments: string[];
  rebuttalPoints: string[];
  reliefSought: string;
  draftStatus: 'Working draft' | 'Advocate-reviewed' | 'Final advocate-confirmed';
}

export interface EvidenceWitness {
  name: string;
  role: string;
  examinationPrep: string;
  crossExamPrep: string;
}

export interface EvidenceBlock {
  witnesses: EvidenceWitness[];
  documentsAndExhibits: string[];
  factsToProve: string[];
  contradictions: string[];
  missingEvidence: string[];
  proofStatus: 'AI-assisted working draft' | 'Advocate-reviewed' | 'Deponent-confirmed' | 'Final advocate-confirmed';
}

export interface ClosureInfo {
  reason: string;
  disposalDate: string;
  finalOutcome: string;
  pendingObligations: string;
  appealOrReviewStatus: string;
}

export interface MockMatter {
  id: string;
  title: string;
  caseNumber: string;
  court: string;
  representedParty: string;
  opposingParty: string;
  procedureRole: string;
  category: MatterCategory;
  stage: string;
  nextHearingDate: string | null;
  purposeOfNextHearing?: string;
  status: MatterRegisterStatus;
  advocateReferenceNumber: string;
  earlierCaseReference?: EarlierCaseReference;
  currentProceeding: string;
  proceedingRelationship: string;
  lastUpdated: string;
  pendingTaskCount: number;
  ecourtsReference: ECourtsReference;
  representation: RepresentationEntry[];
  documents: MatterDocumentItem[];
  proceedings: ProceedingLink[];
  timeline: TimelineEvent[];
  tasks: TaskItem[];
  research: ResearchItem[];
  parties: PartyItem[];
  arguments: ArgumentsBlock;
  evidence: EvidenceBlock;
  closure?: ClosureInfo;
}

export const SYNTHETIC_DATA_NOTICE = 'Demonstration matters — no production client records.';

export const MOCK_MATTERS: MockMatter[] = [
  {
    id: 'mock-matter-001',
    title: "Rajeshwari Textiles Pvt. Ltd. v. Bansal Traders — Suit for Recovery",
    caseNumber: 'O.S. No. 214/2024',
    court: 'Civil Judge (Senior Division), Pune',
    representedParty: 'Rajeshwari Textiles Pvt. Ltd. (Plaintiff)',
    opposingParty: 'Bansal Traders (Defendant)',
    procedureRole: 'Plaintiff',
    category: 'Civil',
    stage: "Plaintiff's Evidence in Progress",
    nextHearingDate: '2026-08-09',
    purposeOfNextHearing: "Continuation of plaintiff's evidence — examination-in-chief of second witness",
    status: 'Active',
    advocateReferenceNumber: 'ADV/PUN/2024/0088',
    currentProceeding: 'Original Suit — Trial Stage',
    proceedingRelationship: 'Sole proceeding — no earlier or higher forum yet',
    lastUpdated: '2026-07-14',
    pendingTaskCount: 2,
    ecourtsReference: {
      cnrNumber: 'MHPU01D000882024',
      courtType: 'Civil Court',
      courtEstablishment: 'Civil Judge (Senior Division), Pune',
      district: 'Pune',
      state: 'Maharashtra',
      caseType: 'Civil Suit',
      year: '2024',
      searchCaseNumber: '214',
      officialSourceLink: OFFICIAL_ECOURTS_URL,
      lastCheckedAt: '2026-07-14T10:30:00+05:30',
      lastConfirmedAt: '2026-07-14T10:32:00+05:30',
      confirmedBy: 'Adv. Kavita Deshmukh',
      verificationStatus: 'Advocate confirmed',
      synchronisationMode: 'Manual verification',
      officialCaseStatus: 'Pending',
      courtroomOrBench: 'Court Room 4',
      latestOrderDate: '2026-06-18',
      disposalStatus: 'Pending',
      lastVerificationNote: 'Confirmed evidence stage matches the eCourts record.',
    },
    representation: [{ advocateName: 'Adv. Kavita Deshmukh', role: 'Lead Counsel', period: 'Jan 2024 – Present', status: 'Active' }],
    documents: [
      { id: 'doc-1-1', title: 'Plaint', type: 'Pleading', date: '2024-01-18', status: 'Filed', relatedProceeding: 'O.S. No. 214/2024', reviewStatus: 'Advocate-reviewed' },
      { id: 'doc-1-2', title: 'Written Statement (Defendant)', type: 'Pleading', date: '2024-03-05', status: 'Filed', relatedProceeding: 'O.S. No. 214/2024', reviewStatus: 'Advocate-reviewed' },
      { id: 'doc-1-3', title: "Plaintiff's Affidavit of Evidence", type: 'Affidavit', date: '2026-06-02', status: 'Filed', relatedProceeding: 'O.S. No. 214/2024', reviewStatus: 'Advocate-reviewed' },
      { id: 'doc-1-4', title: 'Ledger Correspondence (2022–2023)', type: 'Uploaded correspondence', date: '2026-05-20', status: 'Uploaded', relatedProceeding: 'O.S. No. 214/2024', reviewStatus: 'Pending review' },
    ],
    proceedings: [
      { id: 'proc-1-1', court: 'Civil Judge (Senior Division), Pune', caseNumber: 'O.S. No. 214/2024', year: '2024', partyRoles: 'Rajeshwari Textiles — Plaintiff; Bansal Traders — Defendant', status: 'Pending — Trial Stage', relationshipToEarlier: 'Originating proceeding' },
    ],
    timeline: [
      { id: 'tl-1-1', date: '2024-01-18', label: 'Matter created — plaint drafted and filed' },
      { id: 'tl-1-2', date: '2024-03-05', label: 'Written statement filed by Defendant' },
      { id: 'tl-1-3', date: '2024-09-10', label: 'Issues framed by the court' },
      { id: 'tl-1-4', date: '2026-06-02', label: "Document uploaded — plaintiff's affidavit of evidence" },
      { id: 'tl-1-5', date: '2026-06-18', label: 'Hearing attended — evidence commenced' },
      { id: 'tl-1-6', date: '2026-07-14', label: 'Stage updated — plaintiff\'s evidence in progress' },
    ],
    tasks: [
      { id: 'task-1-1', title: 'Prepare witness list for remaining plaintiff witnesses', status: 'In Progress', dueDate: '2026-08-01' },
      { id: 'task-1-2', title: 'Obtain certified copy of the framed issues order', status: 'Pending', dueDate: '2026-08-05' },
    ],
    research: [
      {
        id: 'res-1-1',
        caseTitle: 'Sharma Exports v. National Logistics Co. (Demo Judgment)',
        court: 'Demo Appellate Court',
        citation: '(2025) Demo LR 002 (Demo Citation)',
        proposition: 'Limitation-period computation for a running-account recovery claim.',
        verificationStatus: 'Unverified — Demonstration Data',
        advocateNote: 'Check applicability to running ledger entries before relying on this in final arguments.',
        linkedUse: 'Arguments',
      },
    ],
    parties: [
      { id: 'party-1-1', name: 'Rajeshwari Textiles Pvt. Ltd.', currentRole: 'Plaintiff', side: 'Represented', contactPlaceholder: 'Contact on file (placeholder)', representationStatus: 'Represented by this office' },
      { id: 'party-1-2', name: 'Bansal Traders', currentRole: 'Defendant', side: 'Opposing', contactPlaceholder: 'Contact on file (placeholder)', representationStatus: 'Represented by opposing counsel' },
    ],
    arguments: {
      issuesForDetermination: ['Whether the outstanding ledger amount is due and payable', 'Whether the claim is within limitation'],
      keyConfirmedFacts: ['Invoices raised between 2022–2023', 'Partial payments acknowledged in correspondence'],
      applicableProvisions: ['Indian Contract Act, 1872 — Section 73 (compensation for breach)'],
      supportingAuthorities: ['Sharma Exports v. National Logistics Co. (Demo Judgment) — see Research / Authorities'],
      opponentLikelyArguments: ['Dispute over quality of goods supplied', 'Claim of set-off for a separate transaction'],
      rebuttalPoints: ['Quality objection not raised at time of delivery', 'No documentary basis shown for set-off'],
      reliefSought: 'Recovery of principal amount with interest and costs',
      draftStatus: 'Working draft',
    },
    evidence: {
      witnesses: [{ name: 'Mr. Anil Rajeshwari (Director)', role: "Plaintiff's witness", examinationPrep: 'Confirm invoice trail and delivery records', crossExamPrep: 'Anticipate questions on partial-payment acknowledgements' }],
      documentsAndExhibits: ['Invoices (Exhibit P-1 to P-14)', 'Delivery challans (Exhibit P-15 to P-20)', 'Ledger correspondence (Exhibit P-21)'],
      factsToProve: ['Goods were delivered as invoiced', 'Amount remains outstanding'],
      contradictions: ['Defendant\'s reply letter (2023) contradicts its written statement on delivery date'],
      missingEvidence: ['Bank statement confirming partial-payment dates'],
      proofStatus: 'Advocate-reviewed',
    },
  },
  {
    id: 'mock-matter-002',
    title: 'State v. Mahendra Kulkarni — Bail Application',
    caseNumber: 'Crl. M.P. No. 1187/2026',
    court: 'Sessions Judge, Nagpur',
    representedParty: 'Mahendra Kulkarni (Accused / Applicant)',
    opposingParty: 'State of Maharashtra (Prosecution)',
    procedureRole: 'Accused / Applicant',
    category: 'Criminal',
    stage: 'Bail Application — Arguments Pending',
    nextHearingDate: '2026-07-22',
    purposeOfNextHearing: 'Arguments on bail application',
    status: 'Hearing Soon',
    advocateReferenceNumber: 'ADV/NGP/2026/0041',
    currentProceeding: 'Bail Application before Sessions Court',
    proceedingRelationship: 'Ancillary application within pending FIR/criminal case',
    lastUpdated: '2026-07-18',
    pendingTaskCount: 3,
    ecourtsReference: {
      cnrNumber: 'MHNG02C001192026',
      courtType: 'Criminal Court',
      courtEstablishment: 'Sessions Judge, Nagpur',
      district: 'Nagpur',
      state: 'Maharashtra',
      caseType: 'Criminal Miscellaneous Petition',
      year: '2026',
      searchCaseNumber: '1187',
      officialSourceLink: OFFICIAL_ECOURTS_URL,
      lastCheckedAt: '2026-07-05T09:00:00+05:30',
      lastConfirmedAt: '2026-07-05T09:05:00+05:30',
      confirmedBy: 'Adv. Suresh Bhonsle',
      verificationStatus: 'Needs rechecking',
      synchronisationMode: 'Manual verification',
      officialCaseStatus: 'Pending',
      courtroomOrBench: 'Court Room 2',
      latestOrderDate: '2026-07-03',
      disposalStatus: 'Pending',
      lastVerificationNote: 'Needs rechecking — last checked before the bail arguments hearing.',
    },
    representation: [{ advocateName: 'Adv. Suresh Bhonsle', role: 'Lead Counsel', period: 'Jul 2026 – Present', status: 'Active' }],
    documents: [
      { id: 'doc-2-1', title: 'Bail Application', type: 'Pleading', date: '2026-07-10', status: 'Filed', relatedProceeding: 'Crl. M.P. No. 1187/2026', reviewStatus: 'Advocate-reviewed' },
      { id: 'doc-2-2', title: 'FIR Copy', type: 'Uploaded correspondence', date: '2026-07-02', status: 'Uploaded', relatedProceeding: 'Underlying FIR', reviewStatus: 'Advocate-reviewed' },
      { id: 'doc-2-3', title: 'Remand Order', type: 'Order', date: '2026-07-03', status: 'Uploaded', relatedProceeding: 'Underlying FIR', reviewStatus: 'Pending review' },
    ],
    proceedings: [
      { id: 'proc-2-1', court: 'Sessions Judge, Nagpur', caseNumber: 'Crl. M.P. No. 1187/2026', year: '2026', partyRoles: 'Mahendra Kulkarni — Accused/Applicant; State — Prosecution', status: 'Pending — Arguments Stage', relationshipToEarlier: 'Ancillary to the pending FIR' },
    ],
    timeline: [
      { id: 'tl-2-1', date: '2026-07-02', label: 'Matter created — FIR copy uploaded' },
      { id: 'tl-2-2', date: '2026-07-03', label: 'Hearing attended — remand order passed' },
      { id: 'tl-2-3', date: '2026-07-10', label: 'Document uploaded — bail application filed' },
      { id: 'tl-2-4', date: '2026-07-18', label: 'Next hearing recorded — arguments on bail application' },
    ],
    tasks: [
      { id: 'task-2-1', title: 'Obtain certified copy of the remand order', status: 'Overdue', dueDate: '2026-07-15' },
      { id: 'task-2-2', title: 'Confirm witness (surety) availability', status: 'In Progress', dueDate: '2026-07-21' },
      { id: 'task-2-3', title: 'Review evidence affidavit from investigating officer', status: 'Pending', dueDate: '2026-07-21' },
    ],
    research: [
      {
        id: 'res-2-1',
        caseTitle: 'AIR 2021 SC 123 (Demo Citation)',
        court: 'Demo Supreme Court',
        citation: 'AIR 2021 SC 123 (Demo Citation)',
        proposition: 'Sample proposition on limitation and condonation of delay — being checked for bail-parity relevance.',
        verificationStatus: 'Unverified — Demonstration Data',
        linkedUse: 'General reference',
      },
    ],
    parties: [
      { id: 'party-2-1', name: 'Mahendra Kulkarni', currentRole: 'Accused / Applicant', side: 'Represented', contactPlaceholder: 'Contact on file (placeholder)', representationStatus: 'Represented by this office' },
      { id: 'party-2-2', name: 'State of Maharashtra', currentRole: 'Prosecution', side: 'Opposing', contactPlaceholder: 'Public Prosecutor\'s office (placeholder)', representationStatus: 'Represented by Public Prosecutor' },
    ],
    arguments: {
      issuesForDetermination: ['Whether custodial interrogation is still required', 'Whether flight risk or evidence-tampering risk exists'],
      keyConfirmedFacts: ['Applicant has a fixed local address and no prior record', 'Investigation substantially complete'],
      applicableProvisions: ['Bharatiya Nagarik Suraksha Sanhita — bail provisions (parity with co-accused)'],
      supportingAuthorities: ['AIR 2021 SC 123 (Demo Citation) — see Research / Authorities'],
      opponentLikelyArguments: ['Seriousness of the alleged offence', 'Possibility of influencing witnesses'],
      rebuttalPoints: ['No overt act of witness tampering shown', 'Co-accused already granted bail on similar facts'],
      reliefSought: 'Grant of regular bail with reasonable conditions',
      draftStatus: 'Working draft',
    },
    evidence: {
      witnesses: [{ name: 'Proposed Surety — Mr. Ravindra Kulkarni', role: 'Surety', examinationPrep: 'Confirm relationship and address verification documents', crossExamPrep: 'Not applicable at bail stage' }],
      documentsAndExhibits: ['FIR copy', 'Remand order', 'Address proof of proposed surety'],
      factsToProve: ['Fixed residence and community ties', 'Cooperation with investigation so far'],
      contradictions: ['Prosecution\'s remand application timeline differs from FIR-recorded time of arrest'],
      missingEvidence: ['Surety\'s income/property documents (awaited)'],
      proofStatus: 'AI-assisted working draft',
    },
  },
  {
    id: 'mock-matter-003',
    title: 'Ananya Devi v. State of Uttar Pradesh & Ors. — Writ Petition (Service Matter)',
    caseNumber: 'W.P. No. 8823/2025',
    court: 'High Court of Judicature at Allahabad',
    representedParty: 'Ananya Devi (Petitioner)',
    opposingParty: 'State of Uttar Pradesh & Ors. (Respondents)',
    procedureRole: 'Petitioner',
    category: 'Writ',
    stage: 'Awaiting Counter Affidavit',
    nextHearingDate: '2026-08-04',
    purposeOfNextHearing: 'Status of counter affidavit; further directions',
    status: 'Active',
    advocateReferenceNumber: 'ADV/ALD/2025/0129',
    currentProceeding: 'Writ Petition — Article 226',
    proceedingRelationship: 'Sole proceeding — direct writ jurisdiction, no earlier forum',
    lastUpdated: '2026-07-10',
    pendingTaskCount: 1,
    ecourtsReference: {
      cnrNumber: 'UPAL03W008822025',
      courtType: 'High Court',
      courtEstablishment: 'High Court of Judicature at Allahabad',
      district: 'Allahabad (Prayagraj)',
      state: 'Uttar Pradesh',
      caseType: 'Writ Petition',
      year: '2025',
      searchCaseNumber: '8823',
      officialSourceLink: OFFICIAL_ECOURTS_URL,
      lastCheckedAt: '2026-07-10T11:15:00+05:30',
      lastConfirmedAt: null,
      confirmedBy: null,
      verificationStatus: 'Pending advocate confirmation',
      synchronisationMode: 'Manual verification',
      officialCaseStatus: 'Pending',
      courtroomOrBench: 'Court No. 34',
      latestOrderDate: '2025-12-08',
      disposalStatus: 'Pending',
      lastVerificationNote: 'Checked once; advocate confirmation still pending.',
    },
    representation: [{ advocateName: 'Adv. Prashant Tiwari', role: 'Lead Counsel', period: 'Nov 2025 – Present', status: 'Active' }],
    documents: [
      { id: 'doc-3-1', title: 'Writ Petition', type: 'Pleading', date: '2025-11-20', status: 'Filed', relatedProceeding: 'W.P. No. 8823/2025', reviewStatus: 'Advocate-reviewed' },
      { id: 'doc-3-2', title: 'Interim Order (Notice Issued)', type: 'Order', date: '2025-12-08', status: 'Uploaded', relatedProceeding: 'W.P. No. 8823/2025', reviewStatus: 'Advocate-reviewed' },
    ],
    proceedings: [
      { id: 'proc-3-1', court: 'High Court of Judicature at Allahabad', caseNumber: 'W.P. No. 8823/2025', year: '2025', partyRoles: 'Ananya Devi — Petitioner; State of U.P. — Respondent', status: 'Pending — Notice Stage', relationshipToEarlier: 'Originating writ proceeding' },
    ],
    timeline: [
      { id: 'tl-3-1', date: '2025-11-20', label: 'Matter created — writ petition filed' },
      { id: 'tl-3-2', date: '2025-12-08', label: 'Hearing attended — notice issued to respondents' },
      { id: 'tl-3-3', date: '2026-07-10', label: 'Next hearing recorded — status of counter affidavit' },
    ],
    tasks: [{ id: 'task-3-1', title: 'File rejoinder once counter affidavit is received', status: 'Pending', dueDate: '2026-08-10' }],
    research: [],
    parties: [
      { id: 'party-3-1', name: 'Ananya Devi', currentRole: 'Petitioner', side: 'Represented', contactPlaceholder: 'Contact on file (placeholder)', representationStatus: 'Represented by this office' },
      { id: 'party-3-2', name: 'State of Uttar Pradesh & Ors.', currentRole: 'Respondent', side: 'Opposing', contactPlaceholder: 'Government Advocate\'s office (placeholder)', representationStatus: 'Represented by Government Advocate' },
    ],
    arguments: {
      issuesForDetermination: ['Whether the impugned transfer order violates the applicable service rules'],
      keyConfirmedFacts: ['Transfer order issued mid-academic-year without recorded reasons'],
      applicableProvisions: ['Constitution of India — Article 226', 'Applicable state service rules on transfer'],
      supportingAuthorities: [],
      opponentLikelyArguments: ['Transfer is an administrative matter within management discretion'],
      rebuttalPoints: ['Discretion must still follow the recorded-reasons requirement in the service rules'],
      reliefSought: 'Quashing of the transfer order and consequential relief',
      draftStatus: 'Working draft',
    },
    evidence: {
      witnesses: [],
      documentsAndExhibits: ['Transfer order', 'Service record extract'],
      factsToProve: ['No reasons were recorded for the mid-year transfer'],
      contradictions: [],
      missingEvidence: ['Departmental transfer policy circular (not yet obtained)'],
      proofStatus: 'Advocate-reviewed',
    },
  },
  {
    id: 'mock-matter-004',
    title: 'Dinesh Prasad v. Rekha Singh — First Appeal (Partition Suit)',
    caseNumber: 'F.A. No. 442/2026',
    court: 'High Court of Judicature at Patna',
    representedParty: 'Dinesh Prasad (Appellant)',
    opposingParty: 'Rekha Singh (Respondent)',
    procedureRole: 'Appellant (was Defendant No. 1 at trial)',
    category: 'Appeal',
    stage: 'Admission — Notice Issued to Respondent',
    nextHearingDate: '2026-07-30',
    purposeOfNextHearing: "Respondent's appearance and admission hearing",
    status: 'Active',
    advocateReferenceNumber: 'ADV/PAT/2026/0067',
    earlierCaseReference: {
      type: 'Trial Court Judgment and Decree',
      caseNumber: 'O.S. No. 76/2019',
      court: 'Civil Judge (Senior Division), Patna',
      year: '2019 (decree passed 2025)',
      relationship: "Appeal filed against the trial court's decree",
      earlierPartyRoles: 'Dinesh Prasad was Defendant No. 1; Rekha Singh was Plaintiff',
      currentPartyRoles: 'Dinesh Prasad is now Appellant; Rekha Singh is now Respondent',
    },
    currentProceeding: 'First Appeal — Admission Stage',
    proceedingRelationship: "Appeal against the trial court's decree — does not overwrite the trial record",
    lastUpdated: '2026-07-12',
    pendingTaskCount: 2,
    ecourtsReference: {
      cnrNumber: 'BRPA04F004422026',
      courtType: 'High Court',
      courtEstablishment: 'High Court of Judicature at Patna',
      district: 'Patna',
      state: 'Bihar',
      caseType: 'First Appeal',
      year: '2026',
      searchCaseNumber: '442',
      officialSourceLink: OFFICIAL_ECOURTS_URL,
      lastCheckedAt: null,
      lastConfirmedAt: null,
      confirmedBy: null,
      verificationStatus: 'Not checked',
      synchronisationMode: 'Authorised API sync unavailable',
      officialCaseStatus: null,
      courtroomOrBench: null,
      latestOrderDate: null,
      disposalStatus: null,
      lastVerificationNote: null,
    },
    representation: [
      { advocateName: 'Adv. Vinod Sinha', role: 'Trial Counsel', period: '2019 – 2025', status: 'Previous' },
      { advocateName: 'Adv. Neha Choudhary', role: 'Appellate Counsel', period: '2026 – Present', status: 'Active' },
    ],
    documents: [
      { id: 'doc-4-1', title: 'Trial Court Judgment and Decree', type: 'Order', date: '2025-04-22', status: 'Filed', relatedProceeding: 'O.S. No. 76/2019', reviewStatus: 'Advocate-reviewed' },
      { id: 'doc-4-2', title: 'Memorandum of Appeal', type: 'Pleading', date: '2026-06-15', status: 'Filed', relatedProceeding: 'F.A. No. 442/2026', reviewStatus: 'Advocate-reviewed' },
      { id: 'doc-4-3', title: 'Notice to Respondent', type: 'Notice', date: '2026-06-30', status: 'Served', relatedProceeding: 'F.A. No. 442/2026', reviewStatus: 'Advocate-reviewed' },
    ],
    proceedings: [
      { id: 'proc-4-1', court: 'Civil Judge (Senior Division), Patna', caseNumber: 'O.S. No. 76/2019', year: '2019', partyRoles: 'Dinesh Prasad — Defendant No. 1; Rekha Singh — Plaintiff', status: 'Disposed — Decree against Defendant No. 1', relationshipToEarlier: 'Originating trial proceeding' },
      { id: 'proc-4-2', court: 'High Court of Judicature at Patna', caseNumber: 'F.A. No. 442/2026', year: '2026', partyRoles: 'Dinesh Prasad — Appellant; Rekha Singh — Respondent', status: 'Pending — Admission Stage', relationshipToEarlier: 'First appeal against the O.S. No. 76/2019 decree' },
    ],
    timeline: [
      { id: 'tl-4-1', date: '2019-06-01', label: 'Matter created — original suit instituted at trial court' },
      { id: 'tl-4-2', date: '2025-04-22', label: 'Trial court judgment and decree passed against Defendant No. 1' },
      { id: 'tl-4-3', date: '2026-06-15', label: 'Document uploaded — memorandum of appeal filed' },
      { id: 'tl-4-4', date: '2026-06-30', label: 'Stage updated — notice issued to respondent' },
      { id: 'tl-4-5', date: '2026-07-12', label: 'Next hearing recorded — admission hearing' },
    ],
    tasks: [
      { id: 'task-4-1', title: 'Prepare written arguments for admission hearing', status: 'In Progress', dueDate: '2026-07-28' },
      { id: 'task-4-2', title: 'Obtain certified copy of the trial court decree', status: 'Completed' },
    ],
    research: [
      {
        id: 'res-4-1',
        caseTitle: 'Acme Textiles Pvt. Ltd. v. R96 Global Traders (Demo Judgment)',
        court: 'Demo Commercial Court',
        citation: '(2025) Demo LR 001 (Demo Citation)',
        proposition: 'Adverse inference for non-disclosure — being reviewed for applicability to the partition valuation dispute.',
        verificationStatus: 'Unverified — Demonstration Data',
        advocateNote: 'Verify facts align before use — trial record differs on valuation date.',
        linkedUse: 'Arguments',
      },
    ],
    parties: [
      { id: 'party-4-1', name: 'Dinesh Prasad', currentRole: 'Appellant', earlierRole: 'Defendant No. 1', side: 'Represented', contactPlaceholder: 'Contact on file (placeholder)', representationStatus: 'Represented by this office' },
      { id: 'party-4-2', name: 'Rekha Singh', currentRole: 'Respondent', earlierRole: 'Plaintiff', side: 'Opposing', contactPlaceholder: 'Contact on file (placeholder)', representationStatus: 'Represented by opposing counsel' },
    ],
    arguments: {
      issuesForDetermination: ['Whether the trial court correctly valued the joint family property', 'Whether all co-sharers were properly impleaded'],
      keyConfirmedFacts: ['Property valuation report predates the final partition schedule'],
      applicableProvisions: ['Code of Civil Procedure — Order XX Rule 18 (partition decrees)'],
      supportingAuthorities: ['Acme Textiles Pvt. Ltd. v. R96 Global Traders (Demo Judgment) — see Research / Authorities'],
      opponentLikelyArguments: ['Valuation report was accepted without objection at trial'],
      rebuttalPoints: ['Objection was in fact raised but not recorded in the trial court order'],
      reliefSought: 'Setting aside the decree and remand for fresh valuation',
      draftStatus: 'Working draft',
    },
    evidence: {
      witnesses: [],
      documentsAndExhibits: ['Trial court valuation report', 'Objection memo filed at trial (Exhibit D-9)'],
      factsToProve: ['Objection to valuation was formally recorded at trial'],
      contradictions: ['Trial court order does not mention the objection memo on record'],
      missingEvidence: ['Certified trial-stage order-sheet extract confirming the objection was filed'],
      proofStatus: 'Advocate-reviewed',
    },
  },
  {
    id: 'mock-matter-005',
    title: 'Coastal Fisheries Cooperative Ltd. v. Union of India — Special Leave Petition',
    caseNumber: 'SLP (Civil) — Diary No. 55210/2026 (yet to be numbered)',
    court: 'Supreme Court of India',
    representedParty: 'Coastal Fisheries Cooperative Ltd. (Petitioner)',
    opposingParty: 'Union of India & Ors. (Respondents)',
    procedureRole: 'Petitioner',
    category: 'SLP',
    stage: 'Drafting — SLP Not Yet Filed',
    nextHearingDate: null,
    status: 'Awaiting Filing',
    advocateReferenceNumber: 'ADV/SC/2026/0015',
    earlierCaseReference: {
      type: 'High Court Judgment',
      caseNumber: 'W.A. No. 990/2025',
      court: 'High Court of Kerala',
      year: '2025',
      relationship: "SLP proposed against the High Court's dismissal of the writ appeal",
      earlierPartyRoles: 'Coastal Fisheries Cooperative Ltd. — Appellant; Union of India — Respondent',
      currentPartyRoles: 'Coastal Fisheries Cooperative Ltd. — Petitioner; Union of India — Respondent',
    },
    currentProceeding: 'Special Leave Petition — Pre-filing',
    proceedingRelationship: "Proposed appeal against the High Court's final order",
    lastUpdated: '2026-07-16',
    pendingTaskCount: 2,
    ecourtsReference: {
      cnrNumber: null,
      courtType: 'Supreme Court',
      courtEstablishment: 'Supreme Court of India',
      district: null,
      state: null,
      caseType: 'Special Leave Petition',
      year: null,
      searchCaseNumber: null,
      officialSourceLink: OFFICIAL_ECOURTS_URL,
      lastCheckedAt: null,
      lastConfirmedAt: null,
      confirmedBy: null,
      verificationStatus: 'Not checked',
      synchronisationMode: 'Manual verification',
      officialCaseStatus: null,
      courtroomOrBench: null,
      latestOrderDate: null,
      disposalStatus: null,
      lastVerificationNote: null,
    },
    representation: [{ advocateName: 'Adv. Meenakshi Pillai', role: 'Advocate-on-Record (proposed)', period: '2026 – Present', status: 'Active' }],
    documents: [
      { id: 'doc-5-1', title: 'High Court Judgment (Writ Appeal)', type: 'Order', date: '2025-12-11', status: 'Filed', relatedProceeding: 'W.A. No. 990/2025', reviewStatus: 'Advocate-reviewed' },
      { id: 'doc-5-2', title: 'Draft SLP and Grounds', type: 'Written arguments', date: '2026-07-16', status: 'Draft', relatedProceeding: 'SLP (Civil) — Diary No. 55210/2026', reviewStatus: 'Pending review' },
    ],
    proceedings: [
      { id: 'proc-5-1', court: 'High Court of Kerala', caseNumber: 'W.A. No. 990/2025', year: '2025', partyRoles: 'Coastal Fisheries Cooperative Ltd. — Appellant; Union of India — Respondent', status: 'Disposed — Writ Appeal Dismissed', relationshipToEarlier: 'Originating writ appeal' },
      { id: 'proc-5-2', court: 'Supreme Court of India', caseNumber: 'SLP (Civil) — Diary No. 55210/2026', year: '2026', partyRoles: 'Coastal Fisheries Cooperative Ltd. — Petitioner; Union of India — Respondent', status: 'Not yet filed — drafting stage', relationshipToEarlier: 'Proposed SLP against the High Court dismissal' },
    ],
    timeline: [
      { id: 'tl-5-1', date: '2025-12-11', label: 'Matter created — High Court dismissal received' },
      { id: 'tl-5-2', date: '2026-07-16', label: 'Document uploaded — draft SLP and grounds' },
    ],
    tasks: [
      { id: 'task-5-1', title: 'Finalise grounds and file SLP within limitation', status: 'In Progress', dueDate: '2026-08-25' },
      { id: 'task-5-2', title: 'Obtain certified copy of the High Court judgment', status: 'Completed' },
    ],
    research: [],
    parties: [
      { id: 'party-5-1', name: 'Coastal Fisheries Cooperative Ltd.', currentRole: 'Petitioner', earlierRole: 'Appellant (High Court)', side: 'Represented', contactPlaceholder: 'Contact on file (placeholder)', representationStatus: 'Represented by this office' },
      { id: 'party-5-2', name: 'Union of India & Ors.', currentRole: 'Respondent', side: 'Opposing', contactPlaceholder: 'Central Government Standing Counsel (placeholder)', representationStatus: 'Represented by Standing Counsel' },
    ],
    arguments: {
      issuesForDetermination: ['Whether the High Court erred in declining to examine the licensing policy challenge on merits'],
      keyConfirmedFacts: ['Licensing policy applied retrospectively to the cooperative\'s existing permits'],
      applicableProvisions: ['Constitution of India — Article 136'],
      supportingAuthorities: [],
      opponentLikelyArguments: ['Policy matters are not ordinarily amenable to SLP interference'],
      rebuttalPoints: ['Retrospective application raises a substantial question of law warranting interference'],
      reliefSought: 'Grant of special leave and setting aside the High Court order',
      draftStatus: 'Working draft',
    },
    evidence: {
      witnesses: [],
      documentsAndExhibits: ['Licensing policy notification', 'High Court judgment'],
      factsToProve: ['Policy was applied retrospectively to permits issued before the notification'],
      contradictions: [],
      missingEvidence: ['Official gazette copy of the original licensing policy (pre-amendment)'],
      proofStatus: 'AI-assisted working draft',
    },
  },
  {
    id: 'mock-matter-006',
    title: 'Suresh Nair v. Horizon Builders Pvt. Ltd. — Consumer Complaint (Delayed Possession)',
    caseNumber: 'CC No. 331/2025',
    court: 'District Consumer Disputes Redressal Commission, Ernakulam',
    representedParty: 'Suresh Nair (Complainant)',
    opposingParty: 'Horizon Builders Pvt. Ltd. (Opposite Party)',
    procedureRole: 'Complainant',
    category: 'Consumer',
    stage: "Evidence by Affidavit — Opposite Party's Reply Awaited",
    nextHearingDate: '2026-07-23',
    purposeOfNextHearing: "Filing of Opposite Party's evidence affidavit",
    status: 'Hearing Soon',
    advocateReferenceNumber: 'ADV/EKM/2025/0203',
    currentProceeding: 'Consumer Complaint — Evidence Stage',
    proceedingRelationship: 'Sole proceeding before the District Commission',
    lastUpdated: '2026-07-17',
    pendingTaskCount: 1,
    ecourtsReference: {
      cnrNumber: null,
      courtType: 'Consumer Commission',
      courtEstablishment: 'District Consumer Disputes Redressal Commission, Ernakulam',
      district: 'Ernakulam',
      state: 'Kerala',
      caseType: 'Consumer Complaint',
      year: '2025',
      searchCaseNumber: '331',
      officialSourceLink: OFFICIAL_ECOURTS_URL,
      lastCheckedAt: null,
      lastConfirmedAt: null,
      confirmedBy: null,
      verificationStatus: 'Not checked',
      synchronisationMode: 'Manual verification',
      officialCaseStatus: null,
      courtroomOrBench: null,
      latestOrderDate: null,
      disposalStatus: null,
      lastVerificationNote: null,
    },
    representation: [{ advocateName: 'Adv. Lakshmi Menon', role: 'Lead Counsel', period: 'Aug 2025 – Present', status: 'Active' }],
    documents: [
      { id: 'doc-6-1', title: 'Consumer Complaint', type: 'Pleading', date: '2025-08-14', status: 'Filed', relatedProceeding: 'CC No. 331/2025', reviewStatus: 'Advocate-reviewed' },
      { id: 'doc-6-2', title: "Complainant's Evidence Affidavit", type: 'Evidence affidavit', date: '2026-05-30', status: 'Filed', relatedProceeding: 'CC No. 331/2025', reviewStatus: 'Advocate-reviewed' },
      { id: 'doc-6-3', title: 'Builder-Buyer Agreement', type: 'Uploaded correspondence', date: '2025-08-14', status: 'Uploaded', relatedProceeding: 'CC No. 331/2025', reviewStatus: 'Advocate-reviewed' },
    ],
    proceedings: [
      { id: 'proc-6-1', court: 'District Consumer Disputes Redressal Commission, Ernakulam', caseNumber: 'CC No. 331/2025', year: '2025', partyRoles: 'Suresh Nair — Complainant; Horizon Builders — Opposite Party', status: 'Pending — Evidence Stage', relationshipToEarlier: 'Originating complaint' },
    ],
    timeline: [
      { id: 'tl-6-1', date: '2025-08-14', label: 'Matter created — consumer complaint filed' },
      { id: 'tl-6-2', date: '2026-05-30', label: "Document uploaded — complainant's evidence affidavit" },
      { id: 'tl-6-3', date: '2026-07-17', label: "Next hearing recorded — opposite party's evidence affidavit due" },
    ],
    tasks: [{ id: 'task-6-1', title: "Review Opposite Party's evidence affidavit once filed", status: 'Pending', dueDate: '2026-07-24' }],
    research: [
      {
        id: 'res-6-1',
        caseTitle: 'Section 73 — Compensation for Loss or Damage (Demo Reference)',
        court: 'Indian Contract Act, 1872 (statutory reference)',
        citation: 'Section 73, Indian Contract Act, 1872 (Demo Reference)',
        proposition: 'Measure of compensation for delay-related loss — relevant to possession-delay compensation claims.',
        verificationStatus: 'Unverified — Demonstration Data',
        linkedUse: 'Pleadings',
      },
    ],
    parties: [
      { id: 'party-6-1', name: 'Suresh Nair', currentRole: 'Complainant', side: 'Represented', contactPlaceholder: 'Contact on file (placeholder)', representationStatus: 'Represented by this office' },
      { id: 'party-6-2', name: 'Horizon Builders Pvt. Ltd.', currentRole: 'Opposite Party', side: 'Opposing', contactPlaceholder: 'Contact on file (placeholder)', representationStatus: 'Represented by opposing counsel' },
    ],
    arguments: {
      issuesForDetermination: ['Whether possession was delayed beyond the agreed timeline without justification'],
      keyConfirmedFacts: ['Agreement specified possession within 36 months; possession still not handed over after 54 months'],
      applicableProvisions: ['Consumer Protection Act, 2019', 'Indian Contract Act, 1872 — Section 73'],
      supportingAuthorities: [],
      opponentLikelyArguments: ['Delay attributable to regulatory approvals beyond builder\'s control'],
      rebuttalPoints: ['Approval delays were foreseeable and not disclosed at the time of booking'],
      reliefSought: 'Possession with compensation for delay, or refund with interest',
      draftStatus: 'Advocate-reviewed',
    },
    evidence: {
      witnesses: [{ name: 'Mr. Suresh Nair (Complainant)', role: 'Complainant', examinationPrep: 'Confirm timeline of payments and correspondence with builder', crossExamPrep: 'Anticipate questions on acceptance of revised handover dates' }],
      documentsAndExhibits: ['Builder-buyer agreement', 'Payment receipts', 'Delay-notice correspondence'],
      factsToProve: ['Agreed possession date', 'No valid force-majeure notice was issued in time'],
      contradictions: [],
      missingEvidence: ['RERA project registration extract (not yet obtained)'],
      proofStatus: 'Advocate-reviewed',
    },
  },
  {
    id: 'mock-matter-007',
    title: 'Meera Kapoor v. Ashok Verma — Execution Petition (Money Decree)',
    caseNumber: 'Ex. P. No. 58/2026',
    court: 'Civil Judge (Junior Division), Jaipur',
    representedParty: 'Meera Kapoor (Decree Holder)',
    opposingParty: 'Ashok Verma (Judgment Debtor)',
    procedureRole: 'Decree Holder',
    category: 'Execution',
    stage: 'Execution — Notice under Order XXI Rule 22 CPC Issued',
    nextHearingDate: '2026-08-19',
    purposeOfNextHearing: "Judgment debtor's appearance on execution notice",
    status: 'Active',
    advocateReferenceNumber: 'ADV/JAI/2026/0074',
    earlierCaseReference: {
      type: 'Money Suit Decree',
      caseNumber: 'O.S. No. 129/2022',
      court: 'Civil Judge (Junior Division), Jaipur (same court, trial side)',
      year: '2022 (decreed 2025)',
      relationship: 'Execution of the trial court money decree',
      earlierPartyRoles: 'Meera Kapoor — Plaintiff; Ashok Verma — Defendant',
      currentPartyRoles: 'Meera Kapoor — Decree Holder; Ashok Verma — Judgment Debtor',
    },
    currentProceeding: 'Execution Petition',
    proceedingRelationship: "Continuation of the same legal history as the original money suit decree",
    lastUpdated: '2026-07-11',
    pendingTaskCount: 1,
    ecourtsReference: {
      cnrNumber: 'RJJP07E000582026',
      courtType: 'Civil Court',
      courtEstablishment: 'Civil Judge (Junior Division), Jaipur',
      district: 'Jaipur',
      state: 'Rajasthan',
      caseType: 'Execution Petition',
      year: '2026',
      searchCaseNumber: '58',
      officialSourceLink: OFFICIAL_ECOURTS_URL,
      lastCheckedAt: null,
      lastConfirmedAt: null,
      confirmedBy: null,
      verificationStatus: 'Not checked',
      synchronisationMode: 'Manual verification',
      officialCaseStatus: null,
      courtroomOrBench: null,
      latestOrderDate: null,
      disposalStatus: null,
      lastVerificationNote: null,
    },
    representation: [{ advocateName: 'Adv. Rohit Agarwal', role: 'Lead Counsel', period: '2022 – Present', status: 'Active' }],
    documents: [
      { id: 'doc-7-1', title: 'Money Decree', type: 'Order', date: '2025-02-19', status: 'Filed', relatedProceeding: 'O.S. No. 129/2022', reviewStatus: 'Advocate-reviewed' },
      { id: 'doc-7-2', title: 'Execution Petition', type: 'Pleading', date: '2026-05-02', status: 'Filed', relatedProceeding: 'Ex. P. No. 58/2026', reviewStatus: 'Advocate-reviewed' },
      { id: 'doc-7-3', title: 'Notice under Order XXI Rule 22 CPC', type: 'Notice', date: '2026-06-20', status: 'Served', relatedProceeding: 'Ex. P. No. 58/2026', reviewStatus: 'Advocate-reviewed' },
    ],
    proceedings: [
      { id: 'proc-7-1', court: 'Civil Judge (Junior Division), Jaipur', caseNumber: 'O.S. No. 129/2022', year: '2022', partyRoles: 'Meera Kapoor — Plaintiff; Ashok Verma — Defendant', status: 'Disposed — Money Decree Passed', relationshipToEarlier: 'Originating money suit' },
      { id: 'proc-7-2', court: 'Civil Judge (Junior Division), Jaipur', caseNumber: 'Ex. P. No. 58/2026', year: '2026', partyRoles: 'Meera Kapoor — Decree Holder; Ashok Verma — Judgment Debtor', status: 'Pending — Notice Stage', relationshipToEarlier: 'Execution of the O.S. No. 129/2022 decree' },
    ],
    timeline: [
      { id: 'tl-7-1', date: '2022-04-11', label: 'Matter created — original money suit instituted' },
      { id: 'tl-7-2', date: '2025-02-19', label: 'Hearing attended — money decree passed' },
      { id: 'tl-7-3', date: '2026-05-02', label: 'Document uploaded — execution petition filed' },
      { id: 'tl-7-4', date: '2026-06-20', label: 'Stage updated — execution notice served' },
    ],
    tasks: [{ id: 'task-7-1', title: 'Prepare application for attachment if debtor does not appear', status: 'Pending', dueDate: '2026-08-20' }],
    research: [],
    parties: [
      { id: 'party-7-1', name: 'Meera Kapoor', currentRole: 'Decree Holder', earlierRole: 'Plaintiff', side: 'Represented', contactPlaceholder: 'Contact on file (placeholder)', representationStatus: 'Represented by this office' },
      { id: 'party-7-2', name: 'Ashok Verma', currentRole: 'Judgment Debtor', earlierRole: 'Defendant', side: 'Opposing', contactPlaceholder: 'Contact on file (placeholder)', representationStatus: 'Not currently represented (unresponsive to notice)' },
    ],
    arguments: {
      issuesForDetermination: ['Whether the judgment debtor holds attachable property within jurisdiction'],
      keyConfirmedFacts: ['Judgment debtor has not appeared despite service of notice'],
      applicableProvisions: ['Code of Civil Procedure — Order XXI (execution of decrees)'],
      supportingAuthorities: [],
      opponentLikelyArguments: ['Likely to claim inability to pay or seek installments'],
      rebuttalPoints: ['No application for installments has been filed to date'],
      reliefSought: 'Attachment and sale of identified property in execution of the decree',
      draftStatus: 'Working draft',
    },
    evidence: {
      witnesses: [],
      documentsAndExhibits: ['Money decree', 'Property search report (pending)'],
      factsToProve: ['Judgment debtor owns identifiable attachable property'],
      contradictions: [],
      missingEvidence: ['Updated property/encumbrance search report'],
      proofStatus: 'Advocate-reviewed',
    },
  },
  {
    id: 'mock-matter-008',
    title: 'Fatima Sheikh v. Green Valley Housing Society — Settled Dispute (Maintenance Charges)',
    caseNumber: 'O.S. No. 55/2023 (Disposed)',
    court: 'Civil Judge (Junior Division), Bengaluru',
    representedParty: 'Fatima Sheikh (Plaintiff)',
    opposingParty: 'Green Valley Housing Society (Defendant)',
    procedureRole: 'Plaintiff',
    category: 'Civil',
    stage: 'Disposed — Settled',
    nextHearingDate: null,
    status: 'Closed',
    advocateReferenceNumber: 'ADV/BLR/2023/0057',
    currentProceeding: 'Original Suit — Disposed',
    proceedingRelationship: 'Sole proceeding — concluded by mediated settlement',
    lastUpdated: '2025-09-12',
    pendingTaskCount: 0,
    ecourtsReference: {
      cnrNumber: 'KABL08C000552023',
      courtType: 'Civil Court',
      courtEstablishment: 'Civil Judge (Junior Division), Bengaluru',
      district: 'Bengaluru',
      state: 'Karnataka',
      caseType: 'Civil Suit',
      year: '2023',
      searchCaseNumber: '55',
      officialSourceLink: OFFICIAL_ECOURTS_URL,
      lastCheckedAt: '2025-09-12T16:00:00+05:30',
      lastConfirmedAt: '2025-09-12T16:05:00+05:30',
      confirmedBy: 'Adv. Priya Ramachandran',
      verificationStatus: 'Advocate confirmed',
      synchronisationMode: 'Manual verification',
      officialCaseStatus: 'Disposed',
      courtroomOrBench: 'Court Room 1',
      latestOrderDate: '2025-09-12',
      disposalStatus: 'Disposed — Settled',
      lastVerificationNote: 'Confirmed disposal and settlement terms against the eCourts record.',
    },
    representation: [{ advocateName: 'Adv. Priya Ramachandran', role: 'Lead Counsel', period: '2023 – 2025', status: 'Previous' }],
    documents: [
      { id: 'doc-8-1', title: 'Plaint', type: 'Pleading', date: '2023-03-02', status: 'Filed', relatedProceeding: 'O.S. No. 55/2023', reviewStatus: 'Advocate-reviewed' },
      { id: 'doc-8-2', title: 'Mediated Settlement Agreement', type: 'Order', date: '2025-09-10', status: 'Filed', relatedProceeding: 'O.S. No. 55/2023', reviewStatus: 'Advocate-reviewed' },
      { id: 'doc-8-3', title: 'Consent Decree', type: 'Order', date: '2025-09-12', status: 'Filed', relatedProceeding: 'O.S. No. 55/2023', reviewStatus: 'Advocate-reviewed' },
    ],
    proceedings: [
      { id: 'proc-8-1', court: 'Civil Judge (Junior Division), Bengaluru', caseNumber: 'O.S. No. 55/2023', year: '2023', partyRoles: 'Fatima Sheikh — Plaintiff; Green Valley Housing Society — Defendant', status: 'Disposed — Settled', relationshipToEarlier: 'Originating and concluding proceeding' },
    ],
    timeline: [
      { id: 'tl-8-1', date: '2023-03-02', label: 'Matter created — suit filed for disputed maintenance charges' },
      { id: 'tl-8-2', date: '2024-11-15', label: 'Hearing attended — parties referred to mediation' },
      { id: 'tl-8-3', date: '2025-09-10', label: 'Argument draft confirmed — settlement terms finalised' },
      { id: 'tl-8-4', date: '2025-09-12', label: 'Stage updated — consent decree recorded, matter disposed' },
    ],
    tasks: [],
    research: [],
    parties: [
      { id: 'party-8-1', name: 'Fatima Sheikh', currentRole: 'Plaintiff', side: 'Represented', contactPlaceholder: 'Contact on file (placeholder)', representationStatus: 'Representation concluded on disposal' },
      { id: 'party-8-2', name: 'Green Valley Housing Society', currentRole: 'Defendant', side: 'Opposing', contactPlaceholder: 'Contact on file (placeholder)', representationStatus: 'Represented by opposing counsel (concluded)' },
    ],
    arguments: {
      issuesForDetermination: ['Resolved by settlement — no issues remain for adjudication'],
      keyConfirmedFacts: ['Parties agreed to a revised maintenance-charge schedule and arrears repayment'],
      applicableProvisions: [],
      supportingAuthorities: [],
      opponentLikelyArguments: [],
      rebuttalPoints: [],
      reliefSought: 'Not applicable — matter concluded by consent',
      draftStatus: 'Final advocate-confirmed',
    },
    evidence: {
      witnesses: [],
      documentsAndExhibits: ['Mediated settlement agreement', 'Consent decree'],
      factsToProve: [],
      contradictions: [],
      missingEvidence: [],
      proofStatus: 'Final advocate-confirmed',
    },
    closure: {
      reason: 'Settled between the parties through court-annexed mediation',
      disposalDate: '2025-09-12',
      finalOutcome: 'Consent decree recording settlement — Defendant to pay agreed arrears in three installments',
      pendingObligations: 'Confirm receipt of the final installment (due 2026-01-15) — advocate follow-up only, no further court process required',
      appealOrReviewStatus: 'No appeal filed; limitation period for appeal has expired',
    },
  },
];

export function getMockMatterById(matterId: string): MockMatter | undefined {
  return MOCK_MATTERS.find((m) => m.id === matterId);
}

/** True when a hearing date is today or within the next 3 days. */
export function isUrgentHearing(nextHearingDate: string | null, todayIso: string): boolean {
  if (!nextHearingDate) return false;
  const diffDays = Math.round(
    (new Date(`${nextHearingDate}T00:00:00`).getTime() - new Date(`${todayIso}T00:00:00`).getTime()) / 86400000
  );
  return diffDays >= 0 && diffDays <= 3;
}

export function formatMockDate(value: string | null): string {
  if (!value) return 'Not scheduled';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
