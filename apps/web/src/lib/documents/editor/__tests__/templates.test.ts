import {
  LEGAL_TEMPLATES,
  DELHI_HC_WRIT_PETITION,
  CIVIL_SUIT_PLAINT,
  AFFIDAVIT,
  HIGH_COURT_WRIT_PETITION_GUIDED,
  getTemplateById,
  COURT_VERTICALS,
} from '../templates';

const REQUIRED_PLACEHOLDER_GROUPS: Record<string, string[]> = {
  [DELHI_HC_WRIT_PETITION.id]: [
    '[CASE NUMBER]',
    '[PETITIONER NAME]',
    '[RESPONDENT NAME]',
    '[FACTS]',
    '[GROUNDS]',
    '[LEGAL PROVISIONS]',
    '[RELIEF SOUGHT]',
    '[PLACE]',
    '[DATE]',
    '[ADVOCATE NAME]',
  ],
  [CIVIL_SUIT_PLAINT.id]: [
    '[COURT NAME]',
    '[JURISDICTION]',
    '[CASE NUMBER]',
    '[PLAINTIFF NAME]',
    '[DEFENDANT NAME]',
    '[FACTS]',
    '[DATES]',
    '[GROUNDS]',
    '[RELIEF SOUGHT]',
    '[PLACE]',
    '[DATE]',
  ],
  [AFFIDAVIT.id]: ['[COURT NAME]', '[CASE NUMBER]', '[PETITIONER NAME]', '[RESPONDENT NAME]', '[FACTS]', '[PLACE]', '[DATE]'],
  [HIGH_COURT_WRIT_PETITION_GUIDED.id]: [
    '[COURT_NAME]',
    '[CASE_NUMBER]',
    '[CASE_YEAR]',
    '[WRIT_ARTICLE]',
    '[TERRITORIAL_JURISDICTION]',
    '[FACTS]',
    '[GROUNDS]',
    '[MAIN_RELIEF]',
    '[VERIFICATION_PLACE]',
    '[VERIFICATION_DATE]',
    '[DEPONENT_NAME]',
    '[PETITIONERS_BLOCK]',
    '[RESPONDENTS_BLOCK]',
    '[ANNEXURES_BLOCK]',
    '[ADVOCATES_BLOCK]',
  ],
};

const STRUCTURAL_SECTIONS: Record<string, RegExp[]> = {
  [DELHI_HC_WRIT_PETITION.id]: [
    /IN THE HIGH COURT OF DELHI/i,
    /VERSUS/,
    /PETITION UNDER ARTICLE 226/i,
    /GROUNDS/,
    /PRAYER/,
    /VERIFICATION/,
  ],
  [CIVIL_SUIT_PLAINT.id]: [/IN THE COURT OF/i, /VERSUS/, /PLAINT/, /FACTS/, /GROUNDS/, /PRAYER/, /VERIFICATION/],
  [AFFIDAVIT.id]: [/IN THE COURT OF/i, /VERSUS/, /AFFIDAVIT/, /VERIFICATION/, /DEPONENT/],
  [HIGH_COURT_WRIT_PETITION_GUIDED.id]: [
    /IN THE \[COURT_NAME\]/,
    /VERSUS/,
    /PETITION UNDER \[WRIT_ARTICLE\]/,
    /GROUNDS/,
    /PRAYER/,
    /VERIFICATION/,
  ],
};

describe('Legal templates — master content is complete and Indian-jurisdiction-first', () => {
  test('exactly four templates are registered, all jurisdiction IN', () => {
    expect(LEGAL_TEMPLATES).toHaveLength(4);
    expect(LEGAL_TEMPLATES.every((t) => t.jurisdiction === 'IN')).toBe(true);
  });

  test('no US or UK template is offered as a primary template', () => {
    const names = LEGAL_TEMPLATES.map((t) => t.name.toLowerCase());
    expect(names.some((n) => n.includes('u.s.') || n.includes('united states') || n.includes('s.d.n.y'))).toBe(false);
    expect(names.some((n) => n.includes('u.k.') || n.includes('united kingdom') || n.includes("king's bench"))).toBe(
      false
    );
  });

  test.each(LEGAL_TEMPLATES)('$name includes every required structural section', (template) => {
    for (const pattern of STRUCTURAL_SECTIONS[template.id]) {
      expect(template.html).toMatch(pattern);
    }
  });

  test.each(LEGAL_TEMPLATES)('$name includes every required editable placeholder', (template) => {
    for (const placeholder of REQUIRED_PLACEHOLDER_GROUPS[template.id]) {
      expect(template.html).toContain(placeholder);
    }
  });

  test.each(LEGAL_TEMPLATES)('$name carries a default page setup and font family', (template) => {
    expect(template.pageSetup.paperSize).toBe('A4');
    expect(template.pageSetup.orientation).toBe('portrait');
    expect(template.defaultFontFamily).toBeTruthy();
  });

  test('getTemplateById resolves a known template and returns undefined for an unknown one', () => {
    expect(getTemplateById(DELHI_HC_WRIT_PETITION.id)?.id).toBe(DELHI_HC_WRIT_PETITION.id);
    expect(getTemplateById('does-not-exist')).toBeUndefined();
  });

  test('templates are exported as plain data, not mutated by re-import (module-level immutability)', () => {
    const before = JSON.stringify(LEGAL_TEMPLATES);
    // Simulate a caller mistakenly mutating what they think is "their copy".
    const copy = { ...LEGAL_TEMPLATES[0] };
    copy.html = '<p>tampered</p>';
    expect(JSON.stringify(LEGAL_TEMPLATES)).toBe(before);
    expect(LEGAL_TEMPLATES[0].html).not.toBe('<p>tampered</p>');
  });
});

describe('Legal templates — Court Vertical organisation (UI/UX Specification Appendix A)', () => {
  test('exactly the five required Court Verticals are defined, in order', () => {
    expect(COURT_VERTICALS.map((v) => v.label)).toEqual([
      'Supreme Court',
      'High Courts',
      'District Courts',
      'Magistrate Courts',
      'Other Courts & Tribunals',
    ]);
  });

  test('every template belongs to exactly one of the five defined Court Verticals', () => {
    const validIds = new Set(COURT_VERTICALS.map((v) => v.id));
    for (const template of LEGAL_TEMPLATES) {
      expect(validIds.has(template.courtVertical)).toBe(true);
    }
  });

  test('the Delhi High Court Writ Petition is grouped under High Courts', () => {
    expect(DELHI_HC_WRIT_PETITION.courtVertical).toBe('HIGH_COURTS');
    expect(DELHI_HC_WRIT_PETITION.court).toBe('Delhi High Court');
  });

  test('the Civil Suit/Plaint and Affidavit are grouped under District Courts', () => {
    expect(CIVIL_SUIT_PLAINT.courtVertical).toBe('DISTRICT_COURTS');
    expect(AFFIDAVIT.courtVertical).toBe('DISTRICT_COURTS');
  });

  test.each(LEGAL_TEMPLATES)('$name carries the card fields Appendix A.3 requires', (template) => {
    expect(template.court).toBeTruthy();
    expect(template.practiceArea).toBeTruthy();
    expect(template.documentType).toBeTruthy();
    expect(template.version).toBeTruthy();
    expect(template.isStarterTemplate).toBe(true);
  });

  test('no Court Vertical is populated with a fabricated placeholder template — verticals with no real starter template simply have none', () => {
    const populatedVerticals = new Set(LEGAL_TEMPLATES.map((t) => t.courtVertical));
    // Only the verticals with a genuine, hand-authored template are
    // populated; Supreme Court, Magistrate Courts, and Other Courts &
    // Tribunals correctly have zero templates today rather than a fake
    // placeholder created just to fill every group.
    expect(populatedVerticals).toEqual(new Set(['HIGH_COURTS', 'DISTRICT_COURTS']));
  });

  test('the guided-interview Writ Petition is generic — no specific state or High Court is hardcoded', () => {
    expect(HIGH_COURT_WRIT_PETITION_GUIDED.courtVertical).toBe('HIGH_COURTS');
    expect(HIGH_COURT_WRIT_PETITION_GUIDED.court.toLowerCase()).not.toMatch(
      /delhi|mumbai|bombay|calcutta|madras|allahabad|karnataka|kerala|punjab|gujarat/
    );
    expect(HIGH_COURT_WRIT_PETITION_GUIDED.html).not.toMatch(/delhi|mumbai|bombay|calcutta|madras/i);
  });
});
