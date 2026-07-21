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

  test('the reference interview carries structured legal metadata for future filtering/search/analytics/AI/Matter Register/Clause Assembly use', () => {
    const config = getInterviewConfigForTemplate(HIGH_COURT_WRIT_PETITION_GUIDED.id);
    expect(config?.metadata).toBeDefined();
    expect(config?.metadata?.courtVertical).toBe('HIGH_COURTS');
    expect(config?.metadata?.practiceArea).toBe('Constitutional');
    expect(config?.metadata?.documentType).toBe('PETITION');
    expect(Array.isArray(config?.metadata?.applicableCourts)).toBe(true);
    expect(Array.isArray(config?.metadata?.requiredAttachments)).toBe(true);
    expect(Array.isArray(config?.metadata?.supportedLanguages)).toBe(true);
    expect(typeof config?.metadata?.aiCompatible).toBe('boolean');
    expect(typeof config?.metadata?.clauseAssemblyCompatible).toBe('boolean');
  });

  test('metadata is optional — an interview without it (or with unrecognized keys) is still a valid InterviewConfig', () => {
    const minimal: import('../types').InterviewConfig = {
      id: 'test-minimal-interview',
      templateId: 'test-minimal-template',
      title: 'Minimal Interview',
      surveyJson: { pages: [] },
      scalarFields: {},
      listFields: {},
      blockFields: {},
    };
    expect(minimal.metadata).toBeUndefined();

    const withUnknownKeys: import('../types').InterviewConfig = {
      ...minimal,
      metadata: { someFutureField: 'unrecognized', anotherOne: 42 },
    };
    expect(withUnknownKeys.metadata?.someFutureField).toBe('unrecognized');
  });
});
