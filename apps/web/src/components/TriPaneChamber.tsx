'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * NextCaseHQ: Premium High-Focus Tri-Pane Litigation Intelligence Chamber (Sprint 4)
 * Strictly Adhering to the UI Constitution:
 * - Warm Ivory (#FDFBF7) background aspects
 * - Pure Black typography
 * - Single Indigo/Violet accent
 * - Complete E2E connectedness with Matter, Case, and Evidence context
 */
export const TriPaneChamber = () => {
  const [activePanel, setActivePanel] = useState(1); // 0: Evidence, 1: AI Chat, 2: Drafting
  const [inputText, setInputText] = useState('');
  const [caseContext, setCaseContext] = useState<any>(null);

  // Sample data conforming strictly to litigation context
  const [evidenceList, setEvidenceList] = useState([
    {
      id: 'EX-A',
      citation: 'WP 132/2026 - Page 14',
      snippet: 'The petitioner maintains that the limitation period was tolled during the state of emergency...',
      timestamp: '12-Jan-2026 10:30 UTC'
    },
    {
      id: 'EX-B',
      citation: 'NI Act Section 138 Notice',
      snippet: 'Notice served via registered post on 12-Jan-2026. Return receipt signed on 15-Jan-2026.',
      timestamp: '15-Jan-2026 14:15 UTC'
    },
    {
      id: 'EX-C',
      citation: 'High Court Precedent #234',
      snippet: 'Supreme Court ruling on negotiable instruments tolling provisions under special conditions.',
      timestamp: '18-Jan-2026 09:00 UTC'
    }
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedCase = sessionStorage.getItem('NEXTCASE_CURRENT_CASE_CONTEXT');
      if (storedCase) {
        setCaseContext(JSON.parse(storedCase));
      }

      const storedDoc = sessionStorage.getItem('NEXTCASE_CURRENT_DOC_CONTEXT');
      if (storedDoc) {
        const doc = JSON.parse(storedDoc);
        setEvidenceList((prev) => {
          if (prev.some(item => item.id === doc.id)) return prev;
          return [
            {
              id: doc.id.substring(0, 5).toUpperCase(),
              citation: doc.title,
              snippet: doc.snippet,
              timestamp: 'Loaded from Search'
            },
            ...prev
          ];
        });
      }
    }
  }, []);

  // Hearing Prep checklist state
  const [checklist, setChecklist] = useState({
    briefSigned: true,
    authorityBundles: false,
    crossExamNotes: true,
    clientNotified: true,
    rlsBindingVerified: true
  });

  const [inputText, setInputText] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'user',
      text: 'Analyze the limitation period for the NI Act Section 138 filing based on the timeline in Exhibit B.'
    },
    {
      role: 'assistant',
      text: 'Analysis of the timeline in Exhibit B suggests that the limitation period remains within strict statutory bounds. The notice was served on 12-Jan-2026, creating a 15-day compliance window expiring on 27-Jan-2026. The cause of action arose on 28-Jan-2026, allowing the 30-day filing window under Section 142 to run until 27-Feb-2026. To ensure zero procedural risk, I recommend drafting the petition concurrently.'
    }
  ]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;
    const userMsg = { role: 'user', text: inputText };

    // Proactive legal assistant responses based on keywords
    let responseText = "Understood, Counsel. Analyzing active litigation context and cross-referencing your Evidence Ledger indexes.";
    const lowerText = inputText.toLowerCase();

    if (lowerText.includes('contradict') || lowerText.includes('liar') || lowerText.includes('paradox')) {
      responseText = "CONTRADICTION DETECTED: Statement of witness Mr. Sharma in deposition contradicts service certificate EX-B. Sharma asserts notice was never received, but certified return receipt EX-B bears his verified signature dated 15-Jan-2026.";
    } else if (lowerText.includes('strategy') || lowerText.includes('win')) {
      responseText = "AI STRATEGY RECOMMENDATION: Shift oral argument focus to the statutory presumption under Section 139 of the Negotiable Instruments Act. This shifts the burden of proof entirely to the defense to prove the cheque was not issued for debt discharge.";
    } else if (lowerText.includes('limit') || lowerText.includes('days') || lowerText.includes('deadline')) {
      responseText = "LIMITATION ANALYSIS: Writ petition filing timeline remains active. Enforced filing window runs until 27-Feb-2026. Filing readiness currently stands at 95%.";
    }

    setChatMessages(prev => [...prev, userMsg, { role: 'assistant', text: responseText }]);
    setInputText('');
  };

  const evidenceList = [
    { id: 'EX-A', citation: 'WP 132/2026 - Page 14', snippet: 'The petitioner maintains that the limitation period was tolled during the state of emergency...', date: '10-Jan-2026', type: 'Pleading' },
    { id: 'EX-B', citation: 'NI Act Section 138 Notice', snippet: 'Notice served via registered post on 12-Jan-2026. Return receipt signed on 15-Jan-2026.', date: '12-Jan-2026', type: 'Notice' },
    { id: 'EX-C', citation: 'Sharma Deposition Transcript', snippet: 'I was in London from Jan 10 through Jan 18. I did not receive any statutory demand notice in New Delhi.', date: '15-Jan-2026', type: 'Deposition' }
  ];

  return (
    <div className="flex h-full w-full overflow-hidden bg-white font-sans text-neutral-900">

      {/* ──────────────────────────────────────────────────────────────────
          LEFT PANEL (25%): EVIDENCE LEDGER / CHRONOS TIMELINE / GRAPH
          ────────────────────────────────────────────────────────────────── */}
      <aside className={`
        flex-none w-full md:w-[25%] border-r border-neutral-100 bg-neutral-50/50 flex flex-col overflow-hidden h-full
        transition-all duration-300 ease-in-out
        ${activePanel === 0 ? 'block' : 'hidden md:flex'}
      `}>
        {/* Tab Headers */}
        <div className="flex border-b border-neutral-100 bg-white">
          {(['evidence', 'timeline', 'graph'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setLeftTab(tab)}
              className={`flex-1 py-3.5 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                leftTab === tab
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10'
                  : 'border-transparent text-neutral-400 hover:text-neutral-700'
              }`}
            >
              {tab === 'evidence' ? 'Ledger' : tab === 'timeline' ? 'Chronos' : 'Graph'}
            </button>
          ))}
        </div>

        {/* Dynamic Left Panel Views */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {leftTab === 'evidence' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Exhibits Registrar</h3>
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-mono font-bold uppercase">
                  {evidenceList.length} ITEMS
                </span>
              </div>
              <div className="space-y-3">
                {evidenceList.map(item => (
                  <div key={item.id} className="p-4 bg-white border border-neutral-200 rounded-xl hover:border-indigo-300 transition-all cursor-pointer">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{item.id}</span>
                      <span className="text-xs font-bold text-neutral-600">{item.citation}</span>
                    </div>
                    <p className="text-xs text-neutral-500 font-mono leading-relaxed">"{item.snippet}"</p>
                    <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-neutral-100 text-[9px] text-neutral-400 font-mono">
                      <span>TYPE: {item.type.toUpperCase()}</span>
                      <span>{item.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {leftTab === 'timeline' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Chronos Timeline</h3>
                <span className="text-[9px] bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-bold uppercase">1 PARADOX</span>
              </div>

              {/* Slider Controller */}
              <div className="p-4 bg-white border border-neutral-200 rounded-xl space-y-2">
                <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-widest">Temporal Filter: {timelineFilter}</span>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="1"
                  onChange={(e) => {
                    const vals = ['10-JAN', '12-JAN', '15-JAN'];
                    setTimelineFilter(vals[parseInt(e.target.value, 10)]);
                  }}
                  className="w-full accent-indigo-600"
                />
              </div>

              {/* Vertical Plotted Timeline */}
              <div className="relative pl-6 border-l-2 border-neutral-100 space-y-6">
                <div className="relative">
                  <span className="absolute -left-[31px] top-1 w-4 h-4 bg-green-500 rounded-full border-4 border-white shadow-sm" />
                  <span className="text-[9px] font-mono font-bold text-neutral-400">10-Jan-2026 // Pleading</span>
                  <h4 className="font-bold text-xs text-neutral-800">Writ Petition Draft Compiled</h4>
                </div>

                <div className="relative">
                  <span className="absolute -left-[31px] top-1 w-4 h-4 bg-indigo-500 rounded-full border-4 border-white shadow-sm" />
                  <span className="text-[9px] font-mono font-bold text-indigo-600">12-Jan-2026 // Notice</span>
                  <h4 className="font-bold text-xs text-neutral-800">Section 138 Notice Served</h4>
                </div>

                {/* Paradox Point */}
                <div className="relative p-3 bg-red-50/50 border border-red-200/60 rounded-xl">
                  <span className="absolute -left-[27px] top-4 w-4 h-4 bg-red-500 rounded-full border-4 border-white shadow-sm animate-pulse" />
                  <span className="text-[9px] font-mono font-bold text-red-600 block">⚠️ CHRONOLOGY CONFLICT</span>
                  <span className="text-[8px] font-mono font-bold text-neutral-400 block mt-0.5">15-Jan-2026 // Deposition</span>
                  <h4 className="font-bold text-xs text-red-900 mt-1">Sharma Alibi Contradiction</h4>
                  <p className="text-[10px] text-red-700 mt-1 leading-relaxed">
                    Sharma deposition transcript claims London travel, but registered notice delivery logs (EX-B) prove verified hand-delivery on 15-Jan.
                  </p>
                </div>
              </div>
            </div>
          )}

          {leftTab === 'graph' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Connected Litigant Networks</h3>

              <div className="p-4 bg-white border border-neutral-200 rounded-xl space-y-4 font-mono">
                <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-widest">Click node to filter context</span>

                <div className="space-y-2 text-xs font-bold">
                  {[
                    { id: 'client', label: 'Client: NextCaseHQ', icon: '🏢' },
                    { id: 'sharma', label: 'Opponent: K. R. Sharma', icon: '👤' },
                    { id: 'judge', label: 'Coram: Justice Chandrachud', icon: '⚖️' },
                    { id: 'statute', label: 'Statute: NI Act Sec 138', icon: '📖' }
                  ].map(node => (
                    <button
                      key={node.id}
                      onClick={() => setSelectedEntity(node.id === selectedEntity ? null : node.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded border transition-all ${
                        selectedEntity === node.id
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-600'
                      }`}
                    >
                      <span>{node.icon} {node.label}</span>
                      <span className="text-[9px] uppercase tracking-wider">{selectedEntity === node.id ? 'ACTIVE' : 'SELECT'}</span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedEntity && (
                <div className="p-4 bg-indigo-50/50 border border-indigo-200/60 rounded-xl animate-fadeIn">
                  <span className="text-[10px] font-mono font-bold text-indigo-700 uppercase block mb-1">RELATIONAL INTELLIGENCE</span>
                  <p className="text-xs text-indigo-900 leading-relaxed font-semibold">
                    {selectedEntity === 'client' && 'NextCaseHQ is bound to multi-tenant partition context.'}
                    {selectedEntity === 'sharma' && 'K. R. Sharma is the managing partner of Sterling Commerce. Opponent counsel representation led by Harish Salve.'}
                    {selectedEntity === 'judge' && 'Justice Chandrachud presiding. High probability of strict limitation checking on commercial dockets.'}
                    {selectedEntity === 'statute' && 'Negotiable Instruments Act Sec 138 applies. Requisite notice served, 15 days compliance expired.'}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </aside>

      {/* ──────────────────────────────────────────────────────────────────
          CENTER PANEL (45%): DIALOGUE / REASONING / CONTRADICTION MODULES
          ────────────────────────────────────────────────────────────────── */}
      <main className={`
        flex-none w-full md:w-[45%] bg-white flex flex-col border-r border-neutral-100 h-full overflow-hidden
        transition-all duration-300 ease-in-out
        ${activePanel === 1 ? 'block' : 'hidden md:flex'}
      `}>
        {/* Tab Headers */}
        <div className="flex border-b border-neutral-100 bg-white">
          {(['dialogue', 'reasoning', 'contradictions'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setCenterTab(tab)}
              className={`flex-1 py-3.5 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                centerTab === tab
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10'
                  : 'border-transparent text-neutral-400 hover:text-neutral-700'
              }`}
            >
              {tab === 'dialogue' ? 'Dialogue' : tab === 'reasoning' ? 'Reasoning Engine' : 'Contradictions'}
            </button>
          ))}
        </div>

        {/* Dynamic Center Views */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">

          {centerTab === 'dialogue' && (
            <div className="space-y-6 max-w-prose mx-auto">
              <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-6 text-center">AI Dialogue Stream</h2>

              <div className="space-y-6">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-1 px-1">
                      {msg.role === 'user' ? 'Counsel' : 'Assistant (v1.0)'}
                    </div>
                    <div className={`p-5 rounded-2xl max-w-[90%] font-serif text-[15px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-neutral-50 text-neutral-800 border border-neutral-200'
                        : 'bg-white text-neutral-900 border border-neutral-100 shadow-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {centerTab === 'reasoning' && (
            <div className="space-y-6 max-w-prose mx-auto">
              <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 text-center mb-2">Legal Reasoning Engine</h2>

              <div className="space-y-4">
                <div className="p-5 border border-neutral-100 rounded-xl space-y-2">
                  <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">Issue Identification</span>
                  <h4 className="font-bold text-sm text-neutral-800">Is the Demand Notice valid and served within statutory timelines?</h4>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Under Sec 138 NI Act, notice must be served within 30 days of dishonour. Cheque returned 08-Jan, notice served 12-Jan (4 days interval - compliant).
                  </p>
                </div>

                <div className="p-5 border border-neutral-100 rounded-xl space-y-2">
                  <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">Burden of Proof Map</span>
                  <h4 className="font-bold text-sm text-neutral-800">Statutory Presumption under Section 139</h4>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    The burden of proof lies entirely on the defender (K. R. Sharma) to rebut the presumption that the cheque was issued for debt discharge.
                  </p>
                </div>

                <div className="p-5 border border-neutral-100 rounded-xl space-y-2">
                  <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">Limitation Analysis</span>
                  <h4 className="font-bold text-sm text-neutral-800">Filing Window Period</h4>
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    15-day compliance window expires 27-Jan. Cause of action arises 28-Jan, petition must be filed in court before 27-Feb-2026.
                  </p>
                </div>
              </div>
            </div>
          )}

          {centerTab === 'contradictions' && (
            <div className="space-y-6 max-w-prose mx-auto">
              <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 text-center mb-2">Evidentiary Contradiction Tracker</h2>

              <div className="space-y-4">
                <div className="p-5 bg-red-50/50 border border-red-200/80 rounded-xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-mono font-bold text-red-600 uppercase tracking-wider">CRITICAL MISMATCH DETECTED</span>
                    <span className="text-[10px] font-mono font-bold text-neutral-400">EX-B vs EX-C</span>
                  </div>
                  <h4 className="font-bold text-sm text-red-950">Notice Service Receipt Mismatch</h4>
                  <p className="text-xs text-red-800 leading-relaxed">
                    Witness Mr. Sharma states under oath: *"I was in London and never received any statutory notice."*
                    Notice tracking log (EX-B) confirms: *Verified hand-delivery at Sharma's Delhi residence, counter-signed on 15-Jan.*
                  </p>
                  <p className="text-xs text-neutral-400 italic">This discrepancy discredits witness credibility under cross-examination.</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!inputText.trim()) return;
            setInputText('');
          }}
          className="p-4 md:p-6 border-t border-neutral-100 bg-neutral-50/30"
        >
          <div className="relative flex items-center max-w-prose mx-auto bg-white border border-neutral-200/80 rounded-xl shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-600/10 transition-all">
            <input
              type="text"
              placeholder="Instruct the AI Chamber..."
              className="w-full bg-transparent pl-4 pr-12 py-3 text-sm text-neutral-800 placeholder-neutral-400 outline-none font-medium"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <button
              className="absolute right-2 p-1.5 rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-neutral-50 transition-all"
              aria-label="Send message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        )}
      </main>

      {/* ──────────────────────────────────────────────────────────────────
          RIGHT PANEL (30%): DRAFTING CANVAS / HEARING PREPARATION
          ────────────────────────────────────────────────────────────────── */}
      <section className={`
        flex-none w-full md:w-[30%] bg-neutral-50/50 flex flex-col h-full overflow-hidden
        transition-all duration-300 ease-in-out
        ${activePanel === 2 ? 'block' : 'hidden md:flex'}
      `}>
        {/* Tab Headers */}
        <div className="flex border-b border-neutral-100 bg-white">
          {(['draft', 'hearing_prep', 'readiness'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setRightTab(tab)}
              className={`flex-1 py-3.5 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all ${
                rightTab === tab
                  ? 'border-indigo-600 text-indigo-600 bg-indigo-50/10'
                  : 'border-transparent text-neutral-400 hover:text-neutral-700'
              }`}
            >
              {tab === 'draft' ? 'Canvas' : tab === 'hearing_prep' ? 'Hearing Prep' : 'Readiness'}
            </button>
          ))}
        </div>

        {/* Legal Document Sheet */}
        <div className="bg-white border border-neutral-100 rounded-2xl p-6 md:p-8 shadow-xl shadow-neutral-100/50 min-h-[500px] flex flex-col">
          <div className="border-b border-neutral-100 pb-4 mb-6 text-center">
            <h3 className="font-extrabold text-sm tracking-widest text-neutral-800 font-sans uppercase">
              {caseContext ? `IN THE ${caseContext.court.toUpperCase()}` : "IN THE HIGH COURT OF DELHI AT NEW DELHI"}
            </h3>
            <p className="font-serif text-xs italic text-neutral-500 mt-1">
              {caseContext ? `Matter Ref: ${caseContext.id}` : "Writ Petition (Civil) No. 132 of 2026"}
            </p>
          </div>

          <div className="flex-1 font-serif text-sm text-neutral-700 space-y-4 leading-relaxed">
            <p className="font-bold">IN THE MATTER OF:</p>
            <div className="pl-4 flex justify-between">
              <span>{caseContext ? caseContext.title : "NextCaseHQ Technologies Inc."}</span>
              <span className="font-bold">...Petitioner / Plaintiff</span>
            </div>
            <div className="text-center py-2 font-bold uppercase tracking-wider text-xs text-neutral-400">
              VERSUS
            </div>
          )}

          {rightTab === 'hearing_prep' && (
            <div className="space-y-5 animate-fadeIn">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Courtroom Hearing Prep Core</h3>

              {/* Courtroom Checklist */}
              <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-3">
                <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1">Checklist dockets</span>
                <div className="space-y-2">
                  {Object.entries(checklist).map(([key, val]) => (
                    <label key={key} className="flex items-center gap-3 text-xs font-bold text-neutral-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={() => setChecklist(prev => ({ ...prev, [key]: !val }))}
                        className="rounded accent-indigo-600"
                      />
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Outlines and Questions */}
              <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
                <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-widest">Cross-Examination Outline</span>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-lg">
                    <span className="font-bold text-neutral-800">Q1. Confront Sharma with registered notice return card EX-B.</span>
                    <p className="text-[11px] text-neutral-500 mt-1">Goal: Discredit alibi regarding London travel.</p>
                  </div>
                  <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-lg">
                    <span className="font-bold text-neutral-800">Q2. Focus on cheque dishonour notice date.</span>
                    <p className="text-[11px] text-neutral-500 mt-1">Goal: Establish 15-day non-compliance window expiry.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {rightTab === 'readiness' && (
            <div className="space-y-5 animate-fadeIn">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Decision Support & Readiness</h3>

              <div className="bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
                <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-widest">Filing & Trial Readiness</span>

                <div className="space-y-3 text-xs font-bold text-neutral-700">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span>FILING COMPLIANCE</span>
                      <span className="text-green-600">100%</span>
                    </div>
                    <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full w-[100%]" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span>EVIDENCE PROVENANCE</span>
                      <span className="text-indigo-600">75%</span>
                    </div>
                    <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full w-[75%]" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span>CHRONOLOGICAL CORRELATION</span>
                      <span className="text-orange-600">50%</span>
                    </div>
                    <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-orange-500 h-full w-[50%]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* Mobile Tab Bar Selector (Visible on viewports < 768px) */}
      <div className="md:hidden fixed bottom-0 left-0 w-full h-16 bg-white border-t border-neutral-200 flex items-center justify-around z-50">
        <button
          onClick={() => setActivePanel(0)}
          className={`flex flex-col items-center gap-1 text-xs font-semibold ${activePanel === 0 ? 'text-indigo-600' : 'text-neutral-400'}`}
        >
          <span className="text-lg">⛓️</span>
          <span>Ledger</span>
        </button>
        <button
          onClick={() => setActivePanel(1)}
          className={`flex flex-col items-center gap-1 text-xs font-semibold ${activePanel === 1 ? 'text-indigo-600' : 'text-neutral-400'}`}
        >
          <span className="text-lg">⚡</span>
          <span>Dialogue</span>
        </button>
        <button
          onClick={() => setActivePanel(2)}
          className={`flex flex-col items-center gap-1 text-xs font-semibold ${activePanel === 2 ? 'text-indigo-600' : 'text-neutral-400'}`}
        >
          <span className="text-lg">✍️</span>
          <span>Draft</span>
        </button>
      </div>
    </div>
  );
};
