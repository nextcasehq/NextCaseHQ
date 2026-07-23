/**
 * Additive-only Litigation Journey model. Nothing about how a Court Note
 * or Matter records its stage changes — Matter.current_stage stays real
 * free text, kept in sync by Court Note saves (see
 * api/cases/[id]/court-notes). This module only classifies that existing
 * free text against a canonical, ordered sequence of procedural stages,
 * purely to drive the ✓/●/○ progress visualization. The stage vocabulary
 * reuses the same terms already suggested to advocates elsewhere in the
 * app (see CASE_DIARY_STAGE_SUGGESTIONS / STAGE_SUGGESTIONS in the Case
 * Diary and Court Note entry points) rather than inventing a new one.
 *
 * An unrecognised stage is never guessed at: classifyJourneyPosition
 * returns currentIndex: null, and callers must show the real free-text
 * stage plainly rather than asserting a wrong position on the journey.
 */

export type JourneyTrack = 'CIVIL_LITIGATION' | 'CRIMINAL_LITIGATION' | 'ARBITRATION' | 'NON_LITIGATION';

const CIVIL_LITIGATION_STAGES = [
  'Notice / Pre-Filing',
  'Filing / Admission',
  'Written Statement / Reply',
  'Evidence',
  'Arguments',
  'Judgment / Order',
  'Appeal / Revision',
  'Execution / Compliance',
  'Closed',
] as const;

const CRIMINAL_LITIGATION_STAGES = [
  'FIR / Complaint',
  'Filing / Cognizance',
  'Charges Framed',
  'Prosecution Evidence',
  'Defence Evidence',
  'Arguments',
  'Judgment',
  'Appeal / Revision',
  'Execution / Compliance',
  'Closed',
] as const;

const ARBITRATION_STAGES = [
  'Notice / Reference',
  'Tribunal Constituted',
  'Pleadings',
  'Evidence',
  'Arguments',
  'Award',
  'Execution / Enforcement',
  'Closed',
] as const;

// Advisory / pre-litigation / contractual / transactional / mediation /
// compliance / investigation engagements are not adversarial court
// proceedings, so the fine-grained litigation stages don't apply — a much
// shorter, generic track instead.
const NON_LITIGATION_STAGES = ['Engaged', 'In Progress', 'Advice Delivered / Concluded'] as const;

export const JOURNEY_TRACKS: Record<JourneyTrack, readonly string[]> = {
  CIVIL_LITIGATION: CIVIL_LITIGATION_STAGES,
  CRIMINAL_LITIGATION: CRIMINAL_LITIGATION_STAGES,
  ARBITRATION: ARBITRATION_STAGES,
  NON_LITIGATION: NON_LITIGATION_STAGES,
};

export function journeyTrackFor(engagementType: string, matterCategory: string | null | undefined): JourneyTrack {
  if (engagementType === 'ARBITRATION') return 'ARBITRATION';
  if (engagementType === 'LITIGATION') {
    return matterCategory === 'CRIMINAL' ? 'CRIMINAL_LITIGATION' : 'CIVIL_LITIGATION';
  }
  return 'NON_LITIGATION';
}

// Checked most-final-stage-first within each track, so a stage note that
// happens to contain more than one keyword resolves to its most advanced
// (most specific) match rather than the first, weaker one. Deliberately
// conservative — only unambiguous, explicit procedural terms are mapped;
// status words like "stayed"/"on hold"/"abeyance" are NOT stages (that's
// what Matter.status already captures) and are left unmatched on purpose.
const STAGE_KEYWORDS: Record<JourneyTrack, Array<{ index: number; keywords: string[] }>> = {
  CIVIL_LITIGATION: [
    { index: 8, keywords: ['case closed', 'matter closed', 'fully satisfied', 'decree satisfied', 'petition withdrawn'] },
    { index: 7, keywords: ['execution petition', 'execution proceedings', 'compliance', 'enforcement of the'] },
    { index: 6, keywords: ['first appeal', 'second appeal', 'appeal no', 'revision petition', 'review petition'] },
    { index: 5, keywords: ['judgment', 'decree', 'order pronounced', 'order passed', 'disposed', 'award pronounced'] },
    { index: 4, keywords: ['argument', 'final hearing'] },
    { index: 3, keywords: ['evidence stage', "plaintiff's evidence", "defendant's evidence", 'cross-examination', 'examination-in-chief', 'witness'] },
    { index: 2, keywords: ['written statement', 'reply filed', 'objection', 'issues framed'] },
    { index: 1, keywords: ['admission', 'filed', 'filing', 'summons', 'notice issued', 'cognizance'] },
    { index: 0, keywords: ['legal notice', 'pre-filing', 'drafting the plaint', 'drafting the petition'] },
  ],
  CRIMINAL_LITIGATION: [
    { index: 9, keywords: ['case closed', 'matter concluded'] },
    { index: 8, keywords: ['execution', 'compliance', 'sentence execution'] },
    { index: 7, keywords: ['appeal no', 'revision petition'] },
    { index: 6, keywords: ['judgment', 'acquitted', 'convicted', 'order pronounced'] },
    { index: 5, keywords: ['argument', 'statement of the accused', "accused's statement", 'section 313'] },
    { index: 4, keywords: ['defence evidence'] },
    { index: 3, keywords: ['prosecution evidence', 'complainant evidence', 'complainant’s evidence', 'cross-examination', 'examination-in-chief', 'witness'] },
    { index: 2, keywords: ['charge', 'framed'] },
    { index: 1, keywords: ['cognizance', 'filed', 'filing', 'summons', 'bail application'] },
    { index: 0, keywords: ['fir', 'complaint filed'] },
  ],
  ARBITRATION: [
    { index: 7, keywords: ['case closed', 'matter concluded'] },
    { index: 6, keywords: ['execution petition', 'enforcement'] },
    { index: 5, keywords: ['award pronounced', 'award passed'] },
    { index: 4, keywords: ['argument'] },
    { index: 3, keywords: ['evidence', 'witness'] },
    { index: 2, keywords: ['pleading', 'statement of claim', 'statement of defence'] },
    { index: 1, keywords: ['tribunal constituted', 'arbitrator appointed'] },
    { index: 0, keywords: ['notice invoking arbitration', 'reference to arbitration'] },
  ],
  NON_LITIGATION: [
    { index: 2, keywords: ['advice delivered', 'engagement concluded', 'engagement closed'] },
    { index: 1, keywords: ['in progress', 'under review', 'drafting'] },
    { index: 0, keywords: ['engaged', 'onboarded', 'engagement letter'] },
  ],
};

export interface JourneyPosition {
  track: JourneyTrack;
  stages: readonly string[];
  currentIndex: number | null;
}

export function classifyJourneyPosition(
  engagementType: string,
  matterCategory: string | null | undefined,
  currentStageText: string | null | undefined
): JourneyPosition {
  const track = journeyTrackFor(engagementType, matterCategory);
  const stages = JOURNEY_TRACKS[track];
  const text = (currentStageText ?? '').toLowerCase();
  if (!text.trim()) return { track, stages, currentIndex: null };

  for (const entry of STAGE_KEYWORDS[track]) {
    if (entry.keywords.some((k) => text.includes(k))) {
      return { track, stages, currentIndex: entry.index };
    }
  }
  return { track, stages, currentIndex: null };
}
