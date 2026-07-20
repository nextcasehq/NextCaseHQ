'use client';

import React, { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import {
  DRAFT_TEMPLATES,
  DRAFT_TEMPLATE_CATEGORIES,
  RECENTLY_USED_TEMPLATE_IDS,
  EXISTING_MATTER_OPTIONS,
  CASE_TYPE_OPTIONS,
  AI_ASSIST_ACTIONS,
  type DraftTemplate,
  type TemplateCategory,
} from './templates-data';

type PageSize = 'A4' | 'Letter' | 'Legal';
type Orientation = 'portrait' | 'landscape';
type Margins = 'narrow' | 'normal' | 'wide';

const PAGE_MAX_WIDTH: Record<PageSize, number> = { A4: 800, Letter: 816, Legal: 816 };
const LANDSCAPE_MAX_WIDTH = 1100;
const MARGIN_PADDING: Record<Margins, number> = { narrow: 32, normal: 64, wide: 112 };
const FONT_FAMILIES = [
  'Times New Roman, serif',
  'Georgia, serif',
  'Garamond, serif',
  'Arial, sans-serif',
  'Calibri, sans-serif',
  'Courier New, monospace',
];
const FONT_SIZES = ['10pt', '11pt', '12pt', '13pt', '14pt'];
const HEADING_OPTIONS: { label: string; value: string }[] = [
  { label: 'Normal', value: 'p' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
];

interface MatterRegister {
  mode: 'new' | 'link';
  name: string;
  number?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function textToHtml(text: string): string {
  return text
    .split('\n\n')
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export default function DraftDocumentPrototypePage() {
  const editorRef = useRef<HTMLDivElement>(null);

  // Template library state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'ALL'>('ALL');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editorHeader, setEditorHeader] = useState('');
  const [wordCount, setWordCount] = useState(0);

  // Toolbar / page setup state
  const [pageSize, setPageSize] = useState<PageSize>('A4');
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [margins, setMargins] = useState<Margins>('normal');
  const [fontFamily, setFontFamily] = useState(FONT_FAMILIES[0]);
  const [fontSize, setFontSize] = useState('12pt');
  const [showHeaderFooter, setShowHeaderFooter] = useState(false);
  const [showPageNumbers, setShowPageNumbers] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [findReplaceNotice, setFindReplaceNotice] = useState<string | null>(null);
  const [showAiMenu, setShowAiMenu] = useState(false);

  // Neutral, prototype-labelled notices — never a fabricated success message.
  const [notice, setNotice] = useState<string | null>(null);

  // Matter Register prototype state
  const [showMatterModal, setShowMatterModal] = useState(false);
  const [pendingSaveAfterRegister, setPendingSaveAfterRegister] = useState(false);
  const [matterTab, setMatterTab] = useState<'new' | 'link'>('new');
  const [matterName, setMatterName] = useState('');
  const [matterNumber, setMatterNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [opposingParty, setOpposingParty] = useState('');
  const [court, setCourt] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [caseType, setCaseType] = useState(CASE_TYPE_OPTIONS[0]);
  const [linkedMatterId, setLinkedMatterId] = useState('');
  const [register, setRegister] = useState<MatterRegister | null>(null);

  const syncWordCount = useCallback(() => {
    if (!editorRef.current) return;
    setWordCount(countWords(editorRef.current.innerText));
  }, []);

  const loadTemplate = (template: DraftTemplate) => {
    setSelectedTemplateId(template.id);
    setEditorHeader(template.header);
    if (editorRef.current) {
      editorRef.current.innerHTML = textToHtml(template.body);
    }
    syncWordCount();
  };

  const loadBlank = () => {
    setSelectedTemplateId('blank');
    setEditorHeader('');
    if (editorRef.current) {
      editorRef.current.innerHTML = '<p><br/></p>';
    }
    syncWordCount();
  };

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    syncWordCount();
  };

  const handleInsertTable = () => {
    editorRef.current?.focus();
    const tableHtml =
      '<table style="border-collapse:collapse;width:100%;margin:12px 0;"><tbody>' +
      Array.from({ length: 3 })
        .map(
          () =>
            '<tr>' +
            Array.from({ length: 3 })
              .map(() => '<td style="border:1px solid #B0A588;padding:8px;min-width:60px;">&nbsp;</td>')
              .join('') +
            '</tr>'
        )
        .join('') +
      '</tbody></table>';
    document.execCommand('insertHTML', false, tableHtml);
    syncWordCount();
  };

  const handleReplaceAll = () => {
    if (!editorRef.current || !findText) return;
    const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let node = walker.nextNode();
    while (node) {
      nodes.push(node as Text);
      node = walker.nextNode();
    }
    const pattern = new RegExp(escapeRegExp(findText), 'gi');
    let count = 0;
    nodes.forEach((textNode) => {
      const content = textNode.textContent || '';
      if (pattern.test(content)) {
        pattern.lastIndex = 0;
        textNode.textContent = content.replace(pattern, () => {
          count += 1;
          return replaceText;
        });
      }
      pattern.lastIndex = 0;
    });
    syncWordCount();
    setFindReplaceNotice(`Replaced ${count} occurrence${count === 1 ? '' : 's'}.`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAiAssistAction = (label: string) => {
    setShowAiMenu(false);
    setNotice(`Prototype interaction — "${label}" is not connected to a real AI model in this milestone.`);
  };

  const openMatterModal = (pendingSave: boolean) => {
    setPendingSaveAfterRegister(pendingSave);
    setShowMatterModal(true);
  };

  const handleMatterModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (matterTab === 'new') {
      if (!matterName.trim()) return;
      setRegister({ mode: 'new', name: matterName.trim(), number: matterNumber.trim() || undefined });
    } else {
      const existing = EXISTING_MATTER_OPTIONS.find((m) => m.id === linkedMatterId);
      if (!existing) return;
      setRegister({ mode: 'link', name: existing.label });
    }
    setShowMatterModal(false);
    if (pendingSaveAfterRegister) {
      setNotice('First document saved as the opening record of the Matter Register (prototype only — no data is persisted).');
    } else {
      setNotice(`Matter Register ${matterTab === 'new' ? 'created' : 'linked'} (prototype only — no data is persisted).`);
    }
    setPendingSaveAfterRegister(false);
  };

  const handleSaveDraftClick = () => {
    if (!register) {
      openMatterModal(true);
      return;
    }
    setNotice(`Draft saved to "${register.name}" (prototype only — no data is persisted).`);
  };

  const filteredTemplates = DRAFT_TEMPLATES.filter((t) => {
    const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery = !q || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  const recentlyUsedTemplates = RECENTLY_USED_TEMPLATE_IDS.map((id) => DRAFT_TEMPLATES.find((t) => t.id === id)).filter(
    (t): t is DraftTemplate => Boolean(t)
  );

  const pageMaxWidth = orientation === 'landscape' ? LANDSCAPE_MAX_WIDTH : PAGE_MAX_WIDTH[pageSize];

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans selection:bg-[#8A6D2F] selection:text-white">
      {/* Prototype identification banner — this whole route is a UX exploration surface, not a production feature. */}
      <div className="bg-[#111111] text-[#FDFBF7] px-4 py-2 text-center text-[10px] md:text-[11px] font-bold uppercase tracking-widest">
        Prototype — Draft Document workspace. Product-direction exploration only. No drafts are saved, no AI is called, nothing is written to production.
      </div>

      <header className="border-b border-[#111111]/10 px-4 md:px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/matters" className="text-[10px] font-bold uppercase tracking-widest text-[#B0A588] hover:text-[#8A6D2F]">
            ← Back to Matters
          </Link>
          <h1 className="text-lg md:text-xl font-black uppercase tracking-widest mt-1">Draft Document</h1>
          <p className="text-xs font-serif italic text-[#111111]/60">Prototype drafting workspace and Matter Register concept.</p>
        </div>
        {register && (
          <div className="text-xs font-semibold text-[#5C5340] bg-[#FBF6EA] border border-[#C6A253]/40 rounded-lg px-3 py-2 max-w-sm">
            Matter Register: {register.name}
            {register.number ? ` (${register.number})` : ''} — {register.mode === 'new' ? 'created' : 'linked'} (prototype)
          </div>
        )}
      </header>

      {notice && (
        <div className="mx-4 md:mx-6 mt-4 p-4 bg-[#FBF6EA] border border-[#C6A253]/40 rounded-xl flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs font-semibold text-[#5C5340]">{notice}</p>
          <button
            onClick={() => setNotice(null)}
            className="text-xs font-bold text-[#B0A588] hover:text-[#8A7A56]"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 md:p-6 min-w-0">
        {/* LEFT: Template Library */}
        <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-4 min-w-0">
          <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">Template Library</h2>
            <div className="flex items-center bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg p-1.5">
              <span className="pl-2 pr-2 text-[#B0A588]">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full bg-transparent border-none outline-none text-xs md:text-sm font-medium placeholder-[#B0A588] py-1"
              />
            </div>

            <button
              onClick={loadBlank}
              className={`w-full text-left p-3 text-xs font-bold rounded-lg uppercase tracking-wider transition-all border ${
                selectedTemplateId === 'blank'
                  ? 'bg-[#111111] border-[#111111] text-[#FDFBF7]'
                  : 'bg-[#FBF8F1] border-[#E7DFC9] text-[#3A3222] hover:bg-[#F4EEE0]'
              }`}
            >
              + Blank Document
            </button>

            {recentlyUsedTemplates.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#B0A588]">Recently Used</h3>
                {recentlyUsedTemplates.map((t) => (
                  <button
                    key={`recent-${t.id}`}
                    onClick={() => loadTemplate(t)}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-[#5C5340] rounded-lg border border-[#E7DFC9] bg-[#FBF8F1] hover:bg-[#F4EEE0] transition-all"
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#B0A588]">Categories</h3>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                    selectedCategory === 'ALL'
                      ? 'bg-[#8A6D2F] border-[#8A6D2F] text-white'
                      : 'bg-[#FBF8F1] border-[#E7DFC9] text-[#5C5340] hover:bg-[#F4EEE0]'
                  }`}
                >
                  All
                </button>
                {DRAFT_TEMPLATE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                      selectedCategory === cat
                        ? 'bg-[#8A6D2F] border-[#8A6D2F] text-white'
                        : 'bg-[#FBF8F1] border-[#E7DFC9] text-[#5C5340] hover:bg-[#F4EEE0]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#B0A588]">
                {filteredTemplates.length} Template{filteredTemplates.length === 1 ? '' : 's'}
              </h3>
              {filteredTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => loadTemplate(t)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedTemplateId === t.id
                      ? 'bg-[#111111] border-[#111111] text-[#FDFBF7]'
                      : 'bg-[#FBF8F1] border-[#E7DFC9] text-[#3A3222] hover:bg-[#F4EEE0]'
                  }`}
                >
                  <span
                    className={`block text-[9px] uppercase tracking-wider mb-1 ${
                      selectedTemplateId === t.id ? 'opacity-70' : 'opacity-50'
                    }`}
                  >
                    {t.category}
                  </span>
                  <span className="text-xs font-bold">{t.name}</span>
                </button>
              ))}
              {filteredTemplates.length === 0 && (
                <p className="text-xs text-[#B0A588] italic px-1 py-3">No templates match this search.</p>
              )}
            </div>
          </div>
        </aside>

        {/* RIGHT: Drafting Workspace */}
        <section className="flex-1 min-w-0 space-y-4">
          {/* Toolbar */}
          <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-3 flex flex-wrap items-center gap-2 overflow-x-auto">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as PageSize)}
              title="Page size"
              className="text-[10px] font-bold uppercase tracking-wider border border-[#E7DFC9] rounded-lg px-2 py-1.5 bg-[#FBF8F1] text-[#5C5340]"
            >
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
              <option value="Legal">Legal</option>
            </select>
            <button
              onClick={() => setOrientation((o) => (o === 'portrait' ? 'landscape' : 'portrait'))}
              title="Toggle orientation"
              className="text-[10px] font-bold uppercase tracking-wider border border-[#E7DFC9] rounded-lg px-2.5 py-1.5 bg-[#FBF8F1] text-[#5C5340] hover:bg-[#F4EEE0]"
            >
              {orientation === 'portrait' ? 'Portrait' : 'Landscape'}
            </button>
            <select
              value={margins}
              onChange={(e) => setMargins(e.target.value as Margins)}
              title="Margins"
              className="text-[10px] font-bold uppercase tracking-wider border border-[#E7DFC9] rounded-lg px-2 py-1.5 bg-[#FBF8F1] text-[#5C5340]"
            >
              <option value="narrow">Narrow Margins</option>
              <option value="normal">Normal Margins</option>
              <option value="wide">Wide Margins</option>
            </select>

            <span className="w-px h-6 bg-[#E7DFC9]" />

            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              title="Font family"
              className="text-[10px] font-bold border border-[#E7DFC9] rounded-lg px-2 py-1.5 bg-[#FBF8F1] text-[#5C5340] max-w-[130px]"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {f.split(',')[0]}
                </option>
              ))}
            </select>
            <select
              value={fontSize}
              onChange={(e) => setFontSize(e.target.value)}
              title="Font size"
              className="text-[10px] font-bold border border-[#E7DFC9] rounded-lg px-2 py-1.5 bg-[#FBF8F1] text-[#5C5340]"
            >
              {FONT_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              onChange={(e) => {
                exec('formatBlock', `<${e.target.value}>`);
                e.target.value = '';
              }}
              defaultValue=""
              title="Heading style"
              className="text-[10px] font-bold uppercase border border-[#E7DFC9] rounded-lg px-2 py-1.5 bg-[#FBF8F1] text-[#5C5340]"
            >
              <option value="" disabled>
                Heading
              </option>
              {HEADING_OPTIONS.map((h) => (
                <option key={h.value} value={h.value}>
                  {h.label}
                </option>
              ))}
            </select>

            <span className="w-px h-6 bg-[#E7DFC9]" />

            <button onClick={() => exec('bold')} title="Bold" className="w-8 h-8 font-black border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#3A3222]">
              B
            </button>
            <button onClick={() => exec('italic')} title="Italic" className="w-8 h-8 italic font-bold border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#3A3222]">
              I
            </button>
            <button onClick={() => exec('underline')} title="Underline" className="w-8 h-8 underline font-bold border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#3A3222]">
              U
            </button>

            <span className="w-px h-6 bg-[#E7DFC9]" />

            <button onClick={() => exec('justifyLeft')} title="Align left" className="px-2 py-1.5 text-[10px] font-bold uppercase border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#5C5340]">
              Left
            </button>
            <button onClick={() => exec('justifyCenter')} title="Align center" className="px-2 py-1.5 text-[10px] font-bold uppercase border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#5C5340]">
              Center
            </button>
            <button onClick={() => exec('justifyRight')} title="Align right" className="px-2 py-1.5 text-[10px] font-bold uppercase border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#5C5340]">
              Right
            </button>
            <button onClick={() => exec('justifyFull')} title="Justify" className="px-2 py-1.5 text-[10px] font-bold uppercase border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#5C5340]">
              Justify
            </button>

            <span className="w-px h-6 bg-[#E7DFC9]" />

            <button onClick={() => exec('insertUnorderedList')} title="Bullets" className="px-2 py-1.5 text-[10px] font-bold uppercase border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#5C5340]">
              Bullets
            </button>
            <button onClick={() => exec('insertOrderedList')} title="Numbering" className="px-2 py-1.5 text-[10px] font-bold uppercase border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#5C5340]">
              Numbering
            </button>
            <button onClick={() => exec('indent')} title="Indent" className="px-2 py-1.5 text-[10px] font-bold uppercase border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#5C5340]">
              Indent
            </button>
            <button onClick={() => exec('outdent')} title="Outdent" className="px-2 py-1.5 text-[10px] font-bold uppercase border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#5C5340]">
              Outdent
            </button>

            <span className="w-px h-6 bg-[#E7DFC9]" />

            <button onClick={() => exec('undo')} title="Undo" className="px-2 py-1.5 text-[10px] font-bold uppercase border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#5C5340]">
              Undo
            </button>
            <button onClick={() => exec('redo')} title="Redo" className="px-2 py-1.5 text-[10px] font-bold uppercase border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#5C5340]">
              Redo
            </button>

            <span className="w-px h-6 bg-[#E7DFC9]" />

            <button onClick={() => setShowFindReplace(true)} title="Find and replace" className="px-2 py-1.5 text-[10px] font-bold uppercase border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#5C5340]">
              Find / Replace
            </button>
            <button onClick={() => setShowHeaderFooter((v) => !v)} title="Header and footer" className={`px-2 py-1.5 text-[10px] font-bold uppercase border rounded-lg ${showHeaderFooter ? 'bg-[#8A6D2F] border-[#8A6D2F] text-white' : 'bg-[#FBF8F1] border-[#E7DFC9] text-[#5C5340] hover:bg-[#F4EEE0]'}`}>
              Header / Footer
            </button>
            <button onClick={() => setShowPageNumbers((v) => !v)} title="Page numbers" className={`px-2 py-1.5 text-[10px] font-bold uppercase border rounded-lg ${showPageNumbers ? 'bg-[#8A6D2F] border-[#8A6D2F] text-white' : 'bg-[#FBF8F1] border-[#E7DFC9] text-[#5C5340] hover:bg-[#F4EEE0]'}`}>
              Page #
            </button>
            <button onClick={handleInsertTable} title="Insert table" className="px-2 py-1.5 text-[10px] font-bold uppercase border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#5C5340]">
              Table
            </button>
            <button onClick={handlePrint} title="Print preview" className="px-2 py-1.5 text-[10px] font-bold uppercase border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#5C5340]">
              Print Preview
            </button>

            <span className="ml-auto text-[10px] font-mono uppercase font-bold tracking-widest text-[#B0A588]">
              {wordCount} word{wordCount === 1 ? '' : 's'}
            </span>
          </div>

          {/* AI Assist — compact contextual controls, no third panel */}
          <div className="relative">
            <button
              onClick={() => setShowAiMenu((v) => !v)}
              className="px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-bold text-[10px] uppercase tracking-widest rounded-lg transition-colors"
            >
              ✨ AI Assist
            </button>
            {showAiMenu && (
              <div className="absolute z-10 mt-2 w-64 bg-white border border-[#E7DFC9] rounded-xl shadow-xl p-2 space-y-1">
                {AI_ASSIST_ACTIONS.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleAiAssistAction(action.label)}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-[#3A3222] rounded-lg hover:bg-[#F4EEE0] transition-all flex items-center gap-2"
                  >
                    <span>{action.icon}</span>
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Page preview / editor */}
          <div className="bg-[#F4EEE0]/40 rounded-2xl p-4 md:p-8 overflow-x-auto">
            <div
              style={{ maxWidth: pageMaxWidth, width: '100%' }}
              className="mx-auto bg-white shadow-xl rounded-sm relative"
            >
              {showHeaderFooter && (
                <div className="border-b border-[#F4EEE0] px-6 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-[#B0A588]">
                  [Firm Name] — Confidential Draft
                </div>
              )}

              <div style={{ padding: MARGIN_PADDING[margins] }}>
                <input
                  type="text"
                  value={editorHeader}
                  onChange={(e) => setEditorHeader(e.target.value)}
                  placeholder="Document heading..."
                  style={{ fontFamily }}
                  className="w-full font-bold text-sm tracking-widest text-[#3A3222] uppercase text-center border-b border-[#F4EEE0] pb-4 mb-6 outline-none focus:border-[#111111] bg-transparent whitespace-pre-wrap"
                />
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={syncWordCount}
                  style={{ fontFamily, fontSize, minHeight: 400 }}
                  className="w-full text-[#4A4130] leading-relaxed outline-none"
                />
              </div>

              {showHeaderFooter && (
                <div className="border-t border-[#F4EEE0] px-6 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-[#B0A588]">
                  {showPageNumbers ? 'Page 1 of 1' : 'Draft — Not for Filing'}
                </div>
              )}
              {showPageNumbers && !showHeaderFooter && (
                <span className="absolute bottom-2 right-3 text-[9px] font-mono text-[#B0A588]">Page 1</span>
              )}
            </div>
          </div>

          {/* Document actions */}
          <div className="flex flex-wrap gap-3 justify-end">
            <button
              onClick={() => setNotice('Function available after production activation.')}
              className="px-4 py-2 border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all"
            >
              Save as Template
            </button>
            <button
              onClick={() => setNotice('Function available after production activation.')}
              className="px-4 py-2 border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all"
            >
              Export
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all"
            >
              Print
            </button>
            <button
              onClick={() => openMatterModal(false)}
              className="px-4 py-2 border border-[#8A6D2F] text-[#8A6D2F] hover:bg-[#FBF6EA] font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all"
            >
              Create Matter Register
            </button>
            <button
              onClick={handleSaveDraftClick}
              className="px-5 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-bold text-[10px] uppercase tracking-widest rounded-lg shadow transition-all"
            >
              Save Draft
            </button>
          </div>
        </section>
      </div>

      {/* Find & Replace modal */}
      {showFindReplace && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111]">Find and Replace</h3>
              <button
                onClick={() => {
                  setShowFindReplace(false);
                  setFindReplaceNotice(null);
                }}
                className="text-xs font-bold text-[#B0A588] hover:text-[#8A7A56]"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <input
              type="text"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder="Find..."
              className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium text-[#3A3222]"
            />
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replace with..."
              className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium text-[#3A3222]"
            />
            {findReplaceNotice && <p className="text-xs font-semibold text-[#5C5340]">{findReplaceNotice}</p>}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowFindReplace(false);
                  setFindReplaceNotice(null);
                }}
                className="px-4 py-2 text-xs font-bold uppercase border border-[#E7DFC9] text-[#8A7A56] rounded-lg hover:bg-[#FBF8F1] transition-all"
              >
                Close
              </button>
              <button
                onClick={handleReplaceAll}
                className="px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase rounded-lg transition-all"
              >
                Replace All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Matter Register modal */}
      {showMatterModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111]">Matter Register Setup</h3>
                <button
                  onClick={() => setShowMatterModal(false)}
                  className="text-xs font-bold text-[#B0A588] hover:text-[#8A7A56]"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-[#8A7A56] font-medium">
                This draft will become the first record in the Matter Register once saved. Create a new register or link this draft to an existing one.
              </p>

              <div className="flex border-b border-[#111111]/10">
                <button
                  onClick={() => setMatterTab('new')}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                    matterTab === 'new' ? 'border-[#8A6D2F] text-[#8A6D2F]' : 'border-transparent text-[#B0A588] hover:text-[#5C5340]'
                  }`}
                >
                  Create New Register
                </button>
                <button
                  onClick={() => setMatterTab('link')}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                    matterTab === 'link' ? 'border-[#8A6D2F] text-[#8A6D2F]' : 'border-transparent text-[#B0A588] hover:text-[#5C5340]'
                  }`}
                >
                  Link Existing Matter
                </button>
              </div>

              <form onSubmit={handleMatterModalSubmit} className="space-y-4">
                {matterTab === 'new' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Matter Name *</label>
                      <input
                        type="text"
                        required
                        value={matterName}
                        onChange={(e) => setMatterName(e.target.value)}
                        placeholder="e.g. Sharma vs. Union of India"
                        className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium text-[#3A3222]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Internal Matter Number</label>
                      <input
                        type="text"
                        value={matterNumber}
                        onChange={(e) => setMatterNumber(e.target.value)}
                        placeholder="e.g. MAT-2026-021"
                        className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium text-[#3A3222]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Case Type</label>
                      <select
                        value={caseType}
                        onChange={(e) => setCaseType(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium text-[#3A3222]"
                      >
                        {CASE_TYPE_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Client Name</label>
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium text-[#3A3222]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Opposing Party</label>
                      <input
                        type="text"
                        value={opposingParty}
                        onChange={(e) => setOpposingParty(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium text-[#3A3222]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Court</label>
                      <input
                        type="text"
                        value={court}
                        onChange={(e) => setCourt(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium text-[#3A3222]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Jurisdiction</label>
                      <input
                        type="text"
                        value={jurisdiction}
                        onChange={(e) => setJurisdiction(e.target.value)}
                        className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium text-[#3A3222]"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Existing Matter</label>
                    <select
                      value={linkedMatterId}
                      onChange={(e) => setLinkedMatterId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium text-[#3A3222]"
                    >
                      <option value="">Select a matter...</option>
                      {EXISTING_MATTER_OPTIONS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMatterModal(false)}
                    className="px-4 py-2 text-xs font-bold uppercase border border-[#E7DFC9] text-[#8A7A56] rounded-lg hover:bg-[#FBF8F1] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase rounded-lg shadow transition-all"
                  >
                    {matterTab === 'new' ? 'Create Register' : 'Link Matter'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
