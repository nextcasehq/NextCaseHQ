import { Extension, Node } from '@tiptap/core';

/**
 * Custom Tiptap extensions for the Document Creator. None of these exist
 * as first-party or widely-used community Tiptap packages in a form that
 * matches this editor's exact needs, so they're implemented directly
 * against Tiptap's public extension APIs (Extension.create / Node.create)
 * rather than pulled in as additional dependencies — each is a small,
 * self-contained attribute/command pair following the same pattern
 * Tiptap's own docs use for font-size.
 */

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (fontSize: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
    lineHeight: {
      setLineHeight: (lineHeight: string) => ReturnType;
      unsetLineHeight: () => ReturnType;
    };
    paragraphSpacing: {
      setParagraphSpacing: (spacing: string) => ReturnType;
      unsetParagraphSpacing: () => ReturnType;
    };
    paragraphSpacingBefore: {
      setParagraphSpacingBefore: (spacing: string) => ReturnType;
      unsetParagraphSpacingBefore: () => ReturnType;
    };
    indent: {
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
    pageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}

export const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize || null,
            renderHTML: (attributes: { fontSize?: string | null }) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().setMark('textStyle', { fontSize: null }).run(),
    };
  },
});

const BLOCK_TYPES = ['paragraph', 'heading'];

export const LineHeight = Extension.create({
  name: 'lineHeight',
  addOptions() {
    return { types: BLOCK_TYPES };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.lineHeight || null,
            renderHTML: (attributes: { lineHeight?: string | null }) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ commands }) =>
          this.options.types.every((type: string) => commands.updateAttributes(type, { lineHeight })),
      unsetLineHeight:
        () =>
        ({ commands }) =>
          this.options.types.every((type: string) => commands.updateAttributes(type, { lineHeight: null })),
    };
  },
});

export const ParagraphSpacing = Extension.create({
  name: 'paragraphSpacing',
  addOptions() {
    return { types: BLOCK_TYPES };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          paragraphSpacing: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.marginBottom || null,
            renderHTML: (attributes: { paragraphSpacing?: string | null }) => {
              if (!attributes.paragraphSpacing) return {};
              return { style: `margin-bottom: ${attributes.paragraphSpacing}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setParagraphSpacing:
        (spacing: string) =>
        ({ commands }) =>
          this.options.types.every((type: string) => commands.updateAttributes(type, { paragraphSpacing: spacing })),
      unsetParagraphSpacing:
        () =>
        ({ commands }) =>
          this.options.types.every((type: string) => commands.updateAttributes(type, { paragraphSpacing: null })),
    };
  },
});

export const ParagraphSpacingBefore = Extension.create({
  name: 'paragraphSpacingBefore',
  addOptions() {
    return { types: BLOCK_TYPES };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          paragraphSpacingBefore: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.marginTop || null,
            renderHTML: (attributes: { paragraphSpacingBefore?: string | null }) => {
              if (!attributes.paragraphSpacingBefore) return {};
              return { style: `margin-top: ${attributes.paragraphSpacingBefore}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setParagraphSpacingBefore:
        (spacing: string) =>
        ({ commands }) =>
          this.options.types.every((type: string) => commands.updateAttributes(type, { paragraphSpacingBefore: spacing })),
      unsetParagraphSpacingBefore:
        () =>
        ({ commands }) =>
          this.options.types.every((type: string) => commands.updateAttributes(type, { paragraphSpacingBefore: null })),
    };
  },
});

const INDENT_STEP_PX = 24;
const INDENT_MAX_PX = INDENT_STEP_PX * 8;

export const Indent = Extension.create({
  name: 'indent',
  addOptions() {
    return { types: [...BLOCK_TYPES, 'listItem'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element: HTMLElement) => {
              const px = parseInt(element.style.marginLeft || '0', 10);
              return Number.isNaN(px) ? 0 : px;
            },
            renderHTML: (attributes: { indent?: number }) => {
              if (!attributes.indent) return {};
              return { style: `margin-left: ${attributes.indent}px` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      indent:
        () =>
        ({ editor, commands }) => {
          const type = this.options.types.find((t: string) => editor.isActive(t));
          if (!type) return false;
          const current = (editor.getAttributes(type).indent as number) || 0;
          return commands.updateAttributes(type, { indent: Math.min(current + INDENT_STEP_PX, INDENT_MAX_PX) });
        },
      outdent:
        () =>
        ({ editor, commands }) => {
          const type = this.options.types.find((t: string) => editor.isActive(t));
          if (!type) return false;
          const current = (editor.getAttributes(type).indent as number) || 0;
          return commands.updateAttributes(type, { indent: Math.max(current - INDENT_STEP_PX, 0) });
        },
    };
  },
});

export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  parseHTML() {
    return [{ tag: 'div[data-page-break]' }];
  },
  renderHTML() {
    return ['div', { 'data-page-break': 'true', class: 'nchq-page-break', contenteditable: 'false' }];
  },
  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
});
