'use client';

import React, { useState } from 'react';

/**
 * NCHQ Module 7: High-Focus Tri-Pane AI Chamber Canvas
 * Implements a responsive three-panel workspace with horizontal swipe logic.
 */
export const TriPaneChamber = () => {
  const [activePanel, setActivePanel] = useState(1); // 0: Evidence, 1: Chat, 2: Drafting

  // Simple swipe simulation for mobile/touch
  const handleTouchStart = (e: React.TouchEvent) => {
    (window as any).touchStartX = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = (window as any).touchStartX - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0 && activePanel < 2) setActivePanel(activePanel + 1);
      if (diff < 0 && activePanel > 0) setActivePanel(activePanel - 1);
    }
  };

  return (
    <div
      className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-[#FDFBF7]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{ minWidth: '1200px', flexShrink: 0, flexFlow: 'row nowrap' }} // Explicit style rules to block container collapsing
    >
      {/* Left Panel (25%): Evidence & Citations */}
      <aside
        className={`
          flex-none w-[25%] border-r border-[#111111]/10 bg-white overflow-y-auto p-6 h-full
          transition-transform duration-300 ease-in-out
          ${activePanel === 0 ? 'translate-x-0' : 'max-md:hidden'}
        `}
        style={{ minWidth: '300px', flexShrink: 0 }}
      >
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#111111]/40 mb-4 font-sans">Evidence & Citations</h2>
        <div className="space-y-4 font-mono text-[13px] leading-relaxed">
          <div className="p-4 bg-[#FDFBF7] border border-[#111111]/10 rounded shadow-sm">
            <span className="text-[#C5A059] font-bold">[Ex. A]</span> WP 132/2026 - Page 14
            <p className="mt-2 text-[#111111]/70 font-sans">"The petitioner maintains that the limitation period was tolled during the state of emergency..."</p>
          </div>
          <div className="p-4 bg-[#FDFBF7] border border-[#111111]/10 rounded shadow-sm">
            <span className="text-[#C5A059] font-bold">[Ex. B]</span> NI Act Section 138 Notice
            <p className="mt-2 text-[#111111]/70 font-sans">"Notice served via registered post on 12-Jan-2026."</p>
          </div>
        </div>
      </aside>

      {/* Central Panel (45%): AI Dialogue Stream */}
      <main
        className={`
          flex-none w-[45%] bg-[#FDFBF7] flex flex-col h-full border-r border-[#111111]/10
          transition-transform duration-300 ease-in-out
          ${activePanel === 1 ? 'translate-x-0' : 'max-md:hidden max-md:w-full'}
          max-md:flex-1
        `}
        style={{ minWidth: '540px', flexShrink: 0 }}
      >
        <div className="flex-1 overflow-y-auto p-8 space-y-8 h-full">
          <div className="max-w-prose mx-auto">
            <p className="font-serif text-lg leading-loose text-[#111111]">
              Analysis of the limitation period suggests that the filing remains within the statutory bounds,
              provided the Section 5 condonation application is filed concurrently.
            </p>
          </div>
          <div className="max-w-prose mx-auto border-t border-[#111111]/10 pt-8">
            <p className="font-serif text-lg leading-loose text-[#111111]">
              Would you like me to draft the condonation of delay application based on Exhibit A?
            </p>
          </div>
        </div>
        <div className="p-4 border-t border-[#111111]/10 bg-white">
          <input
            type="text"
            placeholder="Instruct the AI Chamber..."
            className="w-full bg-[#111111]/5 border border-[#111111]/10 rounded p-3 outline-none focus:border-[#111111] font-sans text-sm"
          />
        </div>
      </main>

      {/* Right Panel (30%): Production Draft Canvas */}
      <section
        className={`
          flex-none w-[30%] bg-white overflow-y-auto p-8 h-full
          transition-transform duration-300 ease-in-out
          ${activePanel === 2 ? 'translate-x-0' : 'max-md:hidden'}
        `}
        style={{ minWidth: '360px', flexShrink: 0 }}
      >
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#111111]/40 mb-6 font-sans">Production Draft</h2>
        <div className="prose prose-sm max-w-none">
          <h1 className="text-center font-bold text-xl mb-8 font-serif text-[#111111]">IN THE HIGH COURT OF DELHI AT NEW DELHI</h1>
          <p className="font-serif italic mb-4 text-[#111111]/70">Writ Petition (Civil) No. 132 of 2026</p>
          <div className="h-96 w-full border border-dashed border-[#111111]/20 rounded p-4 text-[#111111]/30 italic font-serif">
            Drafting in progress...
          </div>
        </div>
      </section>
    </div>
  );
};
