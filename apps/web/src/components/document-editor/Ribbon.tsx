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

type RibbonTab = 'home' | 'insert' | 'layout' | 'references' | 'review' | 'ai' | 'export';

const RIBBON_TABS: { id: RibbonTab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'insert', label: 'Insert' },
  { id: 'layout', label: 'Layout' },
  { id: 'references', label: 'References' },
  { id: 'review', label: 'Review' },
  { id: 'ai', label: 'AI' },
  { id: 'export', label: 'Export' },
];

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
      className={`shrink-0 min-w-[1.75rem] h-7 px-1.5 lg:min-w-[2rem] lg:h-8 lg:px-2 rounded-md text-xs font-bold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] ${
        active ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#3A3222] border-[#E7DFC9] hover:bg-[#FBF8F1]'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="shrink-0 w-px h-7 lg:h-8 bg-[#E7DFC9] mx-1 lg:mx-1.5" aria-hidden="true" />;
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-stretch gap-1 px-1.5 lg:px-2 shrink-0">
      <div className="flex items-center gap-0.5 lg:gap-1 flex-wrap">{children}</div>
      <span className="text-center text-[9px] font-bold uppercase tracking-widest text-[#B0A588]">{label}</span>
    </div>
  );
}

const selectClass =
  'h-7 lg:h-8 px-1.5 lg:px-2 bg-white border border-[#E7DFC9] rounded-md text-xs font-semibold text-[#3A3222] outline-none focus:border-[#8A6D2F]';

export function Ribbon({ editor, pageSetup, onPageSetupChange, onPrint }: RibbonProps) {
  const [activeTab, setActiveTab] = React.useState<RibbonTab>('home');
  const [textColor, setTextColor] = React.useState('#111111');
  const [styleGalleryOpen, setStyleGalleryOpen] = React.useState(false);
  const [styleGalleryPosition, setStyleGalleryPosition] = React.useState<{ top: number; left: number } | null>(null);
  const styleGalleryButtonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!styleGalleryOpen) {
      setStyleGalleryPosition(null);
      return;
    }
    const button = styleGalleryButtonRef.current;
    if (button) {
      const rect = button.getBoundingClientRect();
      setStyleGalleryPosition({ top: rect.bottom + 4, left: rect.left });
    }
    const close = () => setStyleGalleryOpen(false);
    // Deferred so the click that opened the gallery doesn't immediately close it.
    const id = window.setTimeout(() => window.addEventListener('click', close), 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('click', close);
    };
  }, [styleGalleryOpen]);

  if (!editor) return null;

  const updatePageSetup = (patch: Partial<PageSetup>) => onPageSetupChange({ ...pageSetup, ...patch });

  return (
    <div role="toolbar" aria-label="Document formatting ribbon" className="bg-white border border-[#E7DFC9]/80 rounded-xl shadow-sm">
      {/* No overflow-hidden here: the Styles gallery dropdown below is an
          absolutely-positioned child that must be able to extend past
          this container's bottom edge without being clipped. */}
      <div className="flex items-center justify-between border-b border-[#F4EEE0] px-2">
        <div className="flex items-center overflow-x-auto">
          {RIBBON_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={activeTab === tab.id}
              className={`shrink-0 px-2.5 py-1.5 lg:px-3.5 lg:py-2 text-[10px] lg:text-[11px] font-bold uppercase tracking-wider border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-[#8A6D2F] text-[#111111]' : 'border-transparent text-[#B0A588] hover:text-[#8A6D2F]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 pl-2 shrink-0" aria-label="Quick access">
          <RibbonButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} label="Undo">
            ↺
          </RibbonButton>
          <RibbonButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} label="Redo">
            ↻
          </RibbonButton>
        </div>
      </div>

      <div className="flex items-stretch overflow-x-auto px-1.5 lg:px-2 py-1.5 lg:py-2 min-h-[60px] lg:min-h-[76px]">
        {activeTab === 'home' && (
          <>
            <Group label="Clipboard">
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
            <Group label="Font">
              <select
                aria-label="Font family"
                className={selectClass}
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
                className={selectClass}
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
              <input
                aria-label="Text color"
                type="color"
                value={textColor}
                onChange={(e) => {
                  setTextColor(e.target.value);
                  editor.chain().focus().setColor(e.target.value).run();
                }}
                className="w-8 h-8 rounded-md border border-[#E7DFC9] cursor-pointer"
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
              <RibbonButton onClick={() => editor.chain().focus().unsetHighlight().run()} label="Remove highlight">
                ⌫H
              </RibbonButton>
              <RibbonButton
                onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                label="Clear formatting"
              >
                Aa̶
              </RibbonButton>
            </Group>
            <Divider />
            <Group label="Paragraph">
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
              <select
                aria-label="Line spacing"
                className={selectClass}
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
                className={selectClass}
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
                className={selectClass}
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
            </Group>
            <Divider />
            <Group label="Styles">
              <div>
                <button
                  ref={styleGalleryButtonRef}
                  type="button"
                  onClick={() => setStyleGalleryOpen((v) => !v)}
                  aria-expanded={styleGalleryOpen}
                  aria-label="Style gallery"
                  className="h-8 px-3 bg-white border border-[#E7DFC9] rounded-md text-xs font-bold text-[#3A3222] hover:bg-[#FBF8F1]"
                >
                  Styles ▾
                </button>
                {styleGalleryOpen && styleGalleryPosition && (
                  // Fixed (not absolute) positioning, anchored to the
                  // trigger button's real on-screen coordinates: the
                  // ribbon's own scroll/overflow containers would clip an
                  // absolutely-positioned dropdown before it could extend
                  // below the ribbon's fixed height.
                  <div
                    style={{ top: styleGalleryPosition.top, left: styleGalleryPosition.left }}
                    className="fixed z-30 w-56 bg-white border border-[#E7DFC9] rounded-lg shadow-lg p-1.5 grid grid-cols-1 gap-0.5"
                  >
                    {LEGAL_STYLES.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => {
                          style.apply(editor);
                          setStyleGalleryOpen(false);
                        }}
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
                )}
              </div>
            </Group>
          </>
        )}

        {activeTab === 'insert' && (
          <>
            <Group label="Pages">
              <RibbonButton onClick={() => editor.chain().focus().setPageBreak().run()} label="Insert page break">
                ⤓ Page Break
              </RibbonButton>
            </Group>
            <Divider />
            <Group label="Coming soon">
              <RibbonButton onClick={() => {}} disabled label="Table">
                ⊞ Table
              </RibbonButton>
              <RibbonButton onClick={() => {}} disabled label="Image">
                🖼 Image
              </RibbonButton>
              <RibbonButton onClick={() => {}} disabled label="Link">
                🔗 Link
              </RibbonButton>
            </Group>
          </>
        )}

        {activeTab === 'layout' && (
          <>
            <Group label="Paper">
              <select
                aria-label="Paper size"
                className={selectClass}
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
                className={selectClass}
                value={pageSetup.orientation}
                onChange={(e) => updatePageSetup({ orientation: e.target.value as Orientation })}
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </Group>
            <Divider />
            <Group label="Margins (mm)">
              <input
                aria-label="Top margin"
                type="number"
                min={0}
                max={100}
                value={pageSetup.margins.top}
                onChange={(e) => updatePageSetup({ margins: { ...pageSetup.margins, top: Number(e.target.value) } })}
                className={`${selectClass} w-16`}
              />
              <input
                aria-label="Bottom margin"
                type="number"
                min={0}
                max={100}
                value={pageSetup.margins.bottom}
                onChange={(e) => updatePageSetup({ margins: { ...pageSetup.margins, bottom: Number(e.target.value) } })}
                className={`${selectClass} w-16`}
              />
              <input
                aria-label="Left margin"
                type="number"
                min={0}
                max={100}
                value={pageSetup.margins.left}
                onChange={(e) => updatePageSetup({ margins: { ...pageSetup.margins, left: Number(e.target.value) } })}
                className={`${selectClass} w-16`}
              />
              <input
                aria-label="Right margin"
                type="number"
                min={0}
                max={100}
                value={pageSetup.margins.right}
                onChange={(e) => updatePageSetup({ margins: { ...pageSetup.margins, right: Number(e.target.value) } })}
                className={`${selectClass} w-16`}
              />
            </Group>
          </>
        )}

        {activeTab === 'references' && (
          <p className="text-xs text-[#8A7A56] italic px-2 self-center">
            Citation and cross-reference tools are planned for a future milestone.
          </p>
        )}

        {activeTab === 'review' && (
          <p className="text-xs text-[#8A7A56] italic px-2 self-center">
            Track changes and comments are planned for a future milestone.
          </p>
        )}

        {activeTab === 'ai' && (
          <p className="text-xs text-[#8A7A56] italic px-2 self-center">
            AI drafting assistance is planned for a future milestone.
          </p>
        )}

        {activeTab === 'export' && (
          <>
            <Group label="Print">
              <RibbonButton onClick={onPrint} label="Print / Preview">
                🖨 Print / Preview
              </RibbonButton>
            </Group>
            <Divider />
            <Group label="Coming soon">
              <RibbonButton onClick={() => {}} disabled label="Export PDF">
                Export PDF
              </RibbonButton>
              <RibbonButton onClick={() => {}} disabled label="Export DOCX">
                Export DOCX
              </RibbonButton>
            </Group>
          </>
        )}
      </div>
    </div>
  );
}
