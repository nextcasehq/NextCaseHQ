'use client';

import React from 'react';
import { EditorContent, type Editor } from '@tiptap/react';
import { pageDimensionsMm, type PageSetup } from '@/lib/documents/editor/page-setup';
import { Ruler } from './Ruler';

export const MM_TO_PX = 96 / 25.4;

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
 * a white box. Sits on the surrounding soft-grey workspace background
 * (applied by the caller) with a realistic drop shadow and a horizontal
 * ruler scaled to match.
 */
const RULER_HEIGHT_PX = 20;

export function DocumentCanvas({ editor, pageSetup, defaultFontFamily }: DocumentCanvasProps) {
  const { width, height } = pageDimensionsMm(pageSetup.paperSize, pageSetup.orientation);
  const widthPx = width * MM_TO_PX;
  const heightPx = height * MM_TO_PX;
  const scale = pageSetup.zoom / 100;
  // The ruler and page are scaled together as one unit so their
  // horizontal positions always agree; the natural (unscaled) height of
  // that unit is compensated below so a non-100% zoom doesn't leave a
  // stale layout gap or overlap beneath it (transform doesn't affect the
  // space an element reserves in flow).
  const naturalUnitHeight = RULER_HEIGHT_PX + 4 + heightPx;

  return (
    <div className="flex flex-col items-center py-8 overflow-x-auto">
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          marginBottom: `${(scale - 1) * naturalUnitHeight}px`,
        }}
      >
        <Ruler
          widthPx={widthPx}
          marginLeftPx={pageSetup.margins.left * MM_TO_PX}
          marginRightPx={pageSetup.margins.right * MM_TO_PX}
          mmToPx={MM_TO_PX}
        />
        <div
          id="nchq-print-page"
          className="nchq-document-page bg-white border border-[#E7DFC9]/60 mt-1"
          style={{
            width: `${widthPx}px`,
            minHeight: `${heightPx}px`,
            paddingTop: `${pageSetup.margins.top * MM_TO_PX}px`,
            paddingBottom: `${pageSetup.margins.bottom * MM_TO_PX}px`,
            paddingLeft: `${pageSetup.margins.left * MM_TO_PX}px`,
            paddingRight: `${pageSetup.margins.right * MM_TO_PX}px`,
            fontFamily: defaultFontFamily,
            boxShadow: '0 1px 2px rgba(17,17,17,0.08), 0 12px 28px rgba(17,17,17,0.18), 0 32px 64px -12px rgba(17,17,17,0.22)',
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
    </div>
  );
}
