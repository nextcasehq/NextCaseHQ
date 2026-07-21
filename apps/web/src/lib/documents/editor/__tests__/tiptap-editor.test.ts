/**
 * @jest-environment jsdom
 */
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { FontSize, LineHeight, ParagraphSpacing, ParagraphSpacingBefore, Indent, PageBreak } from '../extensions';

/**
 * Real functional coverage of the Document Creator's editor, exercised
 * against an actual Tiptap/ProseMirror `Editor` instance in jsdom — not
 * source-string assertions. This is the same engine
 * useDocumentEditor.ts wires into React (@tiptap/react's useEditor is a
 * thin wrapper around this exact `Editor` class), so a command that
 * genuinely changes the document/schema state here behaves identically
 * inside the real page.
 */
function createTestEditor(content = '<p>Hello world</p>') {
  return new Editor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      LineHeight,
      ParagraphSpacing,
      ParagraphSpacingBefore,
      Indent,
      PageBreak,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
    ],
    content,
  });
}

function selectAll(editor: Editor) {
  editor.commands.selectAll();
}

describe('Document Creator editor — formatting commands (real Tiptap/ProseMirror engine)', () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  test('loads initial HTML content', () => {
    editor = createTestEditor('<p>Initial draft body</p>');
    expect(editor.getText()).toContain('Initial draft body');
  });

  test('bold toggles on the selection and is reflected in isActive', () => {
    editor = createTestEditor();
    selectAll(editor);
    editor.chain().focus().toggleBold().run();
    expect(editor.isActive('bold')).toBe(true);
    expect(editor.getHTML()).toContain('<strong>');
    editor.chain().focus().toggleBold().run();
    expect(editor.isActive('bold')).toBe(false);
  });

  test('italic toggles on the selection', () => {
    editor = createTestEditor();
    selectAll(editor);
    editor.chain().focus().toggleItalic().run();
    expect(editor.isActive('italic')).toBe(true);
    expect(editor.getHTML()).toContain('<em>');
  });

  test('underline toggles on the selection', () => {
    editor = createTestEditor();
    selectAll(editor);
    editor.chain().focus().toggleUnderline().run();
    expect(editor.isActive('underline')).toBe(true);
    expect(editor.getHTML()).toContain('<u>');
  });

  test('clear formatting removes marks previously applied', () => {
    editor = createTestEditor();
    selectAll(editor);
    editor.chain().focus().toggleBold().toggleItalic().run();
    expect(editor.isActive('bold')).toBe(true);
    editor.chain().focus().unsetAllMarks().clearNodes().run();
    expect(editor.isActive('bold')).toBe(false);
    expect(editor.isActive('italic')).toBe(false);
  });

  test('text alignment (left/center/right/justify) applies to the active paragraph', () => {
    editor = createTestEditor();
    editor.chain().focus().setTextAlign('center').run();
    expect(editor.isActive({ textAlign: 'center' })).toBe(true);
    editor.chain().focus().setTextAlign('right').run();
    expect(editor.isActive({ textAlign: 'right' })).toBe(true);
    expect(editor.isActive({ textAlign: 'center' })).toBe(false);
    editor.chain().focus().setTextAlign('justify').run();
    expect(editor.isActive({ textAlign: 'justify' })).toBe(true);
    editor.chain().focus().setTextAlign('left').run();
    expect(editor.isActive({ textAlign: 'left' })).toBe(true);
  });

  test('bullet list and numbered list toggle and are mutually exclusive', () => {
    editor = createTestEditor();
    editor.chain().focus().toggleBulletList().run();
    expect(editor.isActive('bulletList')).toBe(true);
    editor.chain().focus().toggleOrderedList().run();
    expect(editor.isActive('orderedList')).toBe(true);
    expect(editor.isActive('bulletList')).toBe(false);
  });

  test('indent and outdent adjust the active paragraph margin', () => {
    editor = createTestEditor();
    editor.chain().focus().indent().run();
    expect(editor.getAttributes('paragraph').indent).toBe(24);
    editor.chain().focus().indent().run();
    expect(editor.getAttributes('paragraph').indent).toBe(48);
    editor.chain().focus().outdent().run();
    expect(editor.getAttributes('paragraph').indent).toBe(24);
  });

  test('outdent never goes below zero', () => {
    editor = createTestEditor();
    editor.chain().focus().outdent().run();
    expect(editor.getAttributes('paragraph').indent).toBe(0);
  });

  test('font family applies via the textStyle mark', () => {
    editor = createTestEditor();
    selectAll(editor);
    editor.chain().focus().setFontFamily('Georgia').run();
    expect(editor.getAttributes('textStyle').fontFamily).toBe('Georgia');
    expect(editor.getHTML()).toContain('Georgia');
    editor.chain().focus().unsetFontFamily().run();
  });

  test('font size applies via the custom fontSize extension', () => {
    editor = createTestEditor();
    selectAll(editor);
    editor.chain().focus().setFontSize('14pt').run();
    expect(editor.getAttributes('textStyle').fontSize).toBe('14pt');
    expect(editor.getHTML()).toContain('font-size: 14pt');
    editor.chain().focus().unsetFontSize().run();
    expect(editor.getAttributes('textStyle').fontSize).toBeFalsy();
  });

  test('highlight applies a background colour mark and can be removed', () => {
    editor = createTestEditor();
    selectAll(editor);
    editor.chain().focus().toggleHighlight({ color: '#FEF08A' }).run();
    expect(editor.isActive('highlight')).toBe(true);
    expect(editor.getAttributes('highlight').color).toBe('#FEF08A');
    expect(editor.getHTML()).toContain('<mark');
    editor.chain().focus().unsetHighlight().run();
    expect(editor.isActive('highlight')).toBe(false);
  });

  test('text colour applies via the color extension', () => {
    editor = createTestEditor();
    selectAll(editor);
    editor.chain().focus().setColor('#7A2331').run();
    expect(editor.getAttributes('textStyle').color).toBe('#7A2331');
  });

  test('line spacing applies to the active paragraph', () => {
    editor = createTestEditor();
    editor.chain().focus().setLineHeight('1.5').run();
    expect(editor.getAttributes('paragraph').lineHeight).toBe('1.5');
    expect(editor.getHTML()).toContain('line-height: 1.5');
  });

  test('paragraph spacing before and after apply independently', () => {
    editor = createTestEditor();
    editor.chain().focus().setParagraphSpacingBefore('12pt').run();
    editor.chain().focus().setParagraphSpacing('18pt').run();
    expect(editor.getAttributes('paragraph').paragraphSpacingBefore).toBe('12pt');
    expect(editor.getAttributes('paragraph').paragraphSpacing).toBe('18pt');
    expect(editor.getHTML()).toContain('margin-top: 12pt');
    expect(editor.getHTML()).toContain('margin-bottom: 18pt');
  });

  test('undo reverts the last change and redo reapplies it', () => {
    editor = createTestEditor('<p>Base text</p>');
    selectAll(editor);
    editor.chain().focus().toggleBold().run();
    expect(editor.isActive('bold')).toBe(true);
    editor.chain().focus().undo().run();
    expect(editor.isActive('bold')).toBe(false);
    editor.chain().focus().redo().run();
    expect(editor.isActive('bold')).toBe(true);
  });

  test('a page break can be inserted and is a distinct atomic node', () => {
    editor = createTestEditor('<p>Before break</p>');
    editor.commands.setContent('<p>Before break</p><p>After break</p>');
    editor.chain().focus('end').setPageBreak().run();
    expect(editor.getHTML()).toContain('data-page-break');
  });

  test('heading levels (1-3) toggle as block types, not inline marks', () => {
    editor = createTestEditor('<p>A heading candidate</p>');
    editor.chain().focus().toggleHeading({ level: 2 }).run();
    expect(editor.isActive('heading', { level: 2 })).toBe(true);
    editor.chain().focus().setParagraph().run();
    expect(editor.isActive('heading')).toBe(false);
    expect(editor.isActive('paragraph')).toBe(true);
  });

  test('the document is serialisable to HTML and restorable from it — the same round trip autosave relies on', () => {
    editor = createTestEditor();
    selectAll(editor);
    editor.chain().focus().toggleBold().setTextAlign('center').run();
    const html = editor.getHTML();
    editor.destroy();

    const restored = createTestEditor(html);
    expect(restored.getHTML()).toContain('<strong>');
    expect(restored.getHTML()).toContain('text-align');
    editor = restored;
  });
});
