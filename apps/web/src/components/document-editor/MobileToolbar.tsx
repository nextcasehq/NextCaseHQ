'use client';

import React from 'react';
import type { Editor } from '@tiptap/react';
import { FONT_FAMILIES, FONT_SIZES, LINE_HEIGHTS, PARAGRAPH_SPACINGS } from './useDocumentEditor';
import { LEGAL_STYLES } from '@/lib/documents/editor/styles';
import { cutSelection, copySelection, pasteClipboard } from '@/lib/documents/editor/clipboard';

interface MobileToolbarProps {
  editor: Editor | null;
  onPrint: () => void;
}

const TEXT_COLORS = ['#111111', '#8A6D2F', '#B91C1C', '#1D4ED8', '#047857'];
const HIGHLIGHT_COLORS = ['#FEF08A', '#BBF7D0', '#BFDBFE', '#FBCFE8', '#FED7AA'];

const selectClass =
  'h-9 px-2 bg-white border border-[#E7DFC9] rounded-md text-xs font-semibold text-[#3A3222] outline-none focus:border-[#8A6D2F]';

function MiniButton({
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
      // Explicit pixel values, not the w-8/h-8 scale step: this repo's
      // tailwind.config.ts overrides spacing['8'] to 64px (2x the
      // Tailwind default) for the desktop ribbon's deliberately chunky
      // buttons. 34px here clears WCAG 2.2's 24px minimum target size
      // while keeping all 8 primary-row actions (undo/redo, bold/italic/
      // underline, lists, More) on-screen without horizontal scrolling
      // even at the narrowest supported width (360px).
      className={`shrink-0 w-[34px] h-[34px] flex items-center justify-center rounded-md text-sm font-bold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] ${
        active ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#3A3222] border-[#E7DFC9] active:bg-[#FBF8F1]'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

function MoreSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-[9px] font-bold uppercase tracking-widest text-[#B0A588]">{label}</span>
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </div>
  );
}

/**
 * Dedicated mobile editing toolbar — not a shrunk copy of the desktop
 * Ribbon. Only the highest-frequency actions (undo/redo, bold/italic/
 * underline, lists) sit in the always-visible row so the row itself stays
 * a single 44px-tall strip and the document canvas keeps most of a small
 * screen. Everything else (fonts, color, alignment, indent, line/paragraph
 * spacing, styles, clipboard, page break, print) lives behind "More" in a
 * bottom sheet, reusing the same editor commands the desktop Ribbon calls.
 */
export function MobileToolbar({ editor, onPrint }: MobileToolbarProps) {
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [textColor, setTextColor] = React.useState('#111111');

  if (!editor) return null;

  return (
    <>
      <div
        role="toolbar"
        aria-label="Mobile formatting toolbar"
        className="no-print md:hidden shrink-0 bg-white border-b border-[#E7DFC9]/80 px-2 py-1.5"
      >
        <div className="flex items-center gap-[2px] overflow-x-auto">
          <MiniButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} label="Undo">
            ↺
          </MiniButton>
          <MiniButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} label="Redo">
            ↻
          </MiniButton>
          <span className="w-px h-[20px] bg-[#E7DFC9] mx-[2px] shrink-0" aria-hidden="true" />
          <MiniButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} label="Bold">
            B
          </MiniButton>
          <MiniButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} label="Italic">
            <span className="italic">I</span>
          </MiniButton>
          <MiniButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            label="Underline"
          >
            <span className="underline">U</span>
          </MiniButton>
          <span className="w-px h-[20px] bg-[#E7DFC9] mx-[2px] shrink-0" aria-hidden="true" />
          <MiniButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            label="Bullet list"
          >
            •≡
          </MiniButton>
          <MiniButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            label="Numbered list"
          >
            1≡
          </MiniButton>
          <span className="w-px h-[20px] bg-[#E7DFC9] mx-[2px] shrink-0" aria-hidden="true" />
          <MiniButton onClick={() => setMoreOpen(true)} label="More formatting options">
            ⋯
          </MiniButton>
        </div>
      </div>

      {moreOpen && (
        <div className="no-print fixed inset-0 z-50 md:hidden" role="dialog" aria-label="More formatting options" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 max-h-[75vh] overflow-y-auto bg-white rounded-t-2xl shadow-2xl p-4 space-y-4">
            <div className="flex items-center justify-between sticky -top-4 bg-white pt-0.5 pb-1">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">More Formatting</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close"
                className="text-[#B0A588] hover:text-[#8A6D2F] text-xs font-bold uppercase tracking-widest"
              >
                ✕ Close
              </button>
            </div>

            <MoreSection label="Clipboard">
              <MiniButton onClick={() => void cutSelection(editor)} label="Cut">
                ✂
              </MiniButton>
              <MiniButton onClick={() => void copySelection(editor)} label="Copy">
                ⧉
              </MiniButton>
              <MiniButton onClick={() => void pasteClipboard(editor)} label="Paste">
                📋
              </MiniButton>
            </MoreSection>

            <MoreSection label="Font">
              <select
                aria-label="Font family"
                className={`${selectClass} flex-1 min-w-[8rem]`}
                value={editor.getAttributes('textStyle').fontFamily || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) editor.chain().focus().setFontFamily(value).run();
                  else editor.chain().focus().unsetFontFamily().run();
                }}
              >
                <option value="">Font</option>
                {FONT_FAMILIES.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
              <select
                aria-label="Font size"
                className={`${selectClass} w-20`}
                value={editor.getAttributes('textStyle').fontSize || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) editor.chain().focus().setFontSize(value).run();
                  else editor.chain().focus().unsetFontSize().run();
                }}
              >
                <option value="">Size</option>
                {FONT_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </MoreSection>

            <MoreSection label="Color">
              <input
                aria-label="Text color"
                type="color"
                value={textColor}
                onChange={(e) => {
                  setTextColor(e.target.value);
                  editor.chain().focus().setColor(e.target.value).run();
                }}
                className="w-9 h-9 rounded-md border border-[#E7DFC9] cursor-pointer"
              />
              {TEXT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Text color ${color}`}
                  onClick={() => editor.chain().focus().setColor(color).run()}
                  style={{ backgroundColor: color }}
                  className="w-7 h-7 rounded-full border border-[#E7DFC9] shrink-0"
                />
              ))}
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Highlight ${color}`}
                  onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                  style={{ backgroundColor: color }}
                  className="w-7 h-7 rounded-full border border-[#E7DFC9] shrink-0"
                />
              ))}
              <MiniButton onClick={() => editor.chain().focus().unsetHighlight().run()} label="Remove highlight">
                ⌫H
              </MiniButton>
              <MiniButton onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} label="Clear formatting">
                Aa̶
              </MiniButton>
            </MoreSection>

            <MoreSection label="Paragraph">
              <MiniButton
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                active={editor.isActive({ textAlign: 'left' })}
                label="Align left"
              >
                ⯇
              </MiniButton>
              <MiniButton
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                active={editor.isActive({ textAlign: 'center' })}
                label="Align center"
              >
                ☰
              </MiniButton>
              <MiniButton
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                active={editor.isActive({ textAlign: 'right' })}
                label="Align right"
              >
                ⯈
              </MiniButton>
              <MiniButton
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                active={editor.isActive({ textAlign: 'justify' })}
                label="Justify"
              >
                ▤
              </MiniButton>
              <MiniButton onClick={() => editor.chain().focus().outdent().run()} label="Decrease indent">
                ⇤
              </MiniButton>
              <MiniButton onClick={() => editor.chain().focus().indent().run()} label="Increase indent">
                ⇥
              </MiniButton>
              <select
                aria-label="Line spacing"
                className={`${selectClass} flex-1 min-w-[7rem]`}
                value={editor.getAttributes('paragraph').lineHeight || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) editor.chain().focus().setLineHeight(value).run();
                  else editor.chain().focus().unsetLineHeight().run();
                }}
              >
                <option value="">Line spacing</option>
                {LINE_HEIGHTS.map((lh) => (
                  <option key={lh} value={lh}>
                    {lh}
                  </option>
                ))}
              </select>
              <select
                aria-label="Spacing before paragraph"
                className={`${selectClass} flex-1 min-w-[7rem]`}
                value={editor.getAttributes('paragraph').paragraphSpacingBefore || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) editor.chain().focus().setParagraphSpacingBefore(value).run();
                  else editor.chain().focus().unsetParagraphSpacingBefore().run();
                }}
              >
                <option value="">Space before</option>
                {PARAGRAPH_SPACINGS.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp}
                  </option>
                ))}
              </select>
              <select
                aria-label="Spacing after paragraph"
                className={`${selectClass} flex-1 min-w-[7rem]`}
                value={editor.getAttributes('paragraph').paragraphSpacing || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) editor.chain().focus().setParagraphSpacing(value).run();
                  else editor.chain().focus().unsetParagraphSpacing().run();
                }}
              >
                <option value="">Space after</option>
                {PARAGRAPH_SPACINGS.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp}
                  </option>
                ))}
              </select>
            </MoreSection>

            <MoreSection label="Styles">
              <div className="grid grid-cols-2 gap-1.5 w-full">
                {LEGAL_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => style.apply(editor)}
                    aria-pressed={style.isActive(editor)}
                    className={`text-left px-2.5 py-2 rounded-md text-xs font-semibold transition-colors ${
                      style.isActive(editor) ? 'bg-[#111111] text-white' : 'text-[#3A3222] bg-[#FBF8F1] hover:bg-[#F4EEE0]'
                    }`}
                    title={style.description}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
            </MoreSection>

            <MoreSection label="Page">
              <button
                type="button"
                onClick={() => editor.chain().focus().setPageBreak().run()}
                className="h-9 px-3 bg-white border border-[#E7DFC9] rounded-md text-xs font-bold text-[#3A3222] hover:bg-[#FBF8F1]"
              >
                ⤓ Page Break
              </button>
              <button
                type="button"
                onClick={onPrint}
                className="h-9 px-3 bg-white border border-[#E7DFC9] rounded-md text-xs font-bold text-[#3A3222] hover:bg-[#FBF8F1]"
              >
                🖨 Print / Preview
              </button>
            </MoreSection>
          </div>
        </div>
      )}
    </>
  );
}
