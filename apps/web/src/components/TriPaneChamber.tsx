'use client';

import React, { useState, useEffect } from 'react';

/**
 * NCHQ Module 7: High-Focus Tri-Pane AI Chamber Canvas
 * Implements a responsive three-panel workspace with horizontal swipe logic.
 * Polished with NDL design tokens and loading skeleton states.
 */
export const TriPaneChamber = () => {
  const [activePanel, setActivePanel] = useState(1); // 0: Evidence, 1: Chat, 2: Drafting
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial workspace hydration
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

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

  const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-brand/5 rounded ${className}`} />
  );

  return (
    <div
      className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-bg-base text-text-primary"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Left Panel (25%): Evidence & Citations */}
      <aside
        className={`
          flex-none w-[25%] border-r border-brand/10 bg-bg-surface/50 overflow-y-auto p-2
          transition-transform duration-300 ease-in-out
          ${activePanel === 0 ? 'translate-x-0' : 'max-md:hidden'}
        `}
      >
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-primary/40 mb-2 p-1">Evidence & Citations</h2>
        <div className="space-y-2 font-mono text-[13px] leading-relaxed">
          {isLoading ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : (
            <>
              <div className="p-3 bg-bg-surface border border-brand/5 rounded shadow-sm">
                <span className="text-brand font-bold">[Ex. A]</span> WP 132/2026 - Page 14
                <p className="mt-1 text-text-primary/70">"The petitioner maintains that the limitation period was tolled during the state of emergency..."</p>
              </div>
              <div className="p-3 bg-bg-surface border border-brand/5 rounded shadow-sm">
                <span className="text-brand font-bold">[Ex. B]</span> NI Act Section 138 Notice
                <p className="mt-1 text-text-primary/70">"Notice served via registered post on 12-Jan-2026."</p>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Central Panel (45%): AI Dialogue Stream */}
      <main
        className={`
          flex-none w-[45%] bg-bg-surface flex flex-col
          transition-transform duration-300 ease-in-out
          ${activePanel === 1 ? 'translate-x-0' : 'max-md:hidden max-md:w-full'}
          max-md:flex-1
        `}
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="max-w-prose mx-auto">
            {isLoading ? (
              <Skeleton className="h-20 w-3/4" />
            ) : (
              <p className="font-serif text-lg leading-loose">
                Analysis of the limitation period suggests that the filing remains within the statutory bounds,
                provided the Section 5 condonation application is filed concurrently.
              </p>
            )}
          </div>
          <div className="max-w-prose mx-auto border-t border-brand/5 pt-4">
            {isLoading ? (
              <Skeleton className="h-16 w-1/2" />
            ) : (
              <p className="font-serif text-lg leading-loose">
                Would you like me to draft the condonation of delay application based on Exhibit A?
              </p>
            )}
          </div>
        </div>
        <div className="p-2 border-t border-brand/10 bg-bg-base/30">
          <input
            type="text"
            placeholder="Instruct the AI Chamber..."
            className="w-full bg-bg-surface border border-brand/20 rounded-md p-2 outline-none focus:border-brand transition-colors"
          />
        </div>
      </main>

      {/* Right Panel (30%): Production Draft Canvas */}
      <section
        className={`
          flex-none w-[30%] border-l border-brand/10 bg-bg-surface overflow-y-auto p-4
          transition-transform duration-300 ease-in-out
          ${activePanel === 2 ? 'translate-x-0' : 'max-md:hidden'}
        `}
      >
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-primary/40 mb-3 p-1">Production Draft</h2>
        <div className="prose prose-sm max-w-none">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-1/2 mx-auto" />
              <Skeleton className="h-4 w-1/3 mx-auto" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <>
              <h1 className="text-center font-bold text-xl mb-4">IN THE HIGH COURT OF DELHI AT NEW DELHI</h1>
              <p className="font-serif italic mb-2">Writ Petition (Civil) No. 132 of 2026</p>
              <div className="h-96 w-full border border-dashed border-brand/20 rounded p-4 text-text-primary/30 italic">
                Drafting in progress...
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};
