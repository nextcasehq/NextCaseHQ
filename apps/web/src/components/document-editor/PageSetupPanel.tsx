'use client';

import React from 'react';
import type { PageSetup, PaperSize, Orientation } from '@/lib/documents/editor/page-setup';
import { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, clampZoom } from '@/lib/documents/editor/page-setup';

interface PageSetupPanelProps {
  pageSetup: PageSetup;
  onChange: (next: PageSetup) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8A7A56] mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputClass = 'w-full px-2 py-1.5 bg-white border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs';

export function PageSetupPanel({ pageSetup, onChange }: PageSetupPanelProps) {
  const update = (patch: Partial<PageSetup>) => onChange({ ...pageSetup, ...patch });

  return (
    <div className="space-y-4" aria-label="Page setup">
      <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">Page Setup</h2>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Paper Size">
          <select
            className={inputClass}
            value={pageSetup.paperSize}
            onChange={(e) => update({ paperSize: e.target.value as PaperSize })}
          >
            <option value="A4">A4</option>
            <option value="LETTER">Letter</option>
          </select>
        </Field>
        <Field label="Orientation">
          <select
            className={inputClass}
            value={pageSetup.orientation}
            onChange={(e) => update({ orientation: e.target.value as Orientation })}
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </Field>
      </div>

      <div>
        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8A7A56] mb-1">
          Margins (mm)
        </span>
        <div className="grid grid-cols-2 gap-2">
          <input
            aria-label="Top margin"
            type="number"
            min={0}
            max={100}
            value={pageSetup.margins.top}
            onChange={(e) => update({ margins: { ...pageSetup.margins, top: Number(e.target.value) } })}
            className={inputClass}
            placeholder="Top"
          />
          <input
            aria-label="Bottom margin"
            type="number"
            min={0}
            max={100}
            value={pageSetup.margins.bottom}
            onChange={(e) => update({ margins: { ...pageSetup.margins, bottom: Number(e.target.value) } })}
            className={inputClass}
            placeholder="Bottom"
          />
          <input
            aria-label="Left margin"
            type="number"
            min={0}
            max={100}
            value={pageSetup.margins.left}
            onChange={(e) => update({ margins: { ...pageSetup.margins, left: Number(e.target.value) } })}
            className={inputClass}
            placeholder="Left"
          />
          <input
            aria-label="Right margin"
            type="number"
            min={0}
            max={100}
            value={pageSetup.margins.right}
            onChange={(e) => update({ margins: { ...pageSetup.margins, right: Number(e.target.value) } })}
            className={inputClass}
            placeholder="Right"
          />
        </div>
      </div>

      <Field label={`Zoom — ${pageSetup.zoom}%`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => update({ zoom: clampZoom(pageSetup.zoom - ZOOM_STEP) })}
            className="w-7 h-7 shrink-0 rounded-md border border-[#E7DFC9] bg-white text-xs font-bold"
          >
            −
          </button>
          <input
            aria-label="Zoom level"
            type="range"
            min={ZOOM_MIN}
            max={ZOOM_MAX}
            step={ZOOM_STEP}
            value={pageSetup.zoom}
            onChange={(e) => update({ zoom: clampZoom(Number(e.target.value)) })}
            className="flex-1"
          />
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => update({ zoom: clampZoom(pageSetup.zoom + ZOOM_STEP) })}
            className="w-7 h-7 shrink-0 rounded-md border border-[#E7DFC9] bg-white text-xs font-bold"
          >
            +
          </button>
        </div>
      </Field>

      <Field label="Header">
        <input
          type="text"
          value={pageSetup.header}
          onChange={(e) => update({ header: e.target.value })}
          className={inputClass}
          placeholder="e.g. IN THE HIGH COURT OF DELHI"
        />
      </Field>

      <Field label="Footer">
        <input
          type="text"
          value={pageSetup.footer}
          onChange={(e) => update({ footer: e.target.value })}
          className={inputClass}
          placeholder="Footer text"
        />
      </Field>

      <label className="flex items-center gap-2 text-xs font-semibold text-[#3A3222]">
        <input
          type="checkbox"
          checked={pageSetup.showPageNumbers}
          onChange={(e) => update({ showPageNumbers: e.target.checked })}
        />
        Show page numbers
      </label>
    </div>
  );
}
