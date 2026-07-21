import { resolveRecoveredContent, type LocalDraftRecord } from '../local-draft-store';

/**
 * The pure reconciliation decision behind Tier 1 (local/IndexedDB)
 * recovery — deliberately tested without a real browser/IndexedDB, per
 * docs/document-creator/DOCUMENT_AUTOSAVE_SPECIFICATION.md's "Recovery
 * Scenarios" table. The IndexedDB-touching functions in this same module
 * are thin, untested-by-Jest wrappers (no @testing-library/react in this
 * repo — see the established convention), validated instead via the
 * browser/Playwright checks in this milestone's manual validation pass.
 */

const server = { revision: 3, content: 'server content', title: 'Server Title' };

function local(overrides: Partial<LocalDraftRecord>): LocalDraftRecord {
  return {
    draftId: 'draft-1',
    content: 'local content',
    title: 'Local Title',
    revision: 3,
    savedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('resolveRecoveredContent', () => {
  test('no local copy — the server copy is used, not "recovered"', () => {
    const result = resolveRecoveredContent(null, server);
    expect(result).toEqual({ source: 'server', content: server.content, title: server.title });
  });

  test('local copy strictly ahead of the server revision — local wins (unsynced edits survived a crash)', () => {
    const result = resolveRecoveredContent(local({ revision: 4 }), server);
    expect(result.source).toBe('local');
    expect(result.content).toBe('local content');
  });

  test('local copy at the same revision but with different content — local wins (autosave was in flight when the tab closed)', () => {
    const result = resolveRecoveredContent(local({ revision: 3, content: 'unsynced edit' }), server);
    expect(result.source).toBe('local');
    expect(result.content).toBe('unsynced edit');
  });

  test('local copy at the same revision with IDENTICAL content — server is used (nothing to recover)', () => {
    const result = resolveRecoveredContent(local({ revision: 3, content: server.content }), server);
    expect(result.source).toBe('server');
  });

  test('local copy behind the server revision — server wins (a newer server write already superseded it)', () => {
    const result = resolveRecoveredContent(local({ revision: 1, content: 'stale local content' }), server);
    expect(result.source).toBe('server');
    expect(result.content).toBe(server.content);
  });
});
