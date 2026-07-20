/**
 * Synthetic seed data for the standalone "Next Hearing & Stage" Action
 * Card prototype. Nothing here is fetched from, or written back to, a
 * database — everything lives in this prototype's own sessionStorage-backed
 * React state, entirely separate from the Draft Document prototype's
 * synthetic data (different route, different session key, no shared model).
 */

export type HearingCategory = 'Supreme Court' | 'High Court' | 'Civil Court' | 'Criminal Court' | 'Other Court';

export const HEARING_CATEGORIES: HearingCategory[] = [
  'Supreme Court',
  'High Court',
  'Civil Court',
  'Criminal Court',
  'Other Court',
];

export interface HearingCaseRecord {
  id: string;
  category: HearingCategory;
  courtLabel: string;
  matterName: string;
  caseNumber: string;
  courtBench: string;
  hearingDate: string;
  nextHearingDate: string | null;
  currentStage: string | null;
  shortNote: string;
  previousNextHearingDate?: string | null;
  previousStage?: string | null;
}

export interface TimelineEntry {
  id: string;
  caseId: string;
  timestamp: string;
  message: string;
}

export interface CategoryStyle {
  bg: string;
  border: string;
  text: string;
  icon: string;
}

// Soft, distinct backgrounds per category — always paired with a text
// label and icon, never colour alone, to stay accessible for colour-blind
// users and to keep contrast readable against the dark ink text color.
export const CATEGORY_STYLES: Record<HearingCategory, CategoryStyle> = {
  'Supreme Court': { bg: '#FBF6EA', border: '#C6A253', text: '#5C4A1E', icon: '🏛️' },
  'High Court': { bg: '#EAF2FB', border: '#8FB4DE', text: '#1F3A5C', icon: '⚖️' },
  'Civil Court': { bg: '#EAF7EE', border: '#8FCBA0', text: '#1F5C34', icon: '📋' },
  'Criminal Court': { bg: '#FBEAEA', border: '#DE8F8F', text: '#5C1F1F', icon: '🚨' },
  'Other Court': { bg: '#F2EAFB', border: '#B78FDE', text: '#3A1F5C', icon: '🏢' },
};

// Two records (sc-01, hc-01) deliberately share the same case number
// string to exercise the duplicate-case-number confirmation flow.
export const SEED_HEARING_RECORDS: HearingCaseRecord[] = [
  {
    id: 'sc-01',
    category: 'Supreme Court',
    courtLabel: 'Supreme Court of India',
    matterName: 'Sharma vs. Union of India',
    caseNumber: '4521/2026',
    courtBench: 'Court No. 3',
    hearingDate: '2026-07-15',
    nextHearingDate: '2026-08-10',
    currentStage: 'Arguments',
    shortNote: 'Interim stay continued.',
  },
  {
    id: 'sc-02',
    category: 'Supreme Court',
    courtLabel: 'Supreme Court of India',
    matterName: 'State of Karnataka vs. Rao',
    caseNumber: 'SLP(Crl) 892/2026',
    courtBench: 'Court No. 1',
    hearingDate: '2026-07-18',
    nextHearingDate: null,
    currentStage: null,
    shortNote: '',
  },
  {
    id: 'hc-01',
    category: 'High Court',
    courtLabel: 'High Court of Karnataka',
    matterName: 'Umesh vs. State of Karnataka',
    caseNumber: '4521/2026',
    courtBench: 'Court Hall 2',
    hearingDate: '2026-07-16',
    nextHearingDate: '2026-08-01',
    currentStage: 'Notice Issued',
    shortNote: '',
  },
  {
    id: 'hc-02',
    category: 'High Court',
    courtLabel: 'High Court of Karnataka',
    matterName: 'Kapoor Textiles vs. GST Department',
    caseNumber: 'WP 7890/2026',
    courtBench: 'Court Hall 5',
    hearingDate: '2026-07-19',
    nextHearingDate: '2026-08-12',
    currentStage: 'Reply Filed',
    shortNote: 'Awaiting department response.',
  },
  {
    id: 'cc-01',
    category: 'Civil Court',
    courtLabel: 'City Civil Court, Bengaluru',
    matterName: 'Umesh vs. Ramesh — Partition Suit',
    caseNumber: 'O.S. 1234/2026',
    courtBench: 'Court No. 7',
    hearingDate: '2026-07-14',
    nextHearingDate: '2026-08-03',
    currentStage: 'Arguments',
    shortNote: 'Evidence stage concluded.',
  },
  {
    id: 'cc-02',
    category: 'Civil Court',
    courtLabel: 'City Civil Court, Bengaluru',
    matterName: 'Rajesh Enterprises vs. State Bank',
    caseNumber: 'O.S. 2201/2026',
    courtBench: '',
    hearingDate: '2026-07-17',
    nextHearingDate: '2026-08-07',
    currentStage: 'Admission',
    shortNote: '',
  },
  {
    id: 'crc-01',
    category: 'Criminal Court',
    courtLabel: 'Sessions Court, Bengaluru',
    matterName: 'State vs. Mahesh',
    caseNumber: 'CC 331/2026',
    courtBench: 'Court No. 2',
    hearingDate: '2026-07-20',
    nextHearingDate: '2026-08-04',
    currentStage: 'Charge Framed',
    shortNote: 'Next: prosecution evidence.',
  },
  {
    id: 'crc-02',
    category: 'Criminal Court',
    courtLabel: 'Sessions Court, Bengaluru',
    matterName: 'State vs. Suresh',
    caseNumber: 'CC 145/2026',
    courtBench: 'Court No. 4',
    hearingDate: '2026-07-18',
    nextHearingDate: null,
    currentStage: null,
    shortNote: '',
  },
  {
    id: 'oc-01',
    category: 'Other Court',
    courtLabel: 'Consumer Disputes Redressal Commission',
    matterName: 'Kapoor vs. XYZ Traders — Consumer Complaint',
    caseNumber: 'CC 55/2026',
    courtBench: '',
    hearingDate: '2026-07-19',
    nextHearingDate: '2026-08-09',
    currentStage: 'Evidence',
    shortNote: '',
  },
];
