'use client';

import React, { useState } from 'react';
import { generateLitigationInsights } from '@nextcase/ai-kernel';
import { getPrompt } from '@nextcase/prompt-library';

export const TriPaneChamber = () => {
  const [activePanel, setActivePanel] = useState(1); // 0: Evidence, 1: AI Chat, 2: Drafting
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Awaiting Evidence'); // Smart Status values

  // Dynamic state hooks for a truly responsive, editable experience
  const [evidenceList, setEvidenceList] = useState([
    {
      id: 'EX-A',
      citation: 'WP 132/2026 - Page 14',
      snippet: 'The petitioner maintains that the limitation period was tolled during the state of emergency...',
      timestamp: '12-Jan-2026 10:30 UTC',
      category: 'EXHIBIT'
    },
    {
      id: 'EX-B',
      citation: 'NI Act Section 138 Notice',
      snippet: 'Notice served via registered post on 12-Jan-2026. Return receipt signed on 15-Jan-2026.',
      timestamp: '15-Jan-2026 14:15 UTC',
      category: 'EXHIBIT'
    }
  ]);

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

  const [draftTitle, setDraftTitle] = useState('Writ Petition (Civil) No. 132 of 2026');
  const [draftBoilerplate, setDraftBoilerplate] = useState(
    `IN THE HIGH COURT OF DELHI AT NEW DELHI\n\nWrit Petition (Civil) No. 132 of 2026\n\nIN THE MATTER OF:\nNextCaseHQ Technologies Inc. ... Petitioner\n\nVERSUS\nUnion of India & Ors. ... Respondents\n\nMEMORANDUM OF WRIT PETITION UNDER ARTICLE 226 OF THE CONSTITUTION OF INDIA\n\nTo, The Hon'ble Chief Justice and Companion Judges...\n\n(Interactive template will load upon selecting an action or instructing the AI Chamber.)`
  );

  const [contradictions, setContradictions] = useState<any[]>([]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userText = inputText.trim();
    setInputText('');
    setLoading(true);

    // Append user message immediately
    setChatMessages(prev => [...prev, { role: 'user', text: userText }]);

    try {
      // Invoke the live litigation RAG & citation kernel from @nextcase/ai-kernel
      const insights = await generateLitigationInsights('LD-2026-0041', userText);

      // Fetch legal template prompts from @nextcase/prompt-library if requested
      if (userText.toLowerCase().includes('notice') || userText.toLowerCase().includes('138')) {
        const noticeTemplate = await getPrompt('NOTICE');
        if (noticeTemplate) {
          setDraftTitle('15-Day Demand Notice under Section 138, NI Act');
          setDraftBoilerplate(noticeTemplate);
          setStatus('Draft Required');
        }
      } else if (userText.toLowerCase().includes('writ') || userText.toLowerCase().includes('petition')) {
        const writTemplate = await getPrompt('WRIT');
        if (writTemplate) {
          setDraftTitle('Writ Petition under Article 226');
          setDraftBoilerplate(writTemplate);
          setStatus('Ready for Filing');
        }
      }

      // Add AI reply
      setChatMessages(prev => [...prev, { role: 'assistant', text: insights.response }]);

      // Dynamically load any contradictions found by the RAG validator
      if (insights.contradictions && insights.contradictions.length > 0) {
        setContradictions(prev => [...prev, ...insights.contradictions]);
        setStatus('Compliance Risk');
      }

      // Load static or dynamic extracted evidence nodes
      if (insights.citations && insights.citations.length > 0) {
        insights.citations.forEach(cit => {
          // Prevent duplicates in the ledger
          if (!evidenceList.some(e => e.id === cit.id)) {
            setEvidenceList(prev => [...prev, {
              id: cit.id,
              citation: cit.title,
              snippet: cit.exactSnippet,
              timestamp: 'Extracted Live',
              category: 'PRECEDENT'
            }]);
          }
        });
      }

    } catch (err) {
      console.error('[TRI_PANE] Error invoking litigation engine:', err);
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Error executing secure RAG citation retrieval. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-white font-sans text-neutral-900 selection:bg-indigo-600 selection:text-white">

      {/* Left Panel (25%): Evidence, Citations & Contradiction Ledger */}
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
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {item.id}
                  </span>
                  <span className="text-xs font-bold text-neutral-700 font-sans truncate max-w-[120px]">
                    {item.citation}
                  </span>
                </div>
                <span className="text-[9px] font-mono font-bold text-neutral-300 uppercase tracking-widest">
                  {item.category || 'EXHIBIT'}
                </span>
              </div>
              <p className="text-xs leading-relaxed text-neutral-500 font-serif italic">
                "{item.snippet}"
              </p>
              <div className="mt-3 text-[10px] text-neutral-400 font-mono flex items-center justify-between border-t border-neutral-50 pt-2">
                <span>TIMESTAMP</span>
                <span>{item.timestamp}</span>
              </div>
            </div>
          ))}

          {/* Dynamic Contradiction Alert Box */}
          {contradictions.length > 0 && (
            <div className="space-y-3 mt-6">
              <div className="h-px bg-neutral-100 my-4"></div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-red-600 flex items-center gap-1">
                ⚠️ Contradictions Found
              </h3>
              {contradictions.map((con, index) => (
                <div key={index} className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl text-xs space-y-2">
                  <div className="flex justify-between font-mono text-[10px] text-red-700 font-bold uppercase">
                    <span>{con.sourceA} vs {con.sourceB}</span>
                    <span className="bg-red-100 px-1.5 rounded">{con.impact}</span>
                  </div>
                  <p className="text-neutral-600 font-serif italic">"{con.statementA}" vs "{con.statementB}"</p>
                  <div className="bg-white p-2 rounded border border-red-500/5 text-[10px] text-neutral-500 leading-normal">
                    <strong className="text-red-700 font-bold block uppercase tracking-wider mb-0.5">Remedy:</strong>
                    {con.remedy}
                  </div>
                </div>
              ))}
            </div>
          )}
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
        {/* Header Smart Status and Next Action Panel */}
        <div className="px-6 py-4 border-b border-neutral-100 bg-neutral-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse"></span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block">Litigation Status</span>
              <span className="text-xs font-black uppercase tracking-wider text-neutral-800">{status}</span>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl text-left max-w-[200px]">
            <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-widest block mb-0.5">Recommended Next Action</span>
            <span className="text-[10px] font-bold text-neutral-700 leading-tight block">Prepare tomorrow's hearing</span>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
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
            {loading && (
              <div className="flex flex-col items-start">
                <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest mb-1.5">Assistant (v1.0)</div>
                <div className="p-6 rounded-2xl bg-white border border-neutral-100 shadow-sm flex items-center gap-3 text-sm text-neutral-500">
                  <span className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                  Analyzing exhibits and retrieving citations...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat Input Bar */}
        <form onSubmit={handleSendMessage} className="p-4 md:p-6 border-t border-neutral-100 bg-neutral-50/30">
          <div className="relative flex items-center max-w-prose mx-auto bg-white border border-neutral-200/80 rounded-xl shadow-sm focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-600/10 transition-all">
            <input
              type="text"
              placeholder="Ask AI Chamber to 'draft notice' or 'analyze contradicts'..."
              className="w-full bg-transparent pl-4 pr-12 py-3 text-sm text-neutral-800 placeholder-neutral-400 outline-none font-medium"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading}
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
          <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Drafting Canvas</h2>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wide">
            Interactive
          </span>
        </div>

        {/* Legal Document Sheet */}
        <div className="bg-white border border-neutral-100 rounded-2xl p-6 md:p-8 shadow-xl shadow-neutral-100/50 min-h-[500px] flex flex-col">
          <div className="border-b border-neutral-100 pb-4 mb-6 text-center">
            <h3 className="font-extrabold text-sm tracking-widest text-neutral-800 font-sans uppercase">
              {draftTitle}
            </h3>
          </div>

          <div className="flex-1 font-serif text-sm text-neutral-700 leading-relaxed">
            <textarea
              className="w-full h-full min-h-[400px] bg-transparent resize-none outline-none text-justify text-xs md:text-sm leading-relaxed text-neutral-800 placeholder-neutral-400 font-serif"
              value={draftBoilerplate}
              onChange={(e) => setDraftBoilerplate(e.target.value)}
              placeholder="Start drafting your court petition or demand notice..."
            />
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
