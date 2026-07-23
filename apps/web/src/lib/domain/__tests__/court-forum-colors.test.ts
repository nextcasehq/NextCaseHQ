import { COURT_FORUM_TYPES } from '../court-note';
import { COURT_FORUM_COLORS, classifyCourtForumType, courtForumColorFor } from '../court-forum-colors';

describe('COURT_FORUM_COLORS', () => {
  test('has exactly one colour scheme per CourtForumType, no more, no fewer', () => {
    expect(Object.keys(COURT_FORUM_COLORS).sort()).toEqual([...COURT_FORUM_TYPES].sort());
  });

  test('every scheme has a distinct bg/border/text/icon set', () => {
    for (const type of COURT_FORUM_TYPES) {
      const scheme = COURT_FORUM_COLORS[type];
      expect(scheme.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(scheme.border).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(scheme.text).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(scheme.icon.length).toBeGreaterThan(0);
    }
  });
});

describe('classifyCourtForumType', () => {
  test.each([
    ['Supreme Court of India', 'SUPREME_COURT'],
    ['High Court', 'HIGH_COURT'],
    ['Delhi High Court (Bench III)', 'HIGH_COURT'],
    ['District Consumer Disputes Redressal Commission, Bengaluru', 'CONSUMER_COMMISSION'],
    ['Labour Court, Nagpur', 'LABOUR_COURT'],
    ['Family Court, Pune', 'FAMILY_COURT'],
    ['Commercial Court, Ahmedabad', 'COMMERCIAL_COURT'],
    ['Motor Accident Claims Tribunal, Lucknow', 'MACT'],
    ['Arbitral Tribunal (ad hoc)', 'ARBITRATION'],
    ['Office of the Sub-Divisional Officer (Revenue), Jaipur', 'REVENUE_COURT'],
    ['Court of Sessions, Aurangabad', 'CRIMINAL_COURT'],
    ['Court of the Judicial Magistrate First Class, Nashik', 'CRIMINAL_COURT'],
    ['District Civil Court, Pune', 'CIVIL_COURT'],
    ["Hon'ble Civil Judge (Senior Division), Pune", 'CIVIL_COURT'],
    ['Income Tax Appellate Tribunal, Mumbai Bench', 'OTHER'],
    ['', 'OTHER'],
    [null, 'OTHER'],
    [undefined, 'OTHER'],
  ])('classifies %j as %s', (input, expected) => {
    expect(classifyCourtForumType(input as string | null | undefined)).toBe(expected);
  });

  test('is case-insensitive', () => {
    expect(classifyCourtForumType('HIGH COURT OF KERALA')).toBe('HIGH_COURT');
  });
});

describe('courtForumColorFor', () => {
  test('returns the colour scheme matching the classified type', () => {
    expect(courtForumColorFor('Supreme Court of India')).toBe(COURT_FORUM_COLORS.SUPREME_COURT);
    expect(courtForumColorFor(null)).toBe(COURT_FORUM_COLORS.OTHER);
  });
});
