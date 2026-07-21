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

function Item({ children }: { children: React.ReactNode }) {
  return <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#5C5340] whitespace-nowrap">{children}</span>;
}

function Sep() {
  return <span className="w-px h-3.5 bg-[#E7DFC9]" aria-hidden="true" />;
}

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
      className="no-print fixed bottom-0 left-0 right-0 z-30 h-8 bg-white border-t border-[#E7DFC9]/80 flex items-center justify-between px-4 gap-3 overflow-x-auto"
    >
      <div className="flex items-center gap-3">
        <Item>
          Page {currentPage} of {pageCount}
        </Item>
        <Sep />
        <Item>Zoom {zoom}%</Item>
        <Sep />
        <Item>{PAPER_SIZE_LABELS[paperSize]}</Item>
        <Sep />
        <Item>{orientation === 'landscape' ? 'Landscape' : 'Portrait'}</Item>
      </div>
      <div className="flex items-center gap-3">
        <Item>
          <span className={`w-1.5 h-1.5 rounded-full ${autosaveDotClass}`} aria-hidden="true" />
          {autosaveLabel}
        </Item>
        <Sep />
        <Item>{wordCount} words</Item>
        <Sep />
        <Item>{characterCount} characters</Item>
      </div>
    </div>
  );
}
