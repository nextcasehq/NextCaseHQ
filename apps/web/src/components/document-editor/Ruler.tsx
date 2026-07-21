'use client';

import React from 'react';

const MM_PER_INCH = 25.4;

interface RulerProps {
  widthPx: number;
  marginLeftPx: number;
  marginRightPx: number;
  mmToPx: number;
}

/**
 * Horizontal ruler above the document page (UI/UX Specification §8),
 * scaled to the page's real printed width so its ticks line up with the
 * page beneath it. Renders inch-labeled major ticks and half-inch minor
 * ticks, with the margin region shaded — a visual scaffold only; it is
 * future-ready for interactive tab stops but does not implement them yet.
 */
export function Ruler({ widthPx, marginLeftPx, marginRightPx, mmToPx }: RulerProps) {
  const pxPerInch = MM_PER_INCH * mmToPx;
  const inchCount = Math.ceil(widthPx / pxPerInch);
  const ticks = Array.from({ length: inchCount * 2 + 1 }, (_, i) => i * (pxPerInch / 2));

  return (
    <div
      className="no-print relative h-5 bg-[#F4EEE0]/70 border border-[#E7DFC9] rounded-t-md overflow-hidden select-none"
      style={{ width: `${widthPx}px` }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-y-0 bg-white/70"
        style={{ left: 0, width: `${marginLeftPx}px` }}
      />
      <div
        className="absolute inset-y-0 bg-white/70"
        style={{ right: 0, width: `${marginRightPx}px` }}
      />
      {ticks.map((pos, i) => {
        const isMajor = i % 2 === 0;
        const inchLabel = i / 2;
        return (
          <div key={i} className="absolute bottom-0" style={{ left: `${pos}px` }}>
            <div className={`w-px bg-[#B0A588] ${isMajor ? 'h-2.5' : 'h-1.5'}`} />
            {isMajor && inchLabel > 0 && (
              <span className="absolute -top-3.5 left-0.5 text-[8px] text-[#8A7A56] font-semibold">{inchLabel}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
