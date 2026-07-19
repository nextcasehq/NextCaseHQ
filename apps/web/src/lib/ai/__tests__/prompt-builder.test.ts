import { buildPrompt } from '../prompt-builder';

describe('buildPrompt', () => {
  test('joins systemPolicies and instructions into a single system message, in that order', () => {
    const messages = buildPrompt({
      systemPolicies: 'Be precise.',
      instructions: 'Use the matter context below.',
      userRequest: 'What happened?',
    });
    expect(messages[0]).toEqual({ role: 'system', content: 'Be precise.\n\nUse the matter context below.' });
  });

  test('omits instructions from the system message entirely when empty', () => {
    const messages = buildPrompt({ systemPolicies: 'Be precise.', instructions: '', userRequest: 'What happened?' });
    expect(messages[0].content).toBe('Be precise.');
  });

  test('user message layer order is fixed: matter context, then retrieved documents, then the question', () => {
    const messages = buildPrompt({
      systemPolicies: 'sys',
      instructions: '',
      matterContext: 'The matter is an employment dispute.',
      retrievedDocuments: '[1] An excerpt.',
      userRequest: 'Summarize.',
    });
    expect(messages[1]).toEqual({
      role: 'user',
      content:
        'Matter context:\n\nThe matter is an employment dispute.' +
        '\n\nContext excerpts:\n\n[1] An excerpt.' +
        '\n\nQuestion: Summarize.',
    });
  });

  test('omits the "Matter context:" section when matterContext is not given', () => {
    const messages = buildPrompt({
      systemPolicies: 'sys',
      instructions: '',
      retrievedDocuments: '[1] An excerpt.',
      userRequest: 'Summarize.',
    });
    expect(messages[1].content).not.toContain('Matter context:');
    expect(messages[1].content).toBe('Context excerpts:\n\n[1] An excerpt.\n\nQuestion: Summarize.');
  });

  test('omits the "Context excerpts:" section when retrievedDocuments is not given', () => {
    const messages = buildPrompt({
      systemPolicies: 'sys',
      instructions: '',
      matterContext: 'Matter facts.',
      userRequest: 'Summarize.',
    });
    expect(messages[1].content).not.toContain('Context excerpts:');
    expect(messages[1].content).toBe('Matter context:\n\nMatter facts.\n\nQuestion: Summarize.');
  });

  test('with neither optional layer, the user message is just the question', () => {
    const messages = buildPrompt({ systemPolicies: 'sys', instructions: '', userRequest: 'Bare question.' });
    expect(messages[1]).toEqual({ role: 'user', content: 'Question: Bare question.' });
  });

  test('includes the existing draft between retrieved documents and the question, when given (DRAFT_IMPROVE)', () => {
    const messages = buildPrompt({
      systemPolicies: 'sys',
      instructions: '',
      existingDraft: 'Old draft text.',
      userRequest: 'Revise it.',
    });
    expect(messages[1].content).toBe('Existing draft to revise:\n\nOld draft text.\n\nQuestion: Revise it.');
  });

  test('omits the "Existing draft to revise:" section when existingDraft is not given', () => {
    const messages = buildPrompt({ systemPolicies: 'sys', instructions: '', userRequest: 'q' });
    expect(messages[1].content).not.toContain('Existing draft to revise:');
  });

  test('always returns exactly one system message followed by one user message', () => {
    const messages = buildPrompt({ systemPolicies: 'sys', instructions: 'ins', userRequest: 'q' });
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  test('does not import anything database-related — pure text assembly with no side effects', () => {
    // buildPrompt takes only plain strings and returns a plain array
    // synchronously; if it touched a DB client the import graph would pull
    // in pg, which this test file never mocks. Calling it here with no
    // jest.mock() setup for @/lib/db/db-client and having it work at all is
    // itself evidence of the import boundary (see also
    // import-boundary.test.ts, which asserts this at the source level).
    const messages = buildPrompt({ systemPolicies: 'sys', instructions: '', userRequest: 'q' });
    expect(messages).toBeDefined();
  });
});
