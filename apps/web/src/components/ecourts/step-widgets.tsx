'use client';

import React from 'react';
import type { SelectOption, StepConfig } from '@/lib/ecourts-registry/types';

/**
 * Shared rendering primitives for any UI that walks a CourtSystemConfig's
 * select steps — CourtStatusWizard (the full eCourts Case Status search)
 * and CourtPicker (a shorter "just tell me the court name" picker used in
 * Matter/Proceeding creation) both render the exact same widgets for the
 * exact same step shape, so the two never drift on how a select step or a
 * free-text fallback looks or behaves.
 */

export function resolveOptions(
  step: Extract<StepConfig, { kind: 'select' }>,
  selections: Record<string, string>
): SelectOption[] | 'free-text' {
  return typeof step.options === 'function' ? step.options(selections) : step.options;
}

/** Small pill summarizing a completed step, e.g. "State: Kerala ✕". Click
 * to jump back — clears this step and every step after it, matching the
 * official eCourts pattern of re-narrowing a prior selection. */
export function CompletedStepChip({
  label,
  value,
  detail,
  onReset,
}: {
  label: string;
  value: string;
  detail?: string;
  onReset: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onReset}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DFC9] bg-[#FBF8F1] px-3 py-1.5 text-xs font-semibold text-[#3A3222] transition-colors hover:border-[#C6A253] hover:bg-white"
    >
      <span className="text-[#8A7A56]">{label}:</span> {value}
      {detail && <span className="text-[#B0A588]">({detail})</span>}
      <span aria-hidden="true" className="text-[#B0A588]">✕</span>
    </button>
  );
}

export function SelectStep({
  step,
  resolvedOptions,
  onChoose,
}: {
  step: Extract<StepConfig, { kind: 'select' }>;
  resolvedOptions: SelectOption[] | 'free-text';
  onChoose: (value: string) => void;
}) {
  const [freeText, setFreeText] = React.useState('');

  if (resolvedOptions === 'free-text') {
    return (
      <div className="space-y-2">
        <label htmlFor={`step-${step.key}`} className="block text-xs font-bold uppercase tracking-wider text-[#8A7A56]">
          {step.label}
        </label>
        <div className="flex gap-2">
          <input
            id={`step-${step.key}`}
            type="text"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder={step.freeTextPlaceholder ?? step.placeholder}
            className="flex-1 rounded-xl border border-[#E7DFC9] bg-[#FBFAF6] px-4 py-3 text-sm font-medium text-[#241E17] focus:border-[#8A6D2F] focus:outline-none"
          />
          <button
            type="button"
            disabled={!freeText.trim()}
            onClick={() => onChoose(freeText.trim())}
            className="rounded-xl bg-[#8A6D2F] px-4 text-sm font-bold text-white transition-colors hover:bg-[#6F5624] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label htmlFor={`step-${step.key}`} className="block text-xs font-bold uppercase tracking-wider text-[#8A7A56]">
        {step.label}
      </label>
      <select
        id={`step-${step.key}`}
        value=""
        onChange={(e) => onChoose(e.target.value)}
        className="w-full rounded-xl border border-[#E7DFC9] bg-[#FBFAF6] px-4 py-3 text-sm font-medium text-[#241E17] focus:border-[#8A6D2F] focus:outline-none"
      >
        <option value="" disabled>
          {step.placeholder}
        </option>
        {resolvedOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
