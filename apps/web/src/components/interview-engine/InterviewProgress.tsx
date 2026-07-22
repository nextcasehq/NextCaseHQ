'use client';

import React from 'react';

interface Props {
  /** Page titles only — the engine renders whatever strings the schema
   *  gives it; it has no idea these say "Court Details" or anything else. */
  pageTitles: string[];
  currentPageIndex: number;
  mode: 'filling' | 'review';
  onJumpToPage: (index: number) => void;
}

/**
 * A full chip-per-page row works on desktop but wraps into several rows
 * on a phone-width viewport once an interview has a dozen-plus pages —
 * verified live at 375px, where it pushed the first field below the fold
 * entirely. Below `sm`, this renders one compact "Step X of N" line plus
 * a thin fill bar instead; every chip is still reachable on desktop where
 * there's room for it.
 */
export function InterviewProgress({ pageTitles, currentPageIndex, mode, onJumpToPage }: Props) {
  const displayIndex = mode === 'review' ? pageTitles.length : currentPageIndex + 1;
  const currentTitle = mode === 'review' ? 'Review' : pageTitles[currentPageIndex];
  const percent = Math.round((displayIndex / pageTitles.length) * 100);

  return (
    <div>
      <div className="sm:hidden space-y-1.5" aria-label="Interview progress">
        <p className="text-xs font-semibold text-[#3A3222]">
          Step {displayIndex} of {pageTitles.length}: {currentTitle}
        </p>
        <div className="h-1 rounded-full bg-[#F4EEE0] overflow-hidden">
          <div className="h-full bg-[#8A6D2F] transition-all duration-200" style={{ width: `${percent}%` }} />
        </div>
      </div>
      {/* Deliberately no solid color fill on the current-page chip — a
          block of saturated color was the single most eye-catching thing
          on the whole screen, ahead of the page title it's meant to be
          secondary to. A heavier border plus bolder text signals "current"
          just as clearly without out-competing the actual content. */}
      <ol className="hidden sm:flex flex-wrap items-center gap-2" aria-label="Interview progress">
        {pageTitles.map((title, index) => {
          const isCurrent = mode === 'filling' && index === currentPageIndex;
          const isComplete = mode === 'review' || index < currentPageIndex;
          return (
            <li key={title}>
              <button
                type="button"
                onClick={() => onJumpToPage(index)}
                aria-current={isCurrent ? 'step' : undefined}
                className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] focus-visible:ring-offset-1 ${
                  isCurrent
                    ? 'border-2 border-[#8A6D2F] text-[#8A6D2F] font-extrabold'
                    : isComplete
                      ? 'font-bold border-[#8A6D2F]/50 text-[#8A6D2F]/70'
                      : 'font-bold border-[#E7DFC9] text-[#8A7A56]'
                }`}
              >
                {index + 1}. {title}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
