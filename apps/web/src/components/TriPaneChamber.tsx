'use client';

import React, { useState, useEffect } from 'react';

/**
 * NextCaseHQ: Premium High-Focus Tri-Pane AI Chamber Canvas (v1.0 UI Constitution)
 * Strict Adherence to Design Language:
 * - White-first background
 * - Black typography
 * - Single Indigo/Violet accent
 * - Minimalist, Premium, Clean, Spacious
 * - Apple × Linear × Notion quality
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

  const chatMessages = [
    {
      role: 'user',
      text: 'Analyze the limitation period for the NI Act Section 138 filing based on the timeline in Exhibit B.'
    },
    {
      role: 'assistant',
      text: 'Analysis of the timeline in Exhibit B suggests that the limitation period remains within strict statutory bounds. The notice was served on 12-Jan-2026, creating a 15-day compliance window expiring on 27-Jan-2026. The cause of action arose on 28-Jan-2026, allowing the 30-day filing window under Section 142 to run until 27-Feb-2026. To ensure zero procedural risk, I recommend drafting the petition concurrently.'
    }
  ];

  const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-brand/5 rounded ${className}`} />
  );

  return (
    <div className="flex h-full w-full overflow-hidden bg-white font-sans text-neutral-900">
      {/* Left Panel (25%): Evidence & Citation Ledger */}
      <aside
        className={`
          flex-none w-full md:w-[25%] border-r border-neutral-100 bg-neutral-50/50 overflow-y-auto p-6
          transition-all duration-300 ease-in-out
          ${activePanel === 0 ? 'block' : 'hidden md:block'}
        `}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Evidence & Citations</h2>
          <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-mono font-semibold">
            {evidenceList.length} items
          </span>
        </div>

        <div className="space-y-4">
          {evidenceList.map((item) => (
            <div
              key={item.id}
              className="p-5 bg-white border border-neutral-100 hover:border-indigo-100 rounded-xl transition-all hover:shadow-sm group cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {item.id}
                </span>
                <span className="text-xs font-bold text-neutral-700 font-sans">
                  {item.citation}
                </span>
              </div>
              <p className="text-xs font-mono leading-relaxed text-neutral-500 font-medium">
                "{item.snippet}"
              </p>
              <div className="mt-3 text-[10px] text-neutral-400 font-mono flex items-center justify-between">
                <span>TIMESTAMP</span>
                <span>{item.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Central Panel (45%): AI Conversation Workspace */}
      <main
        className={`
          flex-none w-full md:w-[45%] bg-white flex flex-col border-r border-neutral-100
          transition-all duration-300 ease-in-out
          ${activePanel === 1 ? 'block' : 'hidden md:block'}
        `}
      >
        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <div className="max-w-prose mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-8 text-center">AI Dialogue Stream</h2>
          </div>

          <div className="space-y-6 max-w-prose mx-auto">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-1.5 px-1">
                  {msg.role === 'user' ? 'Counsel' : 'Assistant (v1.0)'}
                </div>
                <div
                  className={`
                    p-6 rounded-2xl max-w-[90%] font-serif text-[15px] leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-neutral-50 text-neutral-800 border border-neutral-100'
                      : 'bg-white text-neutral-900 border border-neutral-100 shadow-sm'
                    }
                  `}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
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
              type="submit"
              className="absolute right-2 p-1.5 rounded-lg text-neutral-400 hover:text-indigo-600 hover:bg-neutral-50 transition-all"
              aria-label="Send message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </form>
      </main>

      {/* Right Panel (30%): Drafting Workspace */}
      <section
        className={`
          flex-none w-full md:w-[30%] bg-neutral-50/50 overflow-y-auto p-6 md:p-8
          transition-all duration-300 ease-in-out
          ${activePanel === 2 ? 'block' : 'hidden md:block'}
        `}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Production Drafting Canvas</h2>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wide">
            Draft v1
          </span>
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
            <div className="pl-4 flex justify-between">
              <span>Union of India & Ors.</span>
              <span className="font-bold">...Respondents</span>
            </div>

            <div className="h-px bg-neutral-100 my-6"></div>

            <p className="font-bold italic">MEMORANDUM OF WRIT PETITION UNDER ARTICLE 226 OF THE CONSTITUTION OF INDIA</p>
            <p className="text-justify text-xs text-neutral-500 font-sans italic bg-neutral-50 p-4 rounded-xl border border-neutral-100">
              Interactive drafting is locked in current workspace view. The draft preview dynamically binds to legal precedents loaded into your active session context.
            </p>
          </div>
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
