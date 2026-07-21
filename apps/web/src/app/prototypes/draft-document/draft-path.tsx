'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  DRAFT_TEMPLATES,
  DRAFT_TEMPLATE_CATEGORIES,
  CANNED_AI_SUGGESTION,
  type DraftTemplate,
  type TemplateCategory,
} from './templates-data';
import { type CaseContext, isRequiredContextComplete } from './types';

export interface DraftPathState {
  selectedTemplateId: string | null;
  editorHeader: string;
  editorHtml: string;
  nextParagraphNumber: number;
  courtHeadingOverride: string | null;
  aiAssistanceChecked: boolean;
}

export const EMPTY_DRAFT_PATH_STATE: DraftPathState = {
  selectedTemplateId: null,
  editorHeader: '',
  editorHtml: '',
  nextParagraphNumber: 1,
  courtHeadingOverride: null,
  aiAssistanceChecked: false,
};

interface DraftPathProps {
  caseContext: CaseContext;
  initialState: DraftPathState;
  onStateChange: (state: DraftPathState) => void;
  onBack: () => void;
  onSaveDraft: (payload: { documentName: string; paragraphCount: number }) => void;
  onNotice: (message: string) => void;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Every legal paragraph gets its own leading "N." line. Numbering is
// generated automatically when a template or blank document loads, and
// continues from the "Add Paragraph" control — manual renumbering and
// restarting numbering under a new section are not yet implemented.
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

function buildCourtHeading(court: string, caseCategory: string, caseNumber: string, caseYear: string): string {
  const courtLine = court.trim() ? `IN THE ${court.trim().toUpperCase()}` : 'IN THE [COURT NAME]';
  const caseLine = caseCategory.trim() || '[CASE TYPE]';
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

export default function DraftPath({ caseContext, initialState, onStateChange, onBack, onSaveDraft, onNotice }: DraftPathProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'ALL'>('ALL');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(initialState.selectedTemplateId);
  const [editorHeader, setEditorHeader] = useState(initialState.editorHeader);
  const [nextParagraphNumber, setNextParagraphNumber] = useState(initialState.nextParagraphNumber);
  const [courtHeadingOverride, setCourtHeadingOverride] = useState<string | null>(initialState.courtHeadingOverride);
  const [aiAssistanceChecked, setAiAssistanceChecked] = useState(initialState.aiAssistanceChecked);
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);

  const contextComplete = isRequiredContextComplete(caseContext);
  const aiAssistanceEnabled = contextComplete && aiAssistanceChecked;

  const courtHeadingValue =
    courtHeadingOverride ?? buildCourtHeading(caseContext.court, caseContext.caseCategory || caseContext.documentType, caseContext.caseNumber, caseContext.caseYear);

  // Restore persisted editor content (e.g. after a refresh) exactly once.
  useEffect(() => {
    if (!hydratedRef.current && editorRef.current) {
      editorRef.current.innerHTML = initialState.editorHtml || '<p><strong>1.</strong></p><p><br/></p>';
      hydratedRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (overrides: Partial<DraftPathState> = {}) => {
    onStateChange({
      selectedTemplateId,
      editorHeader,
      editorHtml: editorRef.current?.innerHTML ?? '',
      nextParagraphNumber,
      courtHeadingOverride,
      aiAssistanceChecked,
      ...overrides,
    });
  };

  const handleEditorInput = () => {
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => persist(), 300);
  };

  const loadTemplate = (template: DraftTemplate) => {
    const { html, nextNumber } = templateBodyToNumberedHtml(template.body, 1);
    setSelectedTemplateId(template.id);
    setEditorHeader(template.header);
    if (editorRef.current) editorRef.current.innerHTML = html;
    setNextParagraphNumber(nextNumber);
    persist({ selectedTemplateId: template.id, editorHeader: template.header, editorHtml: html, nextParagraphNumber: nextNumber });
  };

  const loadBlank = () => {
    const html = '<p><strong>1.</strong></p><p><br/></p>';
    setSelectedTemplateId('blank');
    setEditorHeader('');
    if (editorRef.current) editorRef.current.innerHTML = html;
    setNextParagraphNumber(2);
    persist({ selectedTemplateId: 'blank', editorHeader: '', editorHtml: html, nextParagraphNumber: 2 });
  };

  const exec = (command: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    persist();
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
    const newNumber = nextParagraphNumber + 1;
    setNextParagraphNumber(newNumber);

    const range = document.createRange();
    range.selectNodeContents(textPara);
    range.collapse(true);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    editorRef.current.focus();
    persist({ nextParagraphNumber: newNumber });
  };

  const handleTakeAiAssist = () => {
    if (!aiAssistanceEnabled) return;
    setShowAiSuggestion(true);
  };

  const insertAiSuggestionAtEnd = () => {
    editorRef.current?.insertAdjacentHTML('beforeend', buildAiSuggestedParagraphHtml(CANNED_AI_SUGGESTION));
    setShowAiSuggestion(false);
    persist();
  };

  const replaceSelectionWithAiSuggestion = () => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    const hasSelectionInEditor =
      selection && selection.rangeCount > 0 && !selection.isCollapsed && editorRef.current.contains(selection.anchorNode);
    if (!hasSelectionInEditor) {
      onNotice('Select some text in the editor first, then choose Replace Selection.');
      return;
    }
    editorRef.current.focus();
    document.execCommand('insertHTML', false, buildAiSuggestedParagraphHtml(CANNED_AI_SUGGESTION));
    setShowAiSuggestion(false);
    persist();
  };

  const rejectAiSuggestion = () => setShowAiSuggestion(false);

  const documentName =
    selectedTemplateId && selectedTemplateId !== 'blank'
      ? DRAFT_TEMPLATES.find((t) => t.id === selectedTemplateId)?.name || 'Untitled Document'
      : 'Blank Document';

  const filteredTemplates = DRAFT_TEMPLATES.filter((t) => {
    const matchesCategory = selectedCategory === 'ALL' || t.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery = !q || t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 md:p-6 min-w-0">
      {/* LEFT */}
      <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 space-y-4 min-w-0">
        <button onClick={onBack} className="text-[10px] font-bold uppercase tracking-widest text-[#B0A588] hover:text-[#8A6D2F]">
          ← Back to Case Context
        </button>

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

        <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={aiAssistanceEnabled}
              disabled={!contextComplete}
              onChange={(e) => {
                setAiAssistanceChecked(e.target.checked);
                persist({ aiAssistanceChecked: e.target.checked });
              }}
              className="mt-0.5"
            />
            <span className="text-xs font-bold text-[#3A3222]">Enable AI Assistance</span>
          </label>
          <p className="text-[10px] text-[#B0A588] mt-1">
            {contextComplete
              ? 'AI Assistance is available in the document editor.'
              : 'Complete the case details to enable context-aware AI drafting.'}
          </p>
        </div>
      </aside>

      {/* RIGHT */}
      <section className="flex-1 min-w-0 space-y-4">
        <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-2">Court Reference Heading</h2>
          <textarea
            value={courtHeadingValue}
            onChange={(e) => {
              setCourtHeadingOverride(e.target.value);
              persist({ courtHeadingOverride: e.target.value });
            }}
            rows={3}
            className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-bold uppercase tracking-wide text-center text-[#3A3222] font-mono"
          />
          <p className="text-[9px] text-[#B0A588] mt-1">Auto-filled from Case Context — edit freely, this document only.</p>
        </div>

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
            title={aiAssistanceEnabled ? undefined : 'Complete Case Context and enable AI Assistance first'}
            className="ml-auto px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] hover:bg-[#6F5624] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ✨ Take AI Assistance to Draft Professionally
          </button>
        </div>

        {showAiSuggestion && (
          <div className="bg-[#FBF6EA] border border-[#C6A253]/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#8A6D2F] bg-white px-2 py-0.5 rounded">AI Suggested</span>
              <span className="text-[10px] text-[#8A7A56]">Simulated — no real AI call is made</span>
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

        <div className="bg-white shadow-xl rounded-sm p-6 md:p-10">
          <input
            type="text"
            value={editorHeader}
            onChange={(e) => {
              setEditorHeader(e.target.value);
              persist({ editorHeader: e.target.value });
            }}
            placeholder="Document heading..."
            className="w-full font-bold text-sm tracking-widest text-[#3A3222] uppercase text-center border-b border-[#F4EEE0] pb-4 mb-6 outline-none focus:border-[#111111] bg-transparent whitespace-pre-wrap"
          />
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleEditorInput}
            style={{ minHeight: 400 }}
            className="w-full text-[#4A4130] leading-relaxed outline-none font-serif text-sm"
          />
          <p className="text-right text-[9px] font-mono text-[#B0A588] mt-4 pt-2 border-t border-[#F4EEE0]">Page 1</p>
        </div>

        <div className="flex flex-wrap gap-3 justify-end">
          <button
            onClick={() => onSaveDraft({ documentName, paragraphCount: nextParagraphNumber - 1 })}
            className="px-5 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-bold text-[10px] uppercase tracking-widest rounded-lg shadow transition-all"
          >
            Save Draft
          </button>
        </div>
      </section>
    </div>
  );
}
