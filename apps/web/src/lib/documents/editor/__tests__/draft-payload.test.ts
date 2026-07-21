import { serializeDraftPayload, parseDraftPayload } from '../draft-payload';
import { DEFAULT_PAGE_SETUP } from '../page-setup';

describe('draft-payload — the seam between the rich-text editor and the existing plain-string DocumentDraft content column', () => {
  test('round-trips html, page setup, and template identity through serialize/parse', () => {
    const payload = {
      html: '<p>Some pleading text</p>',
      pageSetup: { ...DEFAULT_PAGE_SETUP, orientation: 'landscape' as const, zoom: 120 },
      templateId: 'in-civil-suit-plaint',
    };
    const serialized = serializeDraftPayload(payload);
    expect(typeof serialized).toBe('string');
    const parsed = parseDraftPayload(serialized);
    expect(parsed).toEqual(payload);
  });

  test('parses legacy plain-text content (pre-rebuild drafts) without throwing, using default page setup', () => {
    const parsed = parseDraftPayload('Plain text from before the editor rebuild.');
    expect(parsed.html).toBe('Plain text from before the editor rebuild.');
    expect(parsed.pageSetup).toEqual(DEFAULT_PAGE_SETUP);
    expect(parsed.templateId).toBeNull();
  });

  test('parses malformed JSON without throwing, falling back to treating it as plain content', () => {
    const parsed = parseDraftPayload('{not valid json');
    expect(parsed.html).toBe('{not valid json');
    expect(parsed.templateId).toBeNull();
  });

  test('parses an empty string without throwing', () => {
    const parsed = parseDraftPayload('');
    expect(parsed.html).toBe('');
    expect(parsed.pageSetup).toEqual(DEFAULT_PAGE_SETUP);
  });

  test('a partial pageSetup object in stored JSON is merged over the defaults, not replacing them wholesale', () => {
    const serialized = JSON.stringify({ html: '<p>x</p>', pageSetup: { zoom: 80 }, templateId: null });
    const parsed = parseDraftPayload(serialized);
    expect(parsed.pageSetup.zoom).toBe(80);
    expect(parsed.pageSetup.paperSize).toBe(DEFAULT_PAGE_SETUP.paperSize);
  });

  test('the serialized string never exceeds a plain string type the existing content column already accepts', () => {
    const serialized = serializeDraftPayload({ html: '<p>x</p>', pageSetup: DEFAULT_PAGE_SETUP, templateId: null });
    expect(typeof serialized).toBe('string');
  });
});
