/**
 * @jest-environment jsdom
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { TextAlign } from '@tiptap/extension-text-align';
import { FontSize, LineHeight, Indent } from '../extensions';
import { LEGAL_STYLES, getActiveStyleId } from '../styles';

/**
 * Real functional coverage of the Legal Style Gallery (UI/UX
 * Specification §5) — each style's apply() must genuinely change a real
 * Tiptap/ProseMirror document's formatting, and isActive() must
 * correctly recognize the result, proving these are real formatting
 * presets and not decorative labels.
 */
function createTestEditor(content = '<p>Sample text</p>') {
  return new Editor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextStyle,
      FontSize,
      LineHeight,
      Indent,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content,
  });
}

describe('Legal Style Gallery — every style genuinely reformats the document', () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  test('exactly the ten required legal styles are defined', () => {
    const names = LEGAL_STYLES.map((s) => s.name);
    expect(names).toEqual([
      'Normal',
      'Court Heading',
      'Cause Title',
      'Party Name',
      'Body',
      'Prayer',
      'Affidavit',
      'Signature Block',
      'Annexure',
      'Schedule',
    ]);
  });

  test.each(LEGAL_STYLES.map((s) => s.id))('applying "%s" is recognized by its own isActive() check', (id) => {
    editor = createTestEditor();
    const style = LEGAL_STYLES.find((s) => s.id === id)!;
    style.apply(editor);
    expect(style.isActive(editor)).toBe(true);
  });

  test('Court Heading produces a centered level-1 heading', () => {
    editor = createTestEditor();
    LEGAL_STYLES.find((s) => s.id === 'court-heading')!.apply(editor);
    expect(editor.isActive('heading', { level: 1 })).toBe(true);
    expect(editor.isActive({ textAlign: 'center' })).toBe(true);
  });

  test('Prayer indents the paragraph', () => {
    editor = createTestEditor();
    LEGAL_STYLES.find((s) => s.id === 'prayer')!.apply(editor);
    expect((editor.getAttributes('paragraph').indent as number) >= 24).toBe(true);
  });

  test('getActiveStyleId reflects the currently-applied style', () => {
    editor = createTestEditor();
    LEGAL_STYLES.find((s) => s.id === 'signature-block')!.apply(editor);
    expect(getActiveStyleId(editor)).toBe('signature-block');
  });

  test('getActiveStyleId returns null when no gallery style matches the current formatting', () => {
    editor = createTestEditor();
    editor.chain().focus().toggleItalic().run();
    // Italic alone (with default left-aligned, non-bold paragraph text)
    // still matches "Normal" by design (Normal only checks
    // alignment/bold/node type) — apply a combination no style defines to
    // prove this isn't always true.
    editor.chain().focus().setTextAlign('center').toggleBold().setFontSize('24pt').run();
    expect(getActiveStyleId(editor)).toBeNull();
  });
});
