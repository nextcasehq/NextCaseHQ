'use client';

import React, { useState } from 'react';
import {
  useChargeableAiAction,
  ConfirmChargeModal,
  InsufficientCreditsModal,
  BlockedActionNotice,
} from '@/components/ai-credits/chargeable-action';

interface DraftTemplate {
  name: string;
  jurisdiction: string;
  header: string;
  body: string;
}

export default function DraftBuilderPage() {
  const templates: DraftTemplate[] = [
    {
      name: 'Delhi High Court Writ Petition',
      jurisdiction: 'IN',
      header: 'IN THE HIGH COURT OF DELHI AT NEW DELHI\nWrit Petition (Civil) No. 132 of 2026',
      body: 'IN THE MATTER OF:\nNextCaseHQ Technologies Inc.   ...Petitioner\nVERSUS\nUnion of India & Ors.          ...Respondents\n\nMEMORANDUM OF WRIT PETITION UNDER ARTICLE 226 OF THE CONSTITUTION OF INDIA\n\nTo,\nHon\'ble the Chief Justice and his Companion Justices of the High Court of Delhi.\n\nTHE HUMBLE PETITION OF THE PETITIONER ABOVE NAMED\n\nMOST RESPECTFULLY SHOWETH:\n1. The petitioner is a duly registered corporation seeking urgent relief under local limits defined in Section 12 Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023.\n2. The cause of action arose within Delhi limits following service of Section 138 Negotiable Instruments notice.'
    },
    {
      name: 'US S.D.N.Y. Summons Complaint',
      jurisdiction: 'US',
      header: 'UNITED STATES DISTRICT COURT\nFOR THE SOUTHERN DISTRICT OF NEW YORK',
      body: 'Fraser Inc.,\nPlaintiff,\n-v-\nSterling Commerce,\nDefendant.\n\nCivil Action No. 1:26-cv-00182\n\nCOMPLAINT AND DEMAND FOR JURY TRIAL\n\nPlaintiff Fraser Inc., by and through undersigned counsel, alleges upon knowledge as to itself and information and belief as to other matters, as follows:\n1. Jurisdiction is founded upon 28 U.S.C. § 1332 (diversity of citizenship).\n2. Service of summons is executed fully in compliance with Federal Rules of Civil Procedure (FRCP) Rule 4.'
    },
    {
      name: 'UK High Court Claim Form',
      jurisdiction: 'UK',
      header: 'IN THE HIGH COURT OF JUSTICE\nKING\'S BENCH DIVISION // COMMERCIAL COURT',
      body: 'Claim No: CL-2026-000095\n\nClaimant: Harrods Ltd\nDefendant: Westminster Corp\n\nBRIEF DETAILS OF CLAIM (CPR PART 7):\n\nThe claimant claims outstanding balances due under contract no. 883/2025. Proceedings are instituted in accordance with UK Civil Procedure Rules (CPR) Part 7.\n\nValue: £120,000.00'
    }
  ];

  const [selectedTemplate, setSelectedTemplate] = useState<DraftTemplate>(templates[0]);
  const [editorText, setEditorText] = useState(templates[0].body);
  const [editorHeader, setEditorHeader] = useState(templates[0].header);
  const [aiCommand, setAiCommand] = useState('');
  // "Save Draft" is not an AI action and has no backend of its own in this
  // prototype — it shows this neutral message instead of faking a saved
  // result, per the "never silently pretend a function succeeded" rule.
  // "Refine Document" and "Draft First Version with AI" ARE real AI actions
  // (rewrite_document / draft_document) and go through the full Safe AI
  // Usage Flow below instead.
  const [showUnavailablePrompt, setShowUnavailablePrompt] = useState(false);

  const { state, notice, start, confirmAndRun, cancel, dismissNotice, dismissBlocked } = useChargeableAiAction();
  const editorRef = React.useRef<HTMLTextAreaElement>(null);
  const [hasSelection, setHasSelection] = useState(false);

  const handleSelectTemplate = (template: DraftTemplate) => {
    setSelectedTemplate(template);
    setEditorHeader(template.header);
    setEditorText(template.body);
  };

  const handleAiRefine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiCommand.trim()) return;
    start('rewrite_document', null, `Refine document — ${selectedTemplate.name}: "${aiCommand.trim()}"`);
    setAiCommand('');
  };

  const handleDraftFirstVersion = () => {
    start('draft_document', null, `Draft first version — ${selectedTemplate.name}`);
  };

  const handleTextSelect = () => {
    const el = editorRef.current;
    setHasSelection(!!el && el.selectionStart !== el.selectionEnd);
  };

  const handleImproveSelectedText = () => {
    if (!hasSelection) return;
    start('improve_selected_text', null, `Improve selected passage — ${selectedTemplate.name}`);
  };

  const handleSaveDraft = () => {
    setShowUnavailablePrompt(true);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 font-sans selection:bg-[#111111] selection:text-[#FDFBF7]">
      {/* Draft Builder Title */}
      <div className="border-b border-[#111111]/10 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-black uppercase tracking-widest text-[#111111]">Draft Builder & Canvas</h1>
        </div>
        <p className="text-sm font-serif italic text-[#111111]/60">WYSIWYG high-fidelity litigation document editor.</p>
      </div>

      {showUnavailablePrompt && (
        <div className="p-4 bg-[#FBF6EA] border border-[#C6A253]/40 rounded-xl flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs font-semibold text-[#5C5340]">Function available after production activation.</p>
          <button
            onClick={() => setShowUnavailablePrompt(false)}
            className="text-xs font-bold text-[#B0A588] hover:text-[#8A7A56]"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {notice && (
        <div className="p-4 bg-[#FBF6EA] border border-[#C6A253]/40 rounded-xl flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs font-semibold text-[#5C5340]">{notice}</p>
          <button onClick={dismissNotice} className="text-xs font-bold text-[#B0A588] hover:text-[#8A7A56]" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {state.phase === 'confirm' && (
        <ConfirmChargeModal actionName={state.actionName} cost={state.cost} onConfirm={confirmAndRun} onCancel={cancel} />
      )}
      {state.phase === 'insufficient' && (
        <InsufficientCreditsModal actionName={state.actionName} cost={state.cost} onClose={dismissBlocked} />
      )}
      {state.phase === 'blocked' && <BlockedActionNotice message={state.message} onClose={dismissBlocked} />}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Left Side: Template Selector & AI Enhancer */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 border border-[#111111]/10 bg-white rounded space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#111111]/50 mb-2">
              Select Jurisdictional Template
            </h2>
            <div className="space-y-2">
              {templates.map((t) => (
                <button
                  key={t.name}
                  onClick={() => handleSelectTemplate(t)}
                  className={`w-full text-left p-3 text-xs font-bold rounded uppercase tracking-wider transition-all border ${
                    selectedTemplate.name === t.name
                      ? 'bg-[#111111] border-[#111111] text-[#FDFBF7]'
                      : 'bg-[#FDFBF7] border-[#111111]/10 text-[#111111] hover:bg-[#111111]/5'
                  }`}
                >
                  <span className="block opacity-40 text-[9px] mb-1">JURISDICTION: {t.jurisdiction}</span>
                  {t.name}
                </button>
              ))}
            </div>
            <button
              onClick={handleDraftFirstVersion}
              className="w-full py-2 border border-[#E7DFC9] text-[#8A6D2F] text-[10px] uppercase tracking-widest font-bold rounded hover:bg-[#FBF8F1] transition-all flex items-center justify-center gap-1.5"
            >
              ✨ Draft First Version with AI
            </button>
          </div>

          <div className="p-5 border border-[#111111]/10 bg-white rounded space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#111111]/50 mb-2">
              AI Canvas Refiner
            </h2>
            <form onSubmit={handleAiRefine} className="space-y-3">
              <textarea
                placeholder="e.g. Add paragraph pleading that limitation period was tolled during state of emergency"
                value={aiCommand}
                onChange={(e) => setAiCommand(e.target.value)}
                rows={3}
                className="w-full p-3 bg-[#FDFBF7] border border-[#111111]/15 rounded outline-none focus:border-[#111111] text-xs font-sans placeholder:text-[#111111]/40"
              />
              <button
                type="submit"
                disabled={!aiCommand.trim()}
                className="w-full py-2 bg-[#111111] text-[#FDFBF7] text-[10px] uppercase tracking-widest font-bold rounded hover:bg-[#111111]/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                ⚡ Refine Document
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: The Pleading Canvas Editor */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex justify-between items-center bg-white border border-[#111111]/10 rounded px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-mono uppercase font-bold tracking-widest text-[#111111]/60">
                Active Session Draft: {selectedTemplate.jurisdiction} Pack
              </span>
            </div>
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-bold text-[10px] uppercase tracking-widest rounded transition-colors"
            >
              💾 Save Draft
            </button>
          </div>

          <div className="bg-white border border-[#F4EEE0] rounded-2xl p-8 md:p-12 shadow-xl shadow-[#F4EEE0]/50 min-h-[600px] flex flex-col space-y-6">
            {/* Header Editor Area */}
            <input
              type="text"
              value={editorHeader}
              onChange={(e) => setEditorHeader(e.target.value)}
              className="w-full font-bold text-sm tracking-widest text-[#3A3222] font-sans uppercase text-center border-b border-[#F4EEE0] pb-4 outline-none focus:border-[#111111]"
            />

            {/* Main Pleading Body Editor Area */}
            <textarea
              ref={editorRef}
              value={editorText}
              onChange={(e) => setEditorText(e.target.value)}
              onSelect={handleTextSelect}
              onMouseUp={handleTextSelect}
              onKeyUp={handleTextSelect}
              rows={22}
              className="w-full font-serif text-sm text-[#4A4130] leading-relaxed outline-none border-none resize-none focus:ring-0 select-text"
            />

            <div className="flex justify-end border-t border-[#F4EEE0] pt-4">
              <button
                onClick={handleImproveSelectedText}
                disabled={!hasSelection}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title={hasSelection ? 'Improve the highlighted passage in place' : 'Select some text in the editor first'}
              >
                ✨ Improve Selected Text
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
