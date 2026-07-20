'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import {
  DRAFT_TEMPLATES,
  DRAFT_TEMPLATE_CATEGORIES,
  EXISTING_MATTER_OPTIONS,
  CASE_TYPE_OPTIONS,
  CANNED_AI_SUGGESTION,
  type DraftTemplate,
  type TemplateCategory,
} from './templates-data';
import RegisterReveal, { type RegisterRevealData } from './register-reveal';

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

// Every legal paragraph gets its own leading "N." line, matching the
// Product Owner's example format. Numbering is generated automatically
// when a template or blank document loads, and continues from the "Add
// Paragraph" control — it is not a full legal-drafting numbering engine
// (no manual renumbering or section restarts yet).
function templateBodyToNumberedHtml(body: string, startNumber: number): { html: string; nextNumber: number } {
  const paragraphs = body.split('\n\n');
  let n = startNumber;
  const parts: string[] = [];
  for (const para of paragraphs) {
    parts.push(`<p><strong>${n}.</strong></p>`);
    parts.push(`<p>${escapeHtml(para).replace(/\n/g, '<br/>')}</p>`);
    n += 1;
  }
  return { html: parts.join(''), nextNumber: n };
}

function buildCourtHeading(court: string, caseType: string, caseNumber: string, caseYear: string): string {
  const courtLine = court.trim() ? `IN THE ${court.trim().toUpperCase()}` : 'IN THE [COURT NAME]';
  const caseLine = caseType.trim() || '[CASE TYPE]';
  const numberPart = caseNumber.trim() ? `NO. ${caseNumber.trim()}` : 'NO. ___';
  const yearPart = caseYear.trim() || '____';
  return `${courtLine}\n\n${caseLine.toUpperCase()} ${numberPart} OF ${yearPart}`;
}

// The "AI Suggested" badge on inserted content — a status label, not a
// silent edit. Nothing produced here comes from a real AI model; the
// text is a fixed, canned placeholder (see CANNED_AI_SUGGESTION).
function buildAiSuggestedParagraphHtml(text: string): string {
  return (
    '<p><span style="background:#FBF6EA;color:#8A6D2F;font-weight:700;font-size:9px;text-transform:uppercase;' +
    'padding:2px 6px;border-radius:4px;margin-right:6px;">AI Suggested</span>' +
    `${escapeHtml(text)}</p>`
  );
}

export default function DraftDocumentPrototypePage() {
  const editorRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<'draft' | 'register'>('draft');
  const [notice, setNotice] = useState<string | null>(null);

  // Template library (left)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'ALL'>('ALL');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [editorHeader, setEditorHeader] = useState('');
  const [nextParagraphNumber, setNextParagraphNumber] = useState(1);

  // Basic case details (left) — the minimum required to engage AI Assistance.
  const [matterName, setMatterName] = useState('');
  const [court, setCourt] = useState('');
  const [caseType, setCaseType] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [caseYear, setCaseYear] = useState('');
  const [aiAssistanceChecked, setAiAssistanceChecked] = useState(false);

  const caseDetailsComplete = matterName.trim() !== '' && court.trim() !== '' && caseType !== '';
  const caseDetailsCompletedCount = [matterName.trim() !== '', court.trim() !== '', caseType !== ''].filter(
    Boolean
  ).length;
  const aiAssistanceEnabled = caseDetailsComplete && aiAssistanceChecked;

  // Court heading (right) — auto-populated from case details until the
  // advocate edits it directly, at which point it stops auto-syncing.
  const [courtHeadingOverride, setCourtHeadingOverride] = useState<string | null>(null);
  const courtHeadingValue = courtHeadingOverride ?? buildCourtHeading(court, caseType, caseNumber, caseYear);

  // AI suggestion — entirely simulated, see CANNED_AI_SUGGESTION.
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);

  // Matter Register modal
  const [showMatterModal, setShowMatterModal] = useState(false);
  const [matterTab, setMatterTab] = useState<'new' | 'link'>('new');
  const [linkedMatterId, setLinkedMatterId] = useState('');
  const [register, setRegister] = useState<MatterRegister | null>(null);

  const loadTemplate = (template: DraftTemplate) => {
    setSelectedTemplateId(template.id);
    setEditorHeader(template.header);
    const { html, nextNumber } = templateBodyToNumberedHtml(template.body, 1);
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
    setNextParagraphNumber(nextNumber);
  };

  const loadBlank = () => {
    setSelectedTemplateId('blank');
    setEditorHeader('');
    if (editorRef.current) {
      editorRef.current.innerHTML = '<p><strong>1.</strong></p><p><br/></p>';
    }
    setNextParagraphNumber(2);
  };

  const exec = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
  };

  const handleAddParagraph = () => {
    if (!editorRef.current) return;
    const numberPara = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = `${nextParagraphNumber}.`;
    numberPara.appendChild(strong);
    const textPara = document.createElement('p');
    textPara.innerHTML = '<br/>';
    editorRef.current.appendChild(numberPara);
    editorRef.current.appendChild(textPara);
    setNextParagraphNumber((n) => n + 1);

    const range = document.createRange();
    range.selectNodeContents(textPara);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    editorRef.current.focus();
  };

  const handleTakeAiAssist = () => {
    if (!aiAssistanceEnabled) return;
    setShowAiSuggestion(true);
  };

  const insertAiSuggestionAtEnd = () => {
    editorRef.current?.insertAdjacentHTML('beforeend', buildAiSuggestedParagraphHtml(CANNED_AI_SUGGESTION));
    setShowAiSuggestion(false);
  };

  const replaceSelectionWithAiSuggestion = () => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    const hasSelectionInEditor =
      selection && selection.rangeCount > 0 && !selection.isCollapsed && editorRef.current.contains(selection.anchorNode);
    if (!hasSelectionInEditor) {
      setNotice('Select some text in the editor first, then choose Replace Selection.');
      return;
    }
    editorRef.current.focus();
    document.execCommand('insertHTML', false, buildAiSuggestedParagraphHtml(CANNED_AI_SUGGESTION));
    setShowAiSuggestion(false);
  };

  const rejectAiSuggestion = () => {
    setShowAiSuggestion(false);
  };

  const documentName =
    selectedTemplateId && selectedTemplateId !== 'blank'
      ? DRAFT_TEMPLATES.find((t) => t.id === selectedTemplateId)?.name || 'Untitled Document'
      : 'Blank Document';

  const handleMatterModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let newRegister: MatterRegister;
    if (matterTab === 'new') {
      if (!matterName.trim()) return;
      newRegister = { mode: 'new', name: matterName.trim(), number: caseNumber.trim() || undefined };
    } else {
      const existing = EXISTING_MATTER_OPTIONS.find((m) => m.id === linkedMatterId);
      if (!existing) return;
      newRegister = { mode: 'link', name: existing.label };
    }
    setRegister(newRegister);
    setShowMatterModal(false);
    setView('register');
  };

  const handleSaveDraftClick = () => {
    if (!register) {
      setShowMatterModal(true);
      return;
    }
    setView('register');
  };

  const canSubmitMatterModal = matterTab === 'new' ? matterName.trim() !== '' : linkedMatterId !== '';

  const filteredTemplates = DRAFT_TEMPLATES.filter((t) => {
    const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery = !q || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  const registerRevealData: RegisterRevealData | null = register
    ? {
        matterName: register.name,
        matterNumber: register.number || '',
        court,
        caseType,
        caseNumber,
        caseYear,
        mode: register.mode,
        linkedMatterLabel: register.mode === 'link' ? register.name : undefined,
        documentName,
        paragraphCount: nextParagraphNumber - 1,
      }
    : null;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans selection:bg-[#8A6D2F] selection:text-white">
      {/* Prototype identification banner */}
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
        {register && view === 'draft' && (
          <button
            onClick={() => setView('register')}
            className="text-xs font-semibold text-[#5C5340] bg-[#FBF6EA] border border-[#C6A253]/40 rounded-lg px-3 py-2 max-w-sm hover:bg-[#F4EEE0] transition-all"
          >
            Matter Register: {register.name}
            {register.number ? ` (${register.number})` : ''} — view register →
          </button>
        )}
      </header>

      {notice && (
        <div className="mx-4 md:mx-6 mt-4 p-4 bg-[#FBF6EA] border border-[#C6A253]/40 rounded-xl flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs font-semibold text-[#5C5340]">{notice}</p>
          <button onClick={() => setNotice(null)} className="text-xs font-bold text-[#B0A588] hover:text-[#8A7A56]" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {view === 'register' && registerRevealData ? (
        <RegisterReveal
          data={registerRevealData}
          onContinueDrafting={() => setView('draft')}
          onNotice={setNotice}
        />
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 md:p-6 min-w-0">
          {/* LEFT */}
          <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-4 min-w-0">
            {/* Template library */}
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

              <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
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
                    <span className={`block text-[9px] uppercase tracking-wider mb-1 ${selectedTemplateId === t.id ? 'opacity-70' : 'opacity-50'}`}>
                      {t.category}
                    </span>
                    <span className="text-xs font-bold">{t.name}</span>
                  </button>
                ))}
                {filteredTemplates.length === 0 && <p className="text-xs text-[#B0A588] italic px-1 py-3">No templates match this search.</p>}
              </div>
            </div>

            {/* Basic case details + AI Assistance checkbox */}
            <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">Basic Case Details</h2>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Matter Name *</label>
                <input
                  type="text"
                  value={matterName}
                  onChange={(e) => setMatterName(e.target.value)}
                  placeholder="e.g. Sharma vs. Union of India"
                  className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Court *</label>
                <input
                  type="text"
                  value={court}
                  onChange={(e) => setCourt(e.target.value)}
                  placeholder="e.g. High Court of Karnataka"
                  className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Case Type *</label>
                <select
                  value={caseType}
                  onChange={(e) => setCaseType(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
                >
                  <option value="">Select case type...</option>
                  {CASE_TYPE_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Case Number</label>
                  <input
                    type="text"
                    value={caseNumber}
                    onChange={(e) => setCaseNumber(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Year</label>
                  <input
                    type="text"
                    value={caseYear}
                    onChange={(e) => setCaseYear(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
                  />
                </div>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#B0A588]">
                Case details: {caseDetailsCompletedCount} of 3 completed
              </p>

              <div className="pt-2 border-t border-[#F4EEE0]">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiAssistanceEnabled}
                    disabled={!caseDetailsComplete}
                    onChange={(e) => setAiAssistanceChecked(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span className="text-xs font-bold text-[#3A3222]">Enable AI Assistance</span>
                </label>
                <p className="text-[10px] text-[#B0A588] mt-1">
                  {caseDetailsComplete
                    ? 'AI Assistance is available in the document editor.'
                    : 'Complete the required case details to enable context-aware AI assistance.'}
                </p>
              </div>
            </div>
          </aside>

          {/* RIGHT */}
          <section className="flex-1 min-w-0 space-y-4">
            {/* Court reference heading */}
            <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-2">Court Reference Heading</h2>
              <textarea
                value={courtHeadingValue}
                onChange={(e) => setCourtHeadingOverride(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-bold uppercase tracking-wide text-center text-[#3A3222] font-mono"
              />
              <p className="text-[9px] text-[#B0A588] mt-1">Auto-filled from Basic Case Details — edit freely, this document only.</p>
            </div>

            {/* Basic formatting toolbar + Add Paragraph + AI */}
            <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-3 flex flex-wrap items-center gap-2">
              <button onClick={() => exec('bold')} title="Bold" className="w-8 h-8 font-black border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#3A3222]">
                B
              </button>
              <button onClick={() => exec('italic')} title="Italic" className="w-8 h-8 italic font-bold border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#3A3222]">
                I
              </button>
              <button onClick={() => exec('underline')} title="Underline" className="w-8 h-8 underline font-bold border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#3A3222]">
                U
              </button>
              <button onClick={() => exec('insertUnorderedList')} title="Bullets" className="px-2 py-1.5 text-[10px] font-bold uppercase border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#5C5340]">
                Bullets
              </button>
              <button onClick={() => exec('undo')} title="Undo" className="px-2 py-1.5 text-[10px] font-bold uppercase border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#5C5340]">
                Undo
              </button>
              <button onClick={() => exec('redo')} title="Redo" className="px-2 py-1.5 text-[10px] font-bold uppercase border border-[#E7DFC9] rounded-lg bg-[#FBF8F1] hover:bg-[#F4EEE0] text-[#5C5340]">
                Redo
              </button>

              <span className="w-px h-6 bg-[#E7DFC9]" />

              <button
                onClick={handleAddParagraph}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-[#8A6D2F] text-[#8A6D2F] rounded-lg bg-[#FBF6EA] hover:bg-[#F4EEE0] transition-all"
              >
                + Add Paragraph
              </button>

              <button
                onClick={handleTakeAiAssist}
                disabled={!aiAssistanceEnabled}
                title={aiAssistanceEnabled ? undefined : 'Complete Basic Case Details and enable AI Assistance first'}
                className="ml-auto px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] hover:bg-[#6F5624] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ✨ Take AI Assistance to Draft Professionally
              </button>
            </div>

            {showAiSuggestion && (
              <div className="bg-[#FBF6EA] border border-[#C6A253]/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#8A6D2F] bg-white px-2 py-0.5 rounded">
                    AI Suggested
                  </span>
                  <span className="text-[10px] text-[#8A7A56]">Simulated — not connected to a real AI model</span>
                </div>
                <p className="text-xs text-[#5C5340] leading-relaxed">{CANNED_AI_SUGGESTION}</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={insertAiSuggestionAtEnd} className="px-3 py-1.5 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-[10px] font-bold uppercase rounded-lg transition-all">
                    Accept
                  </button>
                  <button onClick={replaceSelectionWithAiSuggestion} className="px-3 py-1.5 border border-[#8A6D2F] text-[#8A6D2F] hover:bg-white text-[10px] font-bold uppercase rounded-lg transition-all">
                    Replace Selection
                  </button>
                  <button onClick={insertAiSuggestionAtEnd} className="px-3 py-1.5 border border-[#8A6D2F] text-[#8A6D2F] hover:bg-white text-[10px] font-bold uppercase rounded-lg transition-all">
                    Insert Below
                  </button>
                  <button onClick={rejectAiSuggestion} className="px-3 py-1.5 border border-[#E7DFC9] text-[#8A7A56] hover:bg-white text-[10px] font-bold uppercase rounded-lg transition-all">
                    Reject
                  </button>
                </div>
              </div>
            )}

            {/* Document editor */}
            <div className="bg-white shadow-xl rounded-sm p-6 md:p-10">
              <input
                type="text"
                value={editorHeader}
                onChange={(e) => setEditorHeader(e.target.value)}
                placeholder="Document heading..."
                className="w-full font-bold text-sm tracking-widest text-[#3A3222] uppercase text-center border-b border-[#F4EEE0] pb-4 mb-6 outline-none focus:border-[#111111] bg-transparent whitespace-pre-wrap"
              />
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                style={{ minHeight: 400 }}
                className="w-full text-[#4A4130] leading-relaxed outline-none font-serif text-sm"
              />
            </div>

            {/* Document actions */}
            <div className="flex flex-wrap gap-3 justify-end">
              <button
                onClick={() => setShowMatterModal(true)}
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
      )}

      {/* Matter Register modal */}
      {showMatterModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111]">Matter Register Setup</h3>
                <button onClick={() => setShowMatterModal(false)} className="text-xs font-bold text-[#B0A588] hover:text-[#8A7A56]" aria-label="Close">
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
                  <p className="text-xs text-[#5C5340]">
                    Using the Basic Case Details already entered: <strong>{matterName || '(matter name not yet set)'}</strong>
                    {court ? `, ${court}` : ''}
                    {caseType ? `, ${caseType}` : ''}. Fill in Basic Case Details on the left if anything is missing, then confirm below.
                  </p>
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
                    disabled={!canSubmitMatterModal}
                    className="px-5 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase rounded-lg shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
