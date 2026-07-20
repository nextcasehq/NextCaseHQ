/**
 * Shared state shapes for the connected Draft Document / Matter Register
 * prototype flow. Kept in one place so each step component and the page
 * orchestrator agree on the same shapes — this is the seam later
 * milestones (matter-type-adaptive fields, the fuller AI action set,
 * document relationships, etc.) are meant to extend without reshaping
 * the whole flow.
 */

export type EntryChoice = 'draft-new' | 'upload-existing' | 'link-existing';

export type FlowStep = 'start' | 'link-pick' | 'context' | 'draft' | 'upload' | 'confirm' | 'register';

export interface CaseContext {
  documentType: string;
  representedParty: string;
  opposingParty: string;
  court: string;
  // Progressive-disclosure fields — optional, revealed behind "+ Add more
  // case details" rather than shown up front.
  advocateCapacity: string;
  jurisdiction: string;
  caseCategory: string;
  gist: string;
  relief: string;
  provisions: string;
  caseNumber: string;
  caseYear: string;
}

export const EMPTY_CASE_CONTEXT: CaseContext = {
  documentType: '',
  representedParty: '',
  opposingParty: '',
  court: '',
  advocateCapacity: '',
  jurisdiction: '',
  caseCategory: '',
  gist: '',
  relief: '',
  provisions: '',
  caseNumber: '',
  caseYear: '',
};

// The minimum required fields for the "X of Y required details completed"
// indicator. Everything else in CaseContext is optional/progressive.
export const REQUIRED_CONTEXT_FIELDS: (keyof CaseContext)[] = [
  'documentType',
  'representedParty',
  'opposingParty',
  'court',
];

export function countCompletedRequiredFields(context: CaseContext): number {
  return REQUIRED_CONTEXT_FIELDS.filter((field) => context[field].trim() !== '').length;
}

export function isRequiredContextComplete(context: CaseContext): boolean {
  return countCompletedRequiredFields(context) === REQUIRED_CONTEXT_FIELDS.length;
}

export interface MatterRegisterInfo {
  mode: 'new' | 'link';
  name: string;
  number?: string;
}

export interface UploadState {
  selectedSampleId: string | null;
  representedParty: string;
  extractionRevealed: boolean;
  // Advocate-editable copies of the extraction result, seeded from the
  // sample document's canned ExtractedFields once revealed.
  confirmedCourt: string;
  confirmedCaseType: string;
  confirmedCaseNumber: string;
  confirmedYear: string;
  confirmedPetitioner: string;
  confirmedRespondent: string;
  confirmedDocumentType: string;
  confirmedGist: string;
  reviewConfirmed: boolean;
  duplicateChoice: 'link' | 'separate' | null;
}

export const EMPTY_UPLOAD_STATE: UploadState = {
  selectedSampleId: null,
  representedParty: '',
  extractionRevealed: false,
  confirmedCourt: '',
  confirmedCaseType: '',
  confirmedCaseNumber: '',
  confirmedYear: '',
  confirmedPetitioner: '',
  confirmedRespondent: '',
  confirmedDocumentType: '',
  confirmedGist: '',
  reviewConfirmed: false,
  duplicateChoice: null,
};
