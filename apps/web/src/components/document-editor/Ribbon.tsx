'use client';

import React from 'react';
import type { Editor } from '@tiptap/react';
import { FONT_FAMILIES, FONT_SIZES, LINE_HEIGHTS, PARAGRAPH_SPACINGS } from './useDocumentEditor';
import { LEGAL_STYLES } from '@/lib/documents/editor/styles';
import { PAPER_SIZE_LABELS, type PageSetup, type PaperSize, type Orientation } from '@/lib/documents/editor/page-setup';
import { cutSelection, copySelection, pasteClipboard } from '@/lib/documents/editor/clipboard';

interface RibbonProps {
  editor: Editor | null;
  pageSetup: PageSetup;
  onPageSetupChange: (next: PageSetup) => void;
  onPrint: () => void;
}

const TEXT_COLORS = ['#111111', '#8A6D2F', '#B91C1C', '#1D4ED8', '#047857'];
const HIGHLIGHT_COLORS = ['#FEF08A', '#BBF7D0', '#BFDBFE', '#FBCFE8', '#FED7AA'];

// Explicit pixel values throughout this file, not Tailwind's numbered
// spacing scale: this repo's tailwind.config.ts overrides spacing['8'] to
// 64px (2x the default) for what was the ribbon's old, much chunkier
// sizing — arbitrary values sidestep that scale entirely so a button
// genuinely renders at the size written here.
function RibbonButton({
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
      title={disabled ? `${label} — coming soon` : label}
      className={`shrink-0 min-w-[26px] h-[26px] px-1 rounded text-[11px] font-bold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] ${
        active ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#3A3222] border-[#E7DFC9] hover:bg-[#FBF8F1]'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="shrink-0 w-px h-[20px] bg-[#E7DFC9] mx-[6px] self-center" aria-hidden="true" />;
}

// No group caption ("CLIPBOARD", "FONT", ...) beneath each cluster — Notion,
// Google Docs, and Figma's own property panels rely on icon tooltips, not a
// permanent label row under every group, and dropping it removes an entire
// text line's worth of height from every group.
function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-[3px] px-[6px] shrink-0">{children}</div>;
}

const selectClass =
  'h-[26px] px-1 bg-white border border-[#E7DFC9] rounded text-[11px] font-semibold text-[#3A3222] outline-none focus:border-[#8A6D2F]';

function useOutsideClose(open: boolean, close: () => void) {
  React.useEffect(() => {
    if (!open) return;
    const handler = () => close();
    const id = window.setTimeout(() => window.addEventListener('click', handler), 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('click', handler);
    };
  }, [open, close]);
}

/**
 * A single compact trigger button that opens a small fixed-positioned
 * flyout panel anchored to itself. Used two ways here: collapsing
 * secondary formatting controls (color swatches, spacing selects, the
 * style gallery) behind one button each, the same treatment Google Docs/
 * Notion/Figma give secondary controls; and, for Insert/Layout/Export,
 * replacing what used to be mutually-exclusive ribbon TABS — a tab switch
 * hid the Home formatting tools entirely, real friction for someone
 * typing continuously, since Insert/Layout/Export are each touched at
 * most a few times per document. A dropdown keeps Home always visible
 * and reachable in the same click.
 */
function DropdownButton({
  label,
  buttonContent,
  children,
}: {
  label: string;
  buttonContent: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const close = React.useCallback(() => setOpen(false), []);
  useOutsideClose(open, close);

  React.useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setPosition({ top: rect.bottom + 4, left: rect.left });
  }, [open]);

  return (
    <div>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-label={label}
        title={label}
        className="shrink-0 h-[26px] px-1.5 flex items-center gap-1 rounded text-[11px] font-bold text-[#3A3222] bg-white border border-[#E7DFC9] hover:bg-[#FBF8F1]"
      >
        {buttonContent}
        <span className="text-[8px] text-[#B0A588]">▾</span>
      </button>
      {open && position && (
        // Fixed (not absolute) positioning, anchored to the trigger
        // button's real on-screen coordinates: the ribbon's own scroll/
        // overflow containers would clip an absolutely-positioned dropdown
        // before it could extend below the ribbon's now much shorter height.
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ top: position.top, left: position.left }}
          className="fixed z-30 bg-white border border-[#E7DFC9] rounded-lg shadow-lg p-2"
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function Ribbon({ editor, pageSetup, onPageSetupChange, onPrint }: RibbonProps) {
  const [textColor, setTextColor] = React.useState('#111111');

  if (!editor) return null;

  const updatePageSetup = (patch: Partial<PageSetup>) => onPageSetupChange({ ...pageSetup, ...patch });

  return (
    <div
      role="toolbar"
      aria-label="Document formatting ribbon"
      className="flex items-center overflow-x-auto bg-white border border-[#E7DFC9]/80 rounded-lg shadow-sm px-1.5 py-1 min-h-[34px]"
    >
      <Group>
        <RibbonButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} label="Undo">
          ↺
        </RibbonButton>
        <RibbonButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} label="Redo">
          ↻
        </RibbonButton>
      </Group>
      <Divider />
      <Group>
        <RibbonButton onClick={() => void cutSelection(editor)} label="Cut">
          ✂
        </RibbonButton>
        <RibbonButton onClick={() => void copySelection(editor)} label="Copy">
          ⧉
        </RibbonButton>
        <RibbonButton onClick={() => void pasteClipboard(editor)} label="Paste">
          📋
        </RibbonButton>
      </Group>
      <Divider />
      <Group>
        <select
          aria-label="Font family"
          className={`${selectClass} w-24`}
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
          className={`${selectClass} w-14`}
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
        <RibbonButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} label="Bold">
          B
        </RibbonButton>
        <RibbonButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} label="Italic">
          I
        </RibbonButton>
        <RibbonButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          label="Underline"
        >
          U
        </RibbonButton>
        {/* Text color, highlight, and clear-formatting used to be 12
            separate always-visible controls (a color input, 5 text
            swatches, 5 highlight swatches, remove-highlight) — collapsed
            into one dropdown, the same way Google Docs keeps its color
            picker behind a single button rather than spreading swatches
            across the toolbar. */}
        <DropdownButton
          label="Text color and highlight"
          buttonContent={
            <span className="w-3 h-3 rounded-full border border-[#E7DFC9]" style={{ backgroundColor: textColor }} aria-hidden="true" />
          }
        >
          <div className="w-44 space-y-2">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#B0A588] mb-1">Text color</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <input
                  aria-label="Text color"
                  type="color"
                  value={textColor}
                  onChange={(e) => {
                    setTextColor(e.target.value);
                    editor.chain().focus().setColor(e.target.value).run();
                  }}
                  className="w-6 h-6 rounded border border-[#E7DFC9] cursor-pointer"
                />
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Text color ${color}`}
                    onClick={() => editor.chain().focus().setColor(color).run()}
                    style={{ backgroundColor: color }}
                    className="w-5 h-5 rounded-full border border-[#E7DFC9] shrink-0"
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#B0A588] mb-1">Highlight</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Highlight ${color}`}
                    onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                    style={{ backgroundColor: color }}
                    className="w-5 h-5 rounded-full border border-[#E7DFC9] shrink-0"
                  />
                ))}
                <button
                  type="button"
                  onClick={() => editor.chain().focus().unsetHighlight().run()}
                  aria-label="Remove highlight"
                  className="h-5 px-1.5 rounded border border-[#E7DFC9] text-[10px] font-bold text-[#3A3222] hover:bg-[#FBF8F1]"
                >
                  ⌫H
                </button>
              </div>
            </div>
          </div>
        </DropdownButton>
        <RibbonButton onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} label="Clear formatting">
          Aa̶
        </RibbonButton>
      </Group>
      <Divider />
      <Group>
        <RibbonButton onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} label="Align left">
          ⯇
        </RibbonButton>
        <RibbonButton onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} label="Align center">
          ☰
        </RibbonButton>
        <RibbonButton onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} label="Align right">
          ⯈
        </RibbonButton>
        <RibbonButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} label="Justify">
          ▤
        </RibbonButton>
        <RibbonButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} label="Bullet list">
          •≡
        </RibbonButton>
        <RibbonButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} label="Numbered list">
          1≡
        </RibbonButton>
        <RibbonButton onClick={() => editor.chain().focus().outdent().run()} label="Decrease indent">
          ⇤
        </RibbonButton>
        <RibbonButton onClick={() => editor.chain().focus().indent().run()} label="Increase indent">
          ⇥
        </RibbonButton>
        {/* Line spacing + space-before + space-after were 3 always-visible
            selects — collapsed into one "Spacing" dropdown, the same
            treatment as color above. */}
        <DropdownButton label="Paragraph spacing" buttonContent="Spacing">
          <div className="w-40 space-y-2">
            <label className="block">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#B0A588]">Line spacing</span>
              <select
                aria-label="Line spacing"
                className={`${selectClass} w-full mt-0.5`}
                value={editor.getAttributes('paragraph').lineHeight || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) editor.chain().focus().setLineHeight(value).run();
                  else editor.chain().focus().unsetLineHeight().run();
                }}
              >
                <option value="">Default</option>
                {LINE_HEIGHTS.map((lh) => (
                  <option key={lh} value={lh}>
                    {lh}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#B0A588]">Space before</span>
              <select
                aria-label="Spacing before paragraph"
                className={`${selectClass} w-full mt-0.5`}
                value={editor.getAttributes('paragraph').paragraphSpacingBefore || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) editor.chain().focus().setParagraphSpacingBefore(value).run();
                  else editor.chain().focus().unsetParagraphSpacingBefore().run();
                }}
              >
                <option value="">Default</option>
                {PARAGRAPH_SPACINGS.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#B0A588]">Space after</span>
              <select
                aria-label="Spacing after paragraph"
                className={`${selectClass} w-full mt-0.5`}
                value={editor.getAttributes('paragraph').paragraphSpacing || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) editor.chain().focus().setParagraphSpacing(value).run();
                  else editor.chain().focus().unsetParagraphSpacing().run();
                }}
              >
                <option value="">Default</option>
                {PARAGRAPH_SPACINGS.map((sp) => (
                  <option key={sp} value={sp}>
                    {sp}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </DropdownButton>
        <DropdownButton label="Style gallery" buttonContent="Styles">
          <div className="w-56 grid grid-cols-1 gap-0.5">
            {LEGAL_STYLES.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => editor && style.apply(editor)}
                aria-pressed={style.isActive(editor)}
                className={`text-left px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  style.isActive(editor) ? 'bg-[#111111] text-white' : 'text-[#3A3222] hover:bg-[#FBF8F1]'
                }`}
                title={style.description}
              >
                {style.name}
              </button>
            ))}
          </div>
        </DropdownButton>
      </Group>
      <Divider />
      {/* Insert/Layout/Export used to be ribbon TABS — clicking one hid
          every Home control above until you clicked back. Each is touched
          at most a few times per document (a page break, a paper-size
          tweak, printing), so they're dropdown menus instead: Home stays
          reachable in the same click no matter which of these is open. */}
      <Group>
        <DropdownButton label="Insert" buttonContent="Insert">
          <div className="w-40">
            <button
              type="button"
              onClick={() => editor.chain().focus().setPageBreak().run()}
              className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-semibold text-[#3A3222] hover:bg-[#FBF8F1]"
            >
              ⤓ Page Break
            </button>
          </div>
        </DropdownButton>
        <DropdownButton label="Layout" buttonContent="Layout">
          <div className="w-48 space-y-2">
            <div className="flex items-center gap-1.5">
              <select
                aria-label="Paper size"
                className={`${selectClass} flex-1`}
                value={pageSetup.paperSize}
                onChange={(e) => updatePageSetup({ paperSize: e.target.value as PaperSize })}
              >
                {(Object.keys(PAPER_SIZE_LABELS) as PaperSize[]).map((size) => (
                  <option key={size} value={size}>
                    {PAPER_SIZE_LABELS[size]}
                  </option>
                ))}
              </select>
              <select
                aria-label="Orientation"
                className={`${selectClass} flex-1`}
                value={pageSetup.orientation}
                onChange={(e) => updatePageSetup({ orientation: e.target.value as Orientation })}
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-[#B0A588]">Margins (mm)</p>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#B0A588]">Top</span>
                <input
                  aria-label="Top margin"
                  type="number"
                  min={0}
                  max={100}
                  value={pageSetup.margins.top}
                  onChange={(e) => updatePageSetup({ margins: { ...pageSetup.margins, top: Number(e.target.value) } })}
                  className={`${selectClass} w-full mt-0.5`}
                />
              </label>
              <label className="block">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#B0A588]">Bottom</span>
                <input
                  aria-label="Bottom margin"
                  type="number"
                  min={0}
                  max={100}
                  value={pageSetup.margins.bottom}
                  onChange={(e) => updatePageSetup({ margins: { ...pageSetup.margins, bottom: Number(e.target.value) } })}
                  className={`${selectClass} w-full mt-0.5`}
                />
              </label>
              <label className="block">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#B0A588]">Left</span>
                <input
                  aria-label="Left margin"
                  type="number"
                  min={0}
                  max={100}
                  value={pageSetup.margins.left}
                  onChange={(e) => updatePageSetup({ margins: { ...pageSetup.margins, left: Number(e.target.value) } })}
                  className={`${selectClass} w-full mt-0.5`}
                />
              </label>
              <label className="block">
                <span className="text-[9px] font-bold uppercase tracking-widest text-[#B0A588]">Right</span>
                <input
                  aria-label="Right margin"
                  type="number"
                  min={0}
                  max={100}
                  value={pageSetup.margins.right}
                  onChange={(e) => updatePageSetup({ margins: { ...pageSetup.margins, right: Number(e.target.value) } })}
                  className={`${selectClass} w-full mt-0.5`}
                />
              </label>
            </div>
          </div>
        </DropdownButton>
        <DropdownButton label="Export" buttonContent="Export">
          <div className="w-40">
            <button
              type="button"
              onClick={onPrint}
              className="w-full text-left px-2.5 py-1.5 rounded-md text-xs font-semibold text-[#3A3222] hover:bg-[#FBF8F1]"
            >
              🖨 Print / Preview
            </button>
          </div>
        </DropdownButton>
      </Group>
    </div>
  );
}
