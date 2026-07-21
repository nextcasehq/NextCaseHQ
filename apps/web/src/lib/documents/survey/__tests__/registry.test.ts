import { getInterviewConfigForTemplate } from '../registry';
import { HIGH_COURT_WRIT_PETITION_GUIDED } from '@/lib/documents/editor/templates';

describe('Legal Interview Engine registry — the single extension point for future interviews', () => {
  test('resolves the guided Writ Petition template to its interview config', () => {
    const config = getInterviewConfigForTemplate(HIGH_COURT_WRIT_PETITION_GUIDED.id);
    expect(config).toBeDefined();
    expect(config?.templateId).toBe(HIGH_COURT_WRIT_PETITION_GUIDED.id);
  });

  test('a template with no configured interview resolves to undefined (direct-load templates are unaffected)', () => {
    expect(getInterviewConfigForTemplate('in-affidavit')).toBeUndefined();
    expect(getInterviewConfigForTemplate('does-not-exist')).toBeUndefined();
  });
});
