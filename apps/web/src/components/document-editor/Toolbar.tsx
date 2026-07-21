'use client';

import React from 'react';
import type { Editor } from '@tiptap/react';
import { FONT_FAMILIES, FONT_SIZES, LINE_HEIGHTS, PARAGRAPH_SPACINGS } from './useDocumentEditor';

interface ToolbarProps {
  editor: Editor | null;
}

const TEXT_COLORS = ['#111111', '#8A6D2F', '#B91C1C', '#1D4ED8', '#047857'];
const HIGHLIGHT_COLORS = ['#FEF08A', '#BBF7D0', '#BFDBFE', '#FBCFE8', '#FED7AA'];

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`shrink-0 min-w-[2rem] h-8 px-2 rounded-md text-xs font-bold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] ${
        active
          ? 'bg-[#111111] text-white border-[#111111]'
          : 'bg-white text-[#3A3222] border-[#E7DFC9] hover:bg-[#FBF8F1]'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="shrink-0 w-px h-6 bg-[#E7DFC9] mx-1" aria-hidden="true" />;
}

export function Toolbar({ editor }: ToolbarProps) {
  const [textColor, setTextColor] = React.useState('#111111');

  if (!editor) return null;

  const headingValue = editor.isActive('heading', { level: 1 })
    ? '1'
    : editor.isActive('heading', { level: 2 })
      ? '2'
      : editor.isActive('heading', { level: 3 })
        ? '3'
        : 'paragraph';

  return (
    <div
      role="toolbar"
      aria-label="Document formatting"
      className="flex items-center gap-1 overflow-x-auto px-3 py-2 bg-white border border-[#E7DFC9]/80 rounded-xl shadow-sm whitespace-nowrap"
    >
      <select
        aria-label="Paragraph style"
        title="Paragraph style"
        value={headingValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'paragraph') editor.chain().focus().setParagraph().run();
          else editor.chain().focus().toggleHeading({ level: Number(v) as 1 | 2 | 3 }).run();
        }}
        className="shrink-0 h-8 px-2 text-xs font-semibold bg-white border border-[#E7DFC9] rounded-md"
      >
        <option value="paragraph">Normal Text</option>
        <option value="1">Heading 1</option>
        <option value="2">Heading 2</option>
        <option value="3">Heading 3</option>
      </select>

      <select
        aria-label="Font family"
        title="Font family"
        value={editor.getAttributes('textStyle').fontFamily ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v) editor.chain().focus().setFontFamily(v).run();
          else editor.chain().focus().unsetFontFamily().run();
        }}
        className="shrink-0 h-8 px-2 text-xs font-semibold bg-white border border-[#E7DFC9] rounded-md max-w-[9rem]"
      >
        <option value="">Default Font</option>
        {FONT_FAMILIES.map((f) => (
          <option key={f} value={f} style={{ fontFamily: f }}>
            {f}
          </option>
        ))}
      </select>

      <select
        aria-label="Font size"
        title="Font size"
        value={editor.getAttributes('textStyle').fontSize ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v) editor.chain().focus().setFontSize(v).run();
          else editor.chain().focus().unsetFontSize().run();
        }}
        className="shrink-0 h-8 px-2 text-xs font-semibold bg-white border border-[#E7DFC9] rounded-md"
      >
        <option value="">Size</option>
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <Divider />

      <ToolbarButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        B
      </ToolbarButton>
      <ToolbarButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <span className="italic">I</span>
      </ToolbarButton>
      <ToolbarButton
        label="Underline"
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span className="underline">U</span>
      </ToolbarButton>

      <div className="shrink-0 flex items-center gap-1">
        <input
          aria-label="Text colour"
          title="Text colour"
          type="color"
          value={textColor}
          onChange={(e) => {
            setTextColor(e.target.value);
            editor.chain().focus().setColor(e.target.value).run();
          }}
          className="w-8 h-8 p-0.5 border border-[#E7DFC9] rounded-md bg-white cursor-pointer"
        />
        <div className="flex gap-0.5">
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Text colour ${c}`}
              title={c}
              onClick={() => {
                setTextColor(c);
                editor.chain().focus().setColor(c).run();
              }}
              style={{ backgroundColor: c }}
              className="w-4 h-4 rounded-full border border-[#E7DFC9]"
            />
          ))}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-0.5" role="group" aria-label="Highlight colour">
        <ToolbarButton
          label="Remove highlight"
          active={editor.isActive('highlight')}
          onClick={() => editor.chain().focus().unsetHighlight().run()}
        >
          ⬛
        </ToolbarButton>
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Highlight colour ${c}`}
            title={`Highlight ${c}`}
            onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()}
            style={{ backgroundColor: c }}
            className="w-5 h-5 rounded-full border border-[#E7DFC9]"
          />
        ))}
      </div>

      <ToolbarButton
        label="Clear formatting"
        onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
      >
        Tx
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Align left"
        active={editor.isActive({ textAlign: 'left' })}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      >
        ≡←
      </ToolbarButton>
      <ToolbarButton
        label="Align centre"
        active={editor.isActive({ textAlign: 'center' })}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      >
        ≡•
      </ToolbarButton>
      <ToolbarButton
        label="Align right"
        active={editor.isActive({ textAlign: 'right' })}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      >
        →≡
      </ToolbarButton>
      <ToolbarButton
        label="Justify"
        active={editor.isActive({ textAlign: 'justify' })}
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
      >
        ≡≡
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Bullet list"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •—
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.—
      </ToolbarButton>
      <ToolbarButton label="Decrease indent" onClick={() => editor.chain().focus().outdent().run()}>
        ⇤
      </ToolbarButton>
      <ToolbarButton label="Increase indent" onClick={() => editor.chain().focus().indent().run()}>
        ⇥
      </ToolbarButton>

      <Divider />

      <select
        aria-label="Line spacing"
        title="Line spacing"
        value={editor.getAttributes('paragraph').lineHeight ?? editor.getAttributes('heading').lineHeight ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v) editor.chain().focus().setLineHeight(v).run();
          else editor.chain().focus().unsetLineHeight().run();
        }}
        className="shrink-0 h-8 px-2 text-xs font-semibold bg-white border border-[#E7DFC9] rounded-md"
      >
        <option value="">Line spacing</option>
        {LINE_HEIGHTS.map((lh) => (
          <option key={lh} value={lh}>
            {lh}×
          </option>
        ))}
      </select>

      <select
        aria-label="Paragraph spacing before"
        title="Paragraph spacing before"
        value={editor.getAttributes('paragraph').paragraphSpacingBefore ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v) editor.chain().focus().setParagraphSpacingBefore(v).run();
          else editor.chain().focus().unsetParagraphSpacingBefore().run();
        }}
        className="shrink-0 h-8 px-2 text-xs font-semibold bg-white border border-[#E7DFC9] rounded-md"
      >
        <option value="">Space before</option>
        {PARAGRAPH_SPACINGS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        aria-label="Paragraph spacing after"
        title="Paragraph spacing after"
        value={editor.getAttributes('paragraph').paragraphSpacing ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          if (v) editor.chain().focus().setParagraphSpacing(v).run();
          else editor.chain().focus().unsetParagraphSpacing().run();
        }}
        className="shrink-0 h-8 px-2 text-xs font-semibold bg-white border border-[#E7DFC9] rounded-md"
      >
        <option value="">Space after</option>
        {PARAGRAPH_SPACINGS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <Divider />

      <ToolbarButton
        label="Undo"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        ↺
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        ↻
      </ToolbarButton>

      <Divider />

      <ToolbarButton label="Insert page break" onClick={() => editor.chain().focus().setPageBreak().run()}>
        ⤓Pg
      </ToolbarButton>
    </div>
  );
}
