'use client';

import React, { useState } from 'react';

/**
 * The "Matter Register reveal" — shown after the advocate saves the first
 * draft and creates/links a Matter Register. Everything here is derived
 * from what the advocate actually entered on the drafting screen (or shown
 * as an explicit "not yet provided" / "illustrative only" placeholder) —
 * nothing is fabricated as if it were a real, persisted record. There is no
 * database behind this: it is held entirely in the parent page's React
 * state and disappears on reload, by design for this prototype milestone.
 */

export interface RegisterRevealData {
  matterName: string;
  matterNumber: string;
  court: string;
  caseType: string;
  caseNumber: string;
  caseYear: string;
  mode: 'new' | 'link';
  linkedMatterLabel?: string;
  documentName: string;
  paragraphCount: number;
}

interface RegisterRevealProps {
  data: RegisterRevealData;
  onContinueDrafting: () => void;
  onNotice: (message: string) => void;
}

const SECTIONS = ['Overview', 'Documents', 'Proceedings', 'Timeline', 'Tasks', 'Research', 'Parties'] as const;
type Section = (typeof SECTIONS)[number];

export default function RegisterReveal({ data, onContinueDrafting, onNotice }: RegisterRevealProps) {
  const [activeSection, setActiveSection] = useState<Section>('Overview');

  // Case Stage & Next Hearing — local to this reveal for now (see "Known
  // prototype limitations" in the PR: this block does not yet survive a
  // trip back to the drafting screen and forward again).
  const [stageSuggested, setStageSuggested] = useState(false);
  const [currentStage, setCurrentStage] = useState('');
  const [nextHearingDate, setNextHearingDate] = useState('');
  const [courtBench, setCourtBench] = useState('');
  const [hearingPurpose, setHearingPurpose] = useState('');
  const [pendingAction, setPendingAction] = useState('');
  const [requiredDocument, setRequiredDocument] = useState('');

  const daysRemaining = (() => {
    if (!nextHearingDate) return null;
    const target = new Date(nextHearingDate);
    if (Number.isNaN(target.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  })();

  const handleUseAiForStage = () => {
    setCurrentStage('Awaiting Filing');
    setCourtBench(data.court || 'Not yet assigned');
    setHearingPurpose('First hearing / admission');
    setPendingAction(`File "${data.documentName}" with the court registry`);
    setRequiredDocument(data.documentName);
    setStageSuggested(true);
  };

  const handleDraftManually = () => {
    setStageSuggested(false);
  };

  const displayName = data.mode === 'link' && data.linkedMatterLabel ? data.linkedMatterLabel : data.matterName;

  const missingItems: string[] = [];
  if (!data.caseNumber.trim()) missingItems.push('Case number');
  if (!data.caseYear.trim()) missingItems.push('Case year');
  missingItems.push('Party names and full details');

  const timelineStream = [
    { label: `Matter Register ${data.mode === 'new' ? 'created' : 'linked'}`, done: true },
    { label: `First draft saved ("${data.documentName}")`, done: true },
    { label: 'Matter details confirmed', done: true },
    { label: 'Awaiting filing', done: false },
    { label: 'Next action to be added', done: false },
  ];

  const createdRows = [
    { label: 'Matter identity', detail: displayName || 'Not yet provided' },
    {
      label: 'Court reference',
      detail: `${data.court || 'Not yet provided'}${data.caseType ? ` — ${data.caseType}` : ''}`,
    },
    { label: 'Party records', detail: 'Not yet recorded — full party detail capture is a future milestone' },
    {
      label: 'First document',
      detail: `${data.documentName} (${data.paragraphCount} paragraph${data.paragraphCount === 1 ? '' : 's'})`,
    },
    { label: 'Initial timeline entry', detail: 'Recorded — see Timeline below' },
    { label: 'Initial task', detail: 'Suggested only — illustrative, not created (task engine not yet implemented)' },
    { label: 'Important dates', detail: data.caseYear ? `Filed under year ${data.caseYear}` : 'Not yet set' },
    { label: 'Applicable provisions', detail: 'Not yet captured — a future milestone' },
    { label: 'Draft history', detail: '1 version (this draft)' },
  ];

  const handleNextAction = (label: string) => {
    if (label === 'Continue Drafting') {
      onContinueDrafting();
      return;
    }
    onNotice(`"${label}" isn't wired up in this drafting prototype yet — only "Continue Drafting" is implemented so far.`);
  };

  return (
    <div className="flex-1 p-4 md:p-6">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Register header block */}
        <div className="bg-white border border-[#E7DFC9]/80 rounded-2xl p-6 md:p-10 text-center space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#B0A588]">Matter Register</p>
          <p className="font-mono text-sm font-bold text-[#8A6D2F]">
            {data.matterNumber.trim() || 'Internal number not yet assigned'}
          </p>
          <h2 className="text-xl md:text-2xl font-black text-[#111111] pt-2">
            {displayName || 'Untitled Matter'}
          </h2>
          <p className="text-xs font-semibold text-[#5C5340] uppercase tracking-wide">
            {data.caseType || 'Case type not yet set'}
          </p>
          <p className="text-xs text-[#8A7A56]">
            {data.court || 'Court not yet provided'}
            {data.caseNumber.trim() ? ` — ${data.caseNumber} of ${data.caseYear.trim() || '____'}` : ''}
          </p>
          <span className="inline-block mt-2 px-3 py-1 rounded-full bg-[#FBF6EA] border border-[#C6A253]/40 text-[10px] font-bold uppercase tracking-widest text-[#8A6D2F]">
            Status: Drafting / Pre-filing
          </span>
        </div>

        {/* Permanence message */}
        <div className="bg-[#111111] text-[#FDFBF7] rounded-2xl p-5 md:p-6 text-center">
          <p className="text-xs md:text-sm font-semibold leading-relaxed">
            This Matter Register will now track every document, hearing, task, order, note and research record until the matter is closed.
          </p>
        </div>

        {/* Case Stage & Next Hearing */}
        <div className="bg-white border border-[#E7DFC9]/80 rounded-2xl p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">Current Stage &amp; Next Hearing</h3>
            {stageSuggested && (
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#8A6D2F] bg-[#FBF6EA] border border-[#C6A253]/40 px-2 py-0.5 rounded">
                AI Suggested — confirm or edit
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Current Stage</label>
              <input
                type="text"
                value={currentStage}
                onChange={(e) => setCurrentStage(e.target.value)}
                placeholder="Awaiting filing"
                className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Next Hearing Date</label>
              <input
                type="date"
                value={nextHearingDate}
                onChange={(e) => setNextHearingDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
              />
              <p className="text-[9px] text-[#B0A588] mt-1">
                {nextHearingDate ? (daysRemaining !== null ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining` : '') : 'No hearing date yet'}
              </p>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Court / Bench</label>
              <input
                type="text"
                value={courtBench}
                onChange={(e) => setCourtBench(e.target.value)}
                placeholder="Not yet assigned"
                className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Purpose of Hearing</label>
              <input
                type="text"
                value={hearingPurpose}
                onChange={(e) => setHearingPurpose(e.target.value)}
                placeholder="Not yet set"
                className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Pending Action</label>
              <input
                type="text"
                value={pendingAction}
                onChange={(e) => setPendingAction(e.target.value)}
                placeholder="Not yet identified"
                className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Likely Required Document</label>
              <input
                type="text"
                value={requiredDocument}
                onChange={(e) => setRequiredDocument(e.target.value)}
                placeholder="Not yet identified"
                className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDraftManually}
              className="px-4 py-2 border border-[#E7DFC9] text-[#8A7A56] hover:bg-[#FBF8F1] font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all"
            >
              Draft Manually
            </button>
            <button
              onClick={handleUseAiForStage}
              className="px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all"
            >
              ✨ Use AI Assistance for this Stage
            </button>
          </div>
        </div>

        {/* Section tabs + permanent Upload Document action */}
        <div className="flex items-center justify-between border-b border-[#111111]/10 overflow-x-auto gap-4">
          <div className="flex overflow-x-auto">
            {SECTIONS.map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-all ${
                  activeSection === section
                    ? 'border-[#8A6D2F] text-[#8A6D2F]'
                    : 'border-transparent text-[#B0A588] hover:text-[#5C5340]'
                }`}
              >
                {section}
              </button>
            ))}
          </div>
          <button
            onClick={() => onNotice('Document upload isn\'t wired up in this drafting prototype yet.')}
            className="mb-2 flex-shrink-0 px-3 py-1.5 border border-[#8A6D2F] text-[#8A6D2F] hover:bg-[#FBF6EA] font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all whitespace-nowrap"
          >
            + Upload Document
          </button>
        </div>

        {activeSection === 'Overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-3">
                What This Drafting Session Has Already Created
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {createdRows.map((row, i) => (
                  <div key={row.label} className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 flex gap-3">
                    <span className="font-mono text-xs font-bold text-[#B0A588]">{i + 1}.</span>
                    <div>
                      <p className="text-xs font-bold text-[#3A3222]">{row.label}</p>
                      <p className="text-xs text-[#8A7A56] mt-0.5">{row.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-3">Chronological Stream</h3>
                <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 space-y-3">
                  {timelineStream.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${item.done ? 'bg-[#8A6D2F]' : 'bg-[#E7DFC9]'}`}
                      />
                      <p className={`text-xs font-semibold ${item.done ? 'text-[#3A3222]' : 'text-[#B0A588]'}`}>
                        {item.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-3">Missing Information</h3>
                <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 space-y-2">
                  {missingItems.map((item) => (
                    <p key={item} className="text-xs font-semibold text-[#8A6D2F] flex items-center gap-2">
                      <span>⚠</span> {item}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'Documents' && (
          <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4">
            <p className="text-xs font-bold text-[#3A3222]">{data.documentName}</p>
            <p className="text-xs text-[#8A7A56] mt-1">
              {data.paragraphCount} paragraph{data.paragraphCount === 1 ? '' : 's'} — Draft, held in this browser session only
            </p>
          </div>
        )}

        {activeSection === 'Proceedings' && (
          <p className="text-xs text-[#B0A588] italic p-4 bg-white border border-[#E7DFC9]/80 rounded-xl">
            No proceedings recorded yet — this section will populate as the matter progresses.
          </p>
        )}

        {activeSection === 'Timeline' && (
          <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 space-y-3">
            {timelineStream.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.done ? 'bg-[#8A6D2F]' : 'bg-[#E7DFC9]'}`} />
                <p className={`text-xs font-semibold ${item.done ? 'text-[#3A3222]' : 'text-[#B0A588]'}`}>{item.label}</p>
              </div>
            ))}
          </div>
        )}

        {activeSection === 'Tasks' && (
          <p className="text-xs text-[#B0A588] italic p-4 bg-white border border-[#E7DFC9]/80 rounded-xl">
            One filing task has been suggested (illustrative only — task creation is not yet implemented in this prototype).
          </p>
        )}

        {activeSection === 'Research' && (
          <p className="text-xs text-[#B0A588] italic p-4 bg-white border border-[#E7DFC9]/80 rounded-xl">
            No research records yet — this section will populate as the matter progresses.
          </p>
        )}

        {activeSection === 'Parties' && (
          <p className="text-xs text-[#B0A588] italic p-4 bg-white border border-[#E7DFC9]/80 rounded-xl">
            Party names and full details have not yet been recorded. Full party-detail capture and short-title
            generation ("and Another" / "and Others") is a future milestone for this prototype.
          </p>
        )}

        {/* Next actions */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-3">Next Actions</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleNextAction('Continue Drafting')}
              className="px-5 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-bold text-[10px] uppercase tracking-widest rounded-lg shadow transition-all"
            >
              Continue Drafting
            </button>
            {['Upload Document', 'Add Hearing / Proceeding', 'Add Task', 'Start Legal Research'].map((label) => (
              <button
                key={label}
                onClick={() => handleNextAction(label)}
                className="px-4 py-2 border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
