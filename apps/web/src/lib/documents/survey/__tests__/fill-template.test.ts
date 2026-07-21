import { esc, fillTemplatePlaceholders } from '../fill-template';
import type { InterviewConfig } from '../types';

describe('fill-template — the shared draft-generation engine every guided interview uses', () => {
  test('esc() neutralizes HTML-significant characters (XSS prevention for free-text survey answers)', () => {
    expect(esc('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(esc('Rao & Sons "Advocates"')).toBe('Rao &amp; Sons &quot;Advocates&quot;');
    expect(esc(`O'Brien`)).toBe('O&#39;Brien');
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });

  const baseConfig: InterviewConfig = {
    id: 'test-interview',
    templateId: 'test-template',
    title: 'Test Interview',
    surveyJson: {},
    scalarFields: { courtName: '[COURT_NAME]', facts: '[FACTS]' },
    listFields: {
      '[PETITIONERS_BLOCK]': {
        questionName: 'petitioners',
        renderItem: (item) => `<p>${esc(item.name)}</p>`,
        empty: '<p>none</p>',
      },
    },
    blockFields: {
      '[INTERIM_RELIEF_BLOCK]': (answers) => (answers.seekingInterimRelief ? `<p>${esc(answers.interimReliefDetails)}</p>` : ''),
    },
  };

  test('scalar fields are substituted for their tokens', () => {
    const html = 'IN THE [COURT_NAME]. Facts: [FACTS]';
    const result = fillTemplatePlaceholders(html, { courtName: 'High Court of Delhi', facts: 'The petitioner was aggrieved.' }, baseConfig);
    expect(result).toBe('IN THE High Court of Delhi. Facts: The petitioner was aggrieved.');
  });

  test('a missing/empty scalar answer is removed, not left as a literal bracket token', () => {
    const html = 'Facts: [FACTS]';
    const result = fillTemplatePlaceholders(html, { facts: '' }, baseConfig);
    expect(result).toBe('Facts: ');
    expect(result).not.toContain('[FACTS]');
  });

  test('scalar substitution escapes HTML in the answer', () => {
    const html = 'IN THE [COURT_NAME]';
    const result = fillTemplatePlaceholders(html, { courtName: '<b>Injected</b>' }, baseConfig);
    expect(result).toBe('IN THE &lt;b&gt;Injected&lt;/b&gt;');
  });

  test('a repeatable (paneldynamic) answer renders one item per entry', () => {
    const html = '[PETITIONERS_BLOCK]';
    const result = fillTemplatePlaceholders(html, { petitioners: [{ name: 'A. Kumar' }, { name: 'B. Singh' }] }, baseConfig);
    expect(result).toBe('<p>A. Kumar</p><p>B. Singh</p>');
  });

  test('a repeatable section with zero entries falls back to the configured empty rendering', () => {
    const html = '[PETITIONERS_BLOCK]';
    const result = fillTemplatePlaceholders(html, { petitioners: [] }, baseConfig);
    expect(result).toBe('<p>none</p>');
  });

  test('a repeatable section with no answer at all (undefined) also falls back to empty rendering', () => {
    const html = '[PETITIONERS_BLOCK]';
    const result = fillTemplatePlaceholders(html, {}, baseConfig);
    expect(result).toBe('<p>none</p>');
  });

  test('a conditional block field renders only when its condition answer is true', () => {
    const html = 'Before.[INTERIM_RELIEF_BLOCK]After.';
    const withRelief = fillTemplatePlaceholders(html, { seekingInterimRelief: true, interimReliefDetails: 'Stay of eviction' }, baseConfig);
    expect(withRelief).toBe('Before.<p>Stay of eviction</p>After.');

    const withoutRelief = fillTemplatePlaceholders(html, { seekingInterimRelief: false }, baseConfig);
    expect(withoutRelief).toBe('Before.After.');
  });

  test('multiple occurrences of the same token are all replaced', () => {
    const html = '[COURT_NAME] ... [COURT_NAME]';
    const result = fillTemplatePlaceholders(html, { courtName: 'High Court of Karnataka' }, baseConfig);
    expect(result).toBe('High Court of Karnataka ... High Court of Karnataka');
  });
});
