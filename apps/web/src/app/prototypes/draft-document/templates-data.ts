/**
 * Static prototype content for the "Draft Document" Action Card prototype.
 * Everything here is synthetic/placeholder text for UX exploration only —
 * nothing in this file is fetched from, or written back to, a database.
 */

export type TemplateCategory =
  | 'Legal Notice'
  | 'Affidavit'
  | 'Petition'
  | 'Application'
  | 'Written Statement'
  | 'Agreement'
  | 'Legal Opinion'
  | 'Written Arguments'
  | 'Hearing Notes'
  | 'Custom Firm Template';

export const DRAFT_TEMPLATE_CATEGORIES: TemplateCategory[] = [
  'Legal Notice',
  'Affidavit',
  'Petition',
  'Application',
  'Written Statement',
  'Agreement',
  'Legal Opinion',
  'Written Arguments',
  'Hearing Notes',
  'Custom Firm Template',
];

export interface DraftTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  header: string;
  body: string;
}

export const DRAFT_TEMPLATES: DraftTemplate[] = [
  {
    id: 'notice-001',
    name: 'Legal Notice — Recovery of Dues',
    category: 'Legal Notice',
    header: 'LEGAL NOTICE',
    body:
      'Under instructions from and on behalf of my client, I hereby serve you with the following notice:\n\n' +
      '1. That my client had entered into an agreement with you for supply of goods/services, and a sum remains outstanding and unpaid despite repeated reminders.\n\n' +
      '2. You are hereby called upon to pay the outstanding sum within 15 (fifteen) days of receipt of this notice, failing which my client shall be constrained to initiate appropriate civil and/or criminal proceedings against you, entirely at your risk as to costs and consequences.\n\n' +
      '3. This notice is issued without prejudice to any other right or remedy available to my client under law.',
  },
  {
    id: 'affidavit-001',
    name: 'Affidavit in Support of Application',
    category: 'Affidavit',
    header: 'AFFIDAVIT',
    body:
      'I, the deponent above named, do hereby solemnly affirm and state as follows:\n\n' +
      '1. That I am the [Petitioner/Respondent] in the above matter and am well conversant with the facts and circumstances of the case, and am competent to swear this affidavit.\n\n' +
      '2. That the accompanying application has been drafted under my instructions and the contents thereof may be read as part of this affidavit.\n\n' +
      '3. That the statements made herein are true and correct to the best of my knowledge and belief, and nothing material has been concealed therefrom.\n\n' +
      'DEPONENT',
  },
  {
    id: 'petition-001',
    name: 'Writ Petition (Civil) — Article 226',
    category: 'Petition',
    header: 'IN THE HIGH COURT OF [JURISDICTION]\nWrit Petition (Civil) No. ___ of 2026',
    body:
      'MEMORANDUM OF WRIT PETITION UNDER ARTICLE 226 OF THE CONSTITUTION OF INDIA\n\n' +
      'THE HUMBLE PETITION OF THE PETITIONER ABOVE NAMED\n\n' +
      'MOST RESPECTFULLY SHOWETH:\n\n' +
      '1. The petitioner is filing the present petition seeking appropriate writ, order or direction against the arbitrary and illegal action of the respondent authorities.\n\n' +
      '2. The cause of action arose within the territorial jurisdiction of this Hon\'ble Court.\n\n' +
      '3. The petitioner has no other equally efficacious alternate remedy save and except by way of the present petition.',
  },
  {
    id: 'application-001',
    name: 'Application for Interim Relief',
    category: 'Application',
    header: 'IN THE COURT OF [DESIGNATION]\nInterlocutory Application No. ___ of 2026',
    body:
      'APPLICATION UNDER [RELEVANT PROVISION] FOR GRANT OF INTERIM RELIEF\n\n' +
      'MOST RESPECTFULLY SHOWETH:\n\n' +
      '1. That the applicant craves leave to refer to and rely upon the pleadings and documents already on record of the main proceedings, without repeating the same for the sake of brevity.\n\n' +
      '2. That unless interim relief as prayed for is granted, the applicant shall suffer grave and irreparable loss and injury which cannot be compensated in terms of money.\n\n' +
      '3. That the balance of convenience lies wholly in favour of the applicant.\n\n' +
      'PRAYER: It is therefore most respectfully prayed that this Hon\'ble Court may be pleased to grant interim relief as prayed for above, in the interest of justice.',
  },
  {
    id: 'ws-001',
    name: 'Written Statement in Reply to Plaint',
    category: 'Written Statement',
    header: 'IN THE COURT OF [DESIGNATION]\nSuit No. ___ of 2026',
    body:
      'WRITTEN STATEMENT ON BEHALF OF THE DEFENDANT\n\n' +
      'PRELIMINARY OBJECTIONS:\n\n' +
      '1. That the suit as framed is not maintainable in law and on facts and is liable to be dismissed at the threshold.\n\n' +
      '2. That the plaint suffers from a mis-joinder/non-joinder of necessary parties.\n\n' +
      'ON MERITS (paragraph-wise reply):\n\n' +
      '1. That the contents of paragraph 1 of the plaint are a matter of record and need no reply.\n\n' +
      '2. That the contents of paragraph 2 of the plaint are wrong and denied, and the defendant puts the plaintiff to strict proof thereof.',
  },
  {
    id: 'agreement-001',
    name: 'Service Agreement — General Commercial',
    category: 'Agreement',
    header: 'SERVICES AGREEMENT',
    body:
      'THIS AGREEMENT is made on this ___ day of ______, 2026,\n\n' +
      'BETWEEN\n[Party A Name], a company/firm having its registered office at [address] (hereinafter "the Client"),\n\n' +
      'AND\n[Party B Name], having its office at [address] (hereinafter "the Service Provider").\n\n' +
      '1. SCOPE OF SERVICES: The Service Provider agrees to render the services described in Schedule A to the Client, in accordance with the terms of this Agreement.\n\n' +
      '2. TERM: This Agreement shall commence on the Effective Date and continue for a period of [ ] months, unless terminated earlier in accordance with the terms herein.\n\n' +
      '3. CONFIDENTIALITY: Each party shall keep confidential all proprietary information disclosed by the other party in connection with this Agreement.',
  },
  {
    id: 'opinion-001',
    name: 'Legal Opinion — Preliminary Advice',
    category: 'Legal Opinion',
    header: 'LEGAL OPINION\n(Privileged and Confidential)',
    body:
      'Re: [Brief description of matter]\n\n' +
      '1. INSTRUCTIONS: We have been instructed to advise on the legal position arising from the facts summarised below.\n\n' +
      '2. BRIEF FACTS: [Summary of the factual matrix as instructed by the client.]\n\n' +
      '3. ANALYSIS: Having considered the facts and the applicable legal provisions, our preliminary view is set out below. This opinion is confined strictly to the facts as instructed and is subject to revision upon receipt of further documentation.\n\n' +
      '4. CONCLUSION: Based on the above, our considered opinion is that [conclusion], subject to the caveats noted herein.',
  },
  {
    id: 'arguments-001',
    name: 'Written Arguments — Final Submissions',
    category: 'Written Arguments',
    header: 'WRITTEN ARGUMENTS ON BEHALF OF THE [PETITIONER/RESPONDENT]',
    body:
      '1. It is most respectfully submitted that the case set up by the opposite party is wholly without merit and deserves to be rejected in limine.\n\n' +
      '2. ISSUE NO. 1: [Statement of issue]. It is submitted that the evidence on record, both oral and documentary, overwhelmingly supports the case of this party.\n\n' +
      '3. It is further submitted that the judgments relied upon by the opposite party are clearly distinguishable on facts and are of no assistance to their case.\n\n' +
      '4. In view of the above submissions, it is most respectfully prayed that this Hon\'ble Court may be pleased to decide the issues in favour of this party.',
  },
  {
    id: 'hearing-notes-001',
    name: 'Hearing Notes — Court Diary Entry',
    category: 'Hearing Notes',
    header: 'HEARING NOTES',
    body:
      'Matter: [Matter name / number]\nCourt/Bench: [Court, Judge]\nDate of Hearing: [Date]\n\n' +
      'Present: [Counsel appearing for each party]\n\n' +
      'Proceedings: [Brief note of what transpired before the court — submissions made, orders passed, directions given.]\n\n' +
      'Next Steps: [Action items arising from today\'s hearing.]\n\n' +
      'Next Date of Hearing: [Date]',
  },
  {
    id: 'firm-template-001',
    name: 'Firm Letterhead — Standard Correspondence',
    category: 'Custom Firm Template',
    header: '[FIRM NAME]\nAdvocates & Solicitors',
    body:
      'Ref: [Firm reference number]\nDate: [Date]\n\n' +
      'To,\n[Recipient name and address]\n\n' +
      'Dear Sir/Madam,\n\n' +
      'Re: [Subject line]\n\n' +
      '[Body of correspondence.]\n\n' +
      'Thanking you,\nYours faithfully,\nFor [Firm Name]',
  },
];

export interface ExistingMatterOption {
  id: string;
  label: string;
}

// Synthetic list for the "Link to an existing matter" prototype flow only —
// deliberately not fetched from /api/matters, so this prototype has zero
// dependency on real tenant data.
export const EXISTING_MATTER_OPTIONS: ExistingMatterOption[] = [
  { id: 'proto-matter-01', label: 'Rajesh Enterprises vs. State Bank — MAT-2026-009' },
  { id: 'proto-matter-02', label: 'Kapoor Textiles — Advisory Engagement — MAT-2026-011' },
  { id: 'proto-matter-03', label: 'Demo Matter — Product Review (Sample Data)' },
];

export const CASE_TYPE_OPTIONS = [
  'Litigation',
  'Advisory',
  'Arbitration',
  'Corporate',
  'Intellectual Property',
  'Family',
  'Criminal',
  'Other',
];

// A single fixed, canned suggestion — "AI Assistance" in this prototype is
// entirely simulated. No real AI provider is called, and the same text is
// returned every time regardless of document content or case details.
export const CANNED_AI_SUGGESTION =
  'It is respectfully submitted that the facts stated hereinabove disclose a clear cause of action and warrant ' +
  'the grant of the relief prayed for by this Hon\'ble Court. [AI-suggested placeholder text — verify all facts, ' +
  'legal grounds, and citations before relying on this content.]';

export const DOCUMENT_TYPE_OPTIONS = [
  'Petition',
  'Plaint',
  'Written Statement',
  'Application',
  'Affidavit',
  'Legal Notice',
  'Written Arguments',
  'Appeal',
  'Reply / Rejoinder',
  'Other',
];

// Roles an advocate might represent — deliberately not defaulted to any one
// role, since the advocate may represent either side.
export const ADVOCATE_CAPACITY_OPTIONS = [
  'Plaintiff',
  'Defendant',
  'Petitioner',
  'Respondent',
  'Appellant',
  'Applicant',
  'Opponent',
  'Accused',
  'Complainant',
  'Informant',
  'Victim',
  'State',
  'Other',
];

// Synthetic sample "uploaded" documents for the Upload-an-Existing-Document
// path. There is no real file upload or OCR anywhere in this prototype —
// selecting one of these just loads a fixed, canned extraction result to
// demonstrate the intended UX.
export interface ExtractedFields {
  court: string | null;
  caseType: string | null;
  caseNumber: string | null;
  year: string | null;
  petitioner: string | null;
  respondent: string | null;
  documentType: string | null;
  filingDate: string | null;
  gist: string | null;
}

export interface SampleUploadDocument {
  id: string;
  fileName: string;
  pageCount: number;
  extraction: ExtractedFields;
  // When true, the duplicate-check simulation reports a possible existing
  // match (against EXISTING_MATTER_OPTIONS) — purely to demonstrate both
  // branches of that prototype flow.
  simulateDuplicateMatch: boolean;
}

export const SAMPLE_UPLOAD_DOCUMENTS: SampleUploadDocument[] = [
  {
    id: 'sample-writ-petition',
    fileName: 'Writ_Petition_Sample.pdf',
    pageCount: 12,
    extraction: {
      court: 'High Court of Karnataka',
      caseType: 'Writ Petition',
      caseNumber: 'WP 4521',
      year: '2026',
      petitioner: 'Umesh',
      respondent: 'State of Karnataka',
      documentType: 'Petition',
      filingDate: 'Needs confirmation',
      gist: 'Challenge to an administrative order refusing a trade licence renewal.',
    },
    simulateDuplicateMatch: false,
  },
  {
    id: 'sample-trial-court-order',
    fileName: 'Trial_Court_Order_Sample.pdf',
    pageCount: 4,
    extraction: {
      court: 'City Civil Court, Bengaluru',
      caseType: 'Partition Suit',
      caseNumber: 'O.S. 1234',
      year: '2026',
      petitioner: 'Umesh',
      respondent: 'Ramesh',
      documentType: 'Other',
      filingDate: 'Not detected',
      gist: 'Interim order on an application for injunction in a partition suit.',
    },
    simulateDuplicateMatch: true,
  },
  {
    id: 'sample-fir-copy',
    fileName: 'FIR_Copy_Sample.pdf',
    pageCount: 3,
    extraction: {
      court: null,
      caseType: 'Criminal Complaint',
      caseNumber: 'Crime No. 88/2026',
      year: '2026',
      petitioner: null,
      respondent: null,
      documentType: 'Other',
      filingDate: 'Illegible',
      gist: 'First Information Report — allegation of criminal breach of trust.',
    },
    simulateDuplicateMatch: false,
  },
];
