import type { Editor } from '@tiptap/react';

/**
 * The Legal Style Gallery (Document Creator UI/UX Specification §5). Each
 * style is a named preset combining *existing* editor formatting
 * primitives (heading level, alignment, indent, bold, font size) — this
 * introduces no new document schema concept and no new Tiptap node/mark
 * type. Applying a style is just running the same chain of commands the
 * ribbon's individual controls already expose.
 */
export interface LegalStyle {
  id: string;
  name: string;
  description: string;
  apply: (editor: Editor) => void;
  isActive: (editor: Editor) => boolean;
}

export const LEGAL_STYLES: LegalStyle[] = [
  {
    id: 'normal',
    name: 'Normal',
    description: 'Default body text',
    apply: (editor) =>
      editor
        .chain()
        .focus()
        .setParagraph()
        .unsetFontSize()
        .setTextAlign('left')
        .unsetAllMarks()
        .run(),
    isActive: (editor) => editor.isActive('paragraph') && editor.isActive({ textAlign: 'left' }) && !editor.isActive('bold'),
  },
  {
    id: 'court-heading',
    name: 'Court Heading',
    description: 'e.g. "IN THE HIGH COURT OF DELHI AT NEW DELHI"',
    apply: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).setTextAlign('center').run(),
    isActive: (editor) => editor.isActive('heading', { level: 1 }) && editor.isActive({ textAlign: 'center' }),
  },
  {
    id: 'cause-title',
    name: 'Cause Title',
    description: 'Case number and matter identification block',
    apply: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).setTextAlign('center').run(),
    isActive: (editor) => editor.isActive('heading', { level: 2 }) && editor.isActive({ textAlign: 'center' }),
  },
  {
    id: 'party-name',
    name: 'Party Name',
    description: 'Petitioner / Respondent name lines',
    apply: (editor) => editor.chain().focus().setParagraph().setTextAlign('left').setFontSize('12pt').toggleBold().run(),
    isActive: (editor) => editor.isActive('paragraph') && editor.isActive('bold') && editor.isActive({ textAlign: 'left' }),
  },
  {
    id: 'body',
    name: 'Body',
    description: 'Justified running text for facts and grounds',
    apply: (editor) => editor.chain().focus().setParagraph().unsetAllMarks().setTextAlign('justify').setFontSize('12pt').run(),
    isActive: (editor) => editor.isActive('paragraph') && editor.isActive({ textAlign: 'justify' }),
  },
  {
    id: 'prayer',
    name: 'Prayer',
    description: 'Indented relief-sought paragraph',
    apply: (editor) => {
      editor.chain().focus().setParagraph().setTextAlign('justify').run();
      const current = (editor.getAttributes('paragraph').indent as number) || 0;
      if (current < 24) editor.chain().focus().indent().run();
    },
    isActive: (editor) =>
      editor.isActive('paragraph') &&
      editor.isActive({ textAlign: 'justify' }) &&
      ((editor.getAttributes('paragraph').indent as number) || 0) >= 24,
  },
  {
    id: 'affidavit',
    name: 'Affidavit',
    description: 'Numbered verification/deposition paragraph style',
    apply: (editor) => editor.chain().focus().setParagraph().setTextAlign('justify').setLineHeight('1.5').run(),
    isActive: (editor) => editor.isActive('paragraph') && editor.getAttributes('paragraph').lineHeight === '1.5',
  },
  {
    id: 'signature-block',
    name: 'Signature Block',
    description: 'Right-aligned advocate/deponent signature line',
    apply: (editor) => editor.chain().focus().setParagraph().setTextAlign('right').toggleBold().run(),
    isActive: (editor) => editor.isActive('paragraph') && editor.isActive({ textAlign: 'right' }) && editor.isActive('bold'),
  },
  {
    id: 'annexure',
    name: 'Annexure',
    description: 'Bold annexure/exhibit label',
    apply: (editor) => editor.chain().focus().setParagraph().setTextAlign('left').toggleBold().setFontSize('12pt').run(),
    isActive: (editor) => editor.isActive('paragraph') && editor.isActive('bold') && editor.isActive({ textAlign: 'left' }),
  },
  {
    id: 'schedule',
    name: 'Schedule',
    description: 'Schedule/tabulated section heading',
    apply: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).setTextAlign('left').run(),
    isActive: (editor) => editor.isActive('heading', { level: 3 }) && editor.isActive({ textAlign: 'left' }),
  },
];

export function getActiveStyleId(editor: Editor): string | null {
  const match = LEGAL_STYLES.find((style) => style.isActive(editor));
  return match?.id ?? null;
}
