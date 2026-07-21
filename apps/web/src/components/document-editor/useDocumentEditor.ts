'use client';

import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { TextAlign } from '@tiptap/extension-text-align';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Highlight } from '@tiptap/extension-highlight';
import {
  FontSize,
  LineHeight,
  ParagraphSpacing,
  ParagraphSpacingBefore,
  Indent,
  PageBreak,
} from '@/lib/documents/editor/extensions';

export const FONT_FAMILIES = ['Times New Roman', 'Aptos', 'Calibri', 'Arial', 'Georgia', 'Garamond', 'Cambria'] as const;

export const FONT_SIZES = ['10pt', '11pt', '12pt', '14pt', '16pt', '18pt', '20pt', '24pt'] as const;

export const LINE_HEIGHTS = ['1', '1.15', '1.5', '2'] as const;

export const PARAGRAPH_SPACINGS = ['0pt', '6pt', '12pt', '18pt', '24pt'] as const;

/**
 * The one shared Tiptap editor configuration for the Document Creator.
 * Real, structured rich text (a ProseMirror document, not a plain
 * string) — see docs/document-creator and lib/documents/editor for why
 * Tiptap was selected over the alternatives considered.
 */
export function useDocumentEditor(options: { editable: boolean; onUpdateHtml?: (html: string) => void }) {
  return useEditor({
    editable: options.editable,
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // Underline ships as part of StarterKit itself in Tiptap v3 —
        // registering it again as a separate extension would just
        // duplicate the mark and log a "duplicate extension" warning.
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      FontSize,
      LineHeight,
      ParagraphSpacing,
      ParagraphSpacingBefore,
      Indent,
      PageBreak,
      TextAlign.configure({ types: ['heading', 'paragraph'], defaultAlignment: 'justify' }),
      Placeholder.configure({ placeholder: 'Start typing, or select a template from the library…' }),
    ],
    content: '',
    onUpdate: ({ editor }) => {
      options.onUpdateHtml?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'nchq-document-editor-content',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Document body',
      },
    },
  });
}
