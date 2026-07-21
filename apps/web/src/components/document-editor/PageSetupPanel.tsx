'use client';

import React from 'react';
import type { PageSetup, PaperSize, Orientation } from '@/lib/documents/editor/page-setup';
import { PAPER_SIZE_LABELS, ZOOM_PRESETS, clampZoom } from '@/lib/documents/editor/page-setup';

interface PageSetupPanelProps {
  pageSetup: PageSetup;
  onChange: (next: PageSetup) => void;
  onFitWidth: () => void;
  isFitWidth: boolean;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8A7A56] mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputClass = 'w-full px-2 py-1.5 bg-white border border-[#E7DFC9] rounded-md outline-none focus:border-[#8A6D2F] text-xs';

export function PageSetupPanel({ pageSetup, onChange, onFitWidth, isFitWidth }: PageSetupPanelProps) {
  const update = (patch: Partial<PageSetup>) => onChange({ ...pageSetup, ...patch });

  return (
    <div className="space-y-4" aria-label="Page setup">
      <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">Page Setup</h2>

      <div className="bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg px-2.5 py-2 text-[10px] font-semibold text-[#3A3222]">
        {PAPER_SIZE_LABELS[pageSetup.paperSize]} · {pageSetup.orientation === 'landscape' ? 'Landscape' : 'Portrait'} ·{' '}
        {pageSetup.margins.top}/{pageSetup.margins.right}/{pageSetup.margins.bottom}/{pageSetup.margins.left}mm margins
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Paper Size">
          <select
            className={inputClass}
            value={pageSetup.paperSize}
            onChange={(e) => update({ paperSize: e.target.value as PaperSize })}
          >
            {(Object.keys(PAPER_SIZE_LABELS) as PaperSize[]).map((size) => (
              <option key={size} value={size}>
                {PAPER_SIZE_LABELS[size]}
              </option>
            ))}
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

      <Field label="Zoom">
        <div className="grid grid-cols-4 gap-1.5">
          {ZOOM_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => update({ zoom: clampZoom(preset) })}
              aria-pressed={!isFitWidth && pageSetup.zoom === preset}
              className={`px-2 py-1.5 rounded-md border text-[10px] font-bold transition-colors ${
                !isFitWidth && pageSetup.zoom === preset
                  ? 'bg-[#111111] border-[#111111] text-white'
                  : 'bg-white border-[#E7DFC9] text-[#3A3222] hover:bg-[#FBF8F1]'
              }`}
            >
              {preset}%
            </button>
          ))}
          <button
            type="button"
            onClick={onFitWidth}
            aria-pressed={isFitWidth}
            className={`col-span-2 px-2 py-1.5 rounded-md border text-[10px] font-bold transition-colors ${
              isFitWidth ? 'bg-[#111111] border-[#111111] text-white' : 'bg-white border-[#E7DFC9] text-[#3A3222] hover:bg-[#FBF8F1]'
            }`}
          >
            Fit Width
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
