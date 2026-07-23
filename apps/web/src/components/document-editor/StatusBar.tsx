'use client';

import React from 'react';
import { PAPER_SIZE_LABELS, type PaperSize, type Orientation } from '@/lib/documents/editor/page-setup';
interface StatusBarProps {
  currentPage: number;
  pageCount: number;
  zoom: number;
  paperSize: PaperSize;
  orientation: Orientation;
  autosaveLabel: string;
  autosaveDotClass: string;
  wordCount: number;
  characterCount: number;
}

function Item({ children, hideBelowSm }: { children: React.ReactNode; hideBelowSm?: boolean }) {
  return (
    <span
      className={`items-center gap-1.5 text-[10px] font-semibold text-[#5C5340] whitespace-nowrap ${
        hideBelowSm ? 'hidden sm:flex' : 'flex'
      }`}
    >
      {children}
    </span>
  );
}

function Sep({ hideBelowSm }: { hideBelowSm?: boolean }) {
  return <span className={`w-px h-3.5 bg-[#E7DFC9] ${hideBelowSm ? 'hidden sm:block' : ''}`} aria-hidden="true" />;
}

/**
 * Fixed to the bottom of the workspace. On narrow (mobile) widths, the
 * lower-priority fields (zoom, paper size, orientation, language,
 * character count) collapse away rather than forcing this bar into its
 * own horizontally-scrollable strip — the workspace has no horizontal
 * scrolling anywhere, including here. All fields remain visible from the
 * `sm` breakpoint up (tablet and desktop).
 */
export function StatusBar({
  currentPage,
  pageCount,
  zoom,
  paperSize,
  orientation,
  autosaveLabel,
  autosaveDotClass,
  wordCount,
  characterCount,
}: StatusBarProps) {
  return (
    <div
      role="status"
      aria-label="Document status bar"
      className="no-print fixed bottom-0 left-0 right-0 z-30 h-[24px] bg-white border-t border-[#E7DFC9]/80 flex items-center justify-between px-3 sm:px-4 gap-2 sm:gap-3"
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Item>
          Page {currentPage} of {pageCount}
        </Item>
        <Sep hideBelowSm />
        <Item hideBelowSm>Zoom {zoom}%</Item>
        <Sep hideBelowSm />
        <Item hideBelowSm>{PAPER_SIZE_LABELS[paperSize]}</Item>
        <Sep hideBelowSm />
        <Item hideBelowSm>{orientation === 'landscape' ? 'Landscape' : 'Portrait'}</Item>
        <Sep hideBelowSm />
        {/* No per-draft language selection exists yet — a fixed, honest
            value rather than implying a switcher that isn't built. */}
        <Item hideBelowSm>English</Item>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <Item>
          <span className={`w-1.5 h-1.5 rounded-full ${autosaveDotClass}`} aria-hidden="true" />
          {autosaveLabel}
        </Item>
        <Sep />
        <Item>{wordCount} words</Item>
        <Sep hideBelowSm />
        <Item hideBelowSm>{characterCount} characters</Item>
      </div>
    </div>
  );
}
