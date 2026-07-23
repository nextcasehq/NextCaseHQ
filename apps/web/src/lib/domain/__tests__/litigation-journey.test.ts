import { classifyJourneyPosition, journeyTrackFor, JOURNEY_TRACKS } from '../litigation-journey';

describe('journeyTrackFor', () => {
  test('ARBITRATION engagement type always uses the arbitration track, regardless of category', () => {
    expect(journeyTrackFor('ARBITRATION', 'COMMERCIAL')).toBe('ARBITRATION');
  });

  test('LITIGATION + CRIMINAL uses the criminal track', () => {
    expect(journeyTrackFor('LITIGATION', 'CRIMINAL')).toBe('CRIMINAL_LITIGATION');
  });

  test('LITIGATION + any non-criminal category uses the civil track', () => {
    expect(journeyTrackFor('LITIGATION', 'FAMILY')).toBe('CIVIL_LITIGATION');
    expect(journeyTrackFor('LITIGATION', 'COMMERCIAL')).toBe('CIVIL_LITIGATION');
    expect(journeyTrackFor('LITIGATION', null)).toBe('CIVIL_LITIGATION');
  });

  test('every other engagement type uses the non-litigation track', () => {
    for (const type of ['ADVISORY', 'PRE_LITIGATION', 'CONTRACTUAL', 'TRANSACTIONAL', 'MEDIATION', 'COMPLIANCE', 'INVESTIGATION', 'OTHER']) {
      expect(journeyTrackFor(type, 'OTHER')).toBe('NON_LITIGATION');
    }
  });
});

describe('classifyJourneyPosition', () => {
  test('returns currentIndex: null and no fabricated position for an empty/null stage', () => {
    expect(classifyJourneyPosition('LITIGATION', 'CIVIL', null).currentIndex).toBeNull();
    expect(classifyJourneyPosition('LITIGATION', 'CIVIL', '').currentIndex).toBeNull();
    expect(classifyJourneyPosition('LITIGATION', 'CIVIL', '   ').currentIndex).toBeNull();
  });

  test('returns currentIndex: null for an unrecognised stage rather than guessing', () => {
    const result = classifyJourneyPosition('LITIGATION', 'CIVIL', 'Proceedings stayed by the High Court');
    expect(result.currentIndex).toBeNull();
    expect(result.stages).toBe(JOURNEY_TRACKS.CIVIL_LITIGATION);
  });

  test.each([
    ['Written statement filed', 2],
    ['Issues framed; evidence stage', 3],
    ["Plaintiff's evidence to commence on the next date", 3],
    ['Final hearing — arguments in progress', 4],
    ['Judgment pronounced — suit decreed', 5],
    ['First Appeal admitted; stay granted', 6],
    ['Execution petition for enforcement of the arbitral award', 7],
  ])('civil litigation: %j classifies to index %i', (stageText, expectedIndex) => {
    expect(classifyJourneyPosition('LITIGATION', 'CIVIL', stageText).currentIndex).toBe(expectedIndex);
  });

  test('a stage mentioning both "arguments" and a later civil keyword does not regress to the earlier match', () => {
    // "Final Arguments Concluded" must not collide with the CLOSED bucket
    // just because "concluded" sounds terminal — it's still Arguments.
    const result = classifyJourneyPosition('LITIGATION', 'CIVIL', 'Final Arguments Concluded');
    expect(result.currentIndex).toBe(4);
  });

  test.each([
    ['Statement of the accused recorded', 5],
    ["Accused's statement recorded", 5],
    ['Charges framed and read over', 2],
    ['Complainant evidence concluded', 3],
  ])('criminal litigation: %j classifies to index %i', (stageText, expectedIndex) => {
    expect(classifyJourneyPosition('LITIGATION', 'CRIMINAL', stageText).currentIndex).toBe(expectedIndex);
  });

  test('arbitration track classifies an award correctly', () => {
    expect(classifyJourneyPosition('ARBITRATION', 'ARBITRATION', 'Final arbitral award pronounced').currentIndex).toBe(5);
  });

  test('non-litigation track classifies an advisory engagement', () => {
    expect(classifyJourneyPosition('ADVISORY', 'COMMERCIAL', 'Engagement letter signed').currentIndex).toBe(0);
    expect(classifyJourneyPosition('ADVISORY', 'COMMERCIAL', 'Delivered a written opinion — advice delivered').currentIndex).toBe(2);
  });
});
