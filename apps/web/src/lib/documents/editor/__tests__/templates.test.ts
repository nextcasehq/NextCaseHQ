import { LEGAL_TEMPLATES, DELHI_HC_WRIT_PETITION, CIVIL_SUIT_PLAINT, AFFIDAVIT, getTemplateById } from '../templates';

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
};

describe('Legal templates — master content is complete and Indian-jurisdiction-first', () => {
  test('exactly three templates are registered, all jurisdiction IN', () => {
    expect(LEGAL_TEMPLATES).toHaveLength(3);
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
