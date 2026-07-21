'use client';

import React from 'react';

interface PageThumbnailsProps {
  pageCount: number;
  currentPage: number;
  onNavigate: (page: number) => void;
  orientation: 'portrait' | 'landscape';
}

/**
 * Page thumbnails per the UI/UX Specification §6. The editor is a single
 * continuous ProseMirror document, so a "page" here is the region between
 * consecutive PageBreak nodes — these thumbnails are honest numbered page
 * markers (not rendered content previews), clickable, and shaped to the
 * real page aspect ratio. Reordering is not implemented; the list is
 * static and only supports navigation.
 */
export function PageThumbnails({ pageCount, currentPage, onNavigate, orientation }: PageThumbnailsProps) {
  const aspect = orientation === 'landscape' ? 'aspect-[297/210]' : 'aspect-[210/297]';

  return (
    <div className="no-print flex flex-col items-center gap-2 py-2" aria-label="Page navigation">
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onNavigate(page)}
          aria-current={page === currentPage}
          aria-label={`Go to page ${page}`}
          className={`w-14 shrink-0 ${aspect} rounded-sm border-2 flex items-center justify-center text-[10px] font-bold transition-colors ${
            page === currentPage
              ? 'border-[#8A6D2F] bg-[#FBF6EA] text-[#8A6D2F]'
              : 'border-[#E7DFC9] bg-white text-[#B0A588] hover:border-[#8A6D2F]/60'
          }`}
        >
          {page}
        </button>
      ))}
    </div>
  );
}
