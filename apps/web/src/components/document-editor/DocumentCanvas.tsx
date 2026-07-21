'use client';

import React from 'react';
import { EditorContent, type Editor } from '@tiptap/react';
import { pageDimensionsMm, type PageSetup } from '@/lib/documents/editor/page-setup';

const MM_TO_PX = 96 / 25.4;

interface DocumentCanvasProps {
  editor: Editor | null;
  pageSetup: PageSetup;
  defaultFontFamily: string;
}

/**
 * Renders the editor inside a real, print-proportioned page: visible
 * paper boundaries, margins as actual padding (not decoration), a
 * header/footer band, and a page-number placeholder — so what the
 * advocate sees on screen corresponds to what prints, not a textarea in
 * a white box.
 */
export function DocumentCanvas({ editor, pageSetup, defaultFontFamily }: DocumentCanvasProps) {
  const { width, height } = pageDimensionsMm(pageSetup.paperSize, pageSetup.orientation);
  const widthPx = width * MM_TO_PX;
  const heightPx = height * MM_TO_PX;
  const scale = pageSetup.zoom / 100;

  return (
    <div className="flex flex-col items-center py-8 overflow-x-auto">
      <div
        id="nchq-print-page"
        className="nchq-document-page bg-white shadow-xl shadow-[#F4EEE0]/60 border border-[#E7DFC9]"
        style={{
          width: `${widthPx}px`,
          minHeight: `${heightPx}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          marginBottom: `${(scale - 1) * heightPx}px`,
          paddingTop: `${pageSetup.margins.top * MM_TO_PX}px`,
          paddingBottom: `${pageSetup.margins.bottom * MM_TO_PX}px`,
          paddingLeft: `${pageSetup.margins.left * MM_TO_PX}px`,
          paddingRight: `${pageSetup.margins.right * MM_TO_PX}px`,
          fontFamily: defaultFontFamily,
        }}
      >
        {pageSetup.header && (
          <div className="text-center text-[10px] font-bold uppercase tracking-wider text-[#8A7A56] pb-3 mb-4 border-b border-[#F4EEE0]">
            {pageSetup.header}
          </div>
        )}

        <EditorContent editor={editor} />

        {(pageSetup.footer || pageSetup.showPageNumbers) && (
          <div className="flex items-center justify-between text-[9px] text-[#B0A588] pt-3 mt-6 border-t border-[#F4EEE0]">
            <span>{pageSetup.footer}</span>
            {pageSetup.showPageNumbers && <span>Page 1</span>}
          </div>
        )}
      </div>
    </div>
  );
}
