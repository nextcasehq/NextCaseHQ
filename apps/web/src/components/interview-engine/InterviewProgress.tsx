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

export function InterviewProgress({ pageTitles, currentPageIndex, mode, onJumpToPage }: Props) {
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Interview progress">
      {pageTitles.map((title, index) => {
        const isCurrent = mode === 'filling' && index === currentPageIndex;
        const isComplete = mode === 'review' || index < currentPageIndex;
        return (
          <li key={title}>
            <button
              type="button"
              onClick={() => onJumpToPage(index)}
              aria-current={isCurrent ? 'step' : undefined}
              className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] focus-visible:ring-offset-1 ${
                isCurrent ? 'bg-[#8A6D2F] text-white border-[#8A6D2F]' : isComplete ? 'border-[#8A6D2F] text-[#8A6D2F]' : 'border-[#E7DFC9] text-[#8A7A56]'
              }`}
            >
              {index + 1}. {title}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
