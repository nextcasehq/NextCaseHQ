'use client';

import React from 'react';
import Link from 'next/link';
import { districtCourtsConfig } from '@/lib/ecourts-registry/configs/district-courts';
import { COURT_SYSTEMS } from '@/lib/ecourts-registry/registry';
import type { SearchMethodStepConfig, SelectOption, StepConfig } from '@/lib/ecourts-registry/types';

const AVAILABLE_COURT_SYSTEMS = COURT_SYSTEMS.filter((cs) => cs.status === 'available');

function resolveOptions(
  step: Extract<StepConfig, { kind: 'select' }>,
  selections: Record<string, string>
): SelectOption[] | 'free-text' {
  return typeof step.options === 'function' ? step.options(selections) : step.options;
}

function isStepComplete(step: StepConfig, selections: Record<string, string>, searchMethodKey: string): boolean {
  if (step.kind === 'select') return Boolean(selections[step.key]);
  return Boolean(searchMethodKey);
}

/** Small pill summarizing a completed step, e.g. "State: Kerala ✕". Click
 * to jump back — clears this step and every step after it, matching the
 * official eCourts pattern of re-narrowing a prior selection. */
function CompletedStepChip({
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

/**
 * Registry-driven eCourts Case Status wizard. District Courts remains the
 * default, geography-first flow (no "pick a court system" step ahead of
 * State) since it's the most common search. Now that more than one court
 * system is `status: 'available'` in the registry, a small switcher lets
 * an advocate pick a different one first — every step after that is
 * still decided purely by its `kind` (from lib/ecourts-registry/configs/
 * *.ts) — no per-step-key or per-court branching lives here, so adding a
 * field, a search method, or a verified geography tier is a config
 * change only.
 */
export default function CourtStatusWizard() {
  const [courtSystemId, setCourtSystemId] = React.useState(districtCourtsConfig.id);
  const [selections, setSelections] = React.useState<Record<string, string>>({});
  const [searchMethodKey, setSearchMethodKey] = React.useState('');
  const [fieldValues, setFieldValues] = React.useState<Record<string, string>>({});
  const [submitted, setSubmitted] = React.useState(false);

  const activeConfig = AVAILABLE_COURT_SYSTEMS.find((cs) => cs.id === courtSystemId) ?? districtCourtsConfig;
  const steps = activeConfig.steps;

  function switchCourtSystem(id: string) {
    setCourtSystemId(id);
    setSelections({});
    setSearchMethodKey('');
    setFieldValues({});
    setSubmitted(false);
  }

  function resetFromStep(stepKey: string) {
    const idx = steps.findIndex((s) => s.key === stepKey);
    const keysFromHere = steps.slice(idx).map((s) => s.key);
    setSelections((prev) => {
      const next = { ...prev };
      for (const k of keysFromHere) delete next[k];
      return next;
    });
    if (keysFromHere.includes('searchMethod')) {
      setSearchMethodKey('');
      setFieldValues({});
    }
    setSubmitted(false);
  }

  const completed: StepConfig[] = [];
  let activeStep: StepConfig | undefined;
  for (const step of steps) {
    if (isStepComplete(step, selections, searchMethodKey)) {
      completed.push(step);
    } else {
      activeStep = step;
      break;
    }
  }

  const searchMethodStep = steps.find((s): s is SearchMethodStepConfig => s.kind === 'search-method');
  const chosenMethod = searchMethodStep?.methods.find((m) => m.key === searchMethodKey);
  const allStaticStepsComplete = !activeStep;

  // Cache each select step's resolved options so both the chip label and
  // the active widget read the exact same resolution (important once a
  // step's options carry per-option metadata, like a Court
  // Establishment's real court type).
  const resolvedByKey = new Map<string, SelectOption[] | 'free-text'>();
  for (const step of steps) {
    if (step.kind === 'select') resolvedByKey.set(step.key, resolveOptions(step, selections));
  }

  function chipFor(step: StepConfig): { value: string; detail?: string } {
    if (step.kind === 'select') {
      const raw = selections[step.key] ?? '';
      const resolved = resolvedByKey.get(step.key);
      const match = Array.isArray(resolved) ? resolved.find((o) => o.value === raw) : undefined;
      return { value: raw, detail: match?.meta?.courtType };
    }
    return { value: searchMethodStep?.methods.find((m) => m.key === searchMethodKey)?.label ?? '' };
  }

  return (
    <div className="space-y-4">
      {AVAILABLE_COURT_SYSTEMS.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_COURT_SYSTEMS.map((cs) => (
            <button
              key={cs.id}
              type="button"
              onClick={() => switchCourtSystem(cs.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${
                cs.id === courtSystemId
                  ? 'border-[#8A6D2F] bg-[#8A6D2F] text-white'
                  : 'border-[#E7DFC9] bg-white text-[#8A7A56] hover:border-[#8A6D2F] hover:text-[#6F5624]'
              }`}
            >
              {cs.label}
            </button>
          ))}
        </div>
      )}

      {completed.map((step) => {
        const { value, detail } = chipFor(step);
        return (
          <CompletedStepChip
            key={step.key}
            label={step.label.replace(/^Select /, '')}
            value={value}
            detail={detail}
            onReset={() => resetFromStep(step.key)}
          />
        );
      })}

      {activeStep && activeStep.kind === 'select' && (
        <SelectStep
          step={activeStep}
          resolvedOptions={resolvedByKey.get(activeStep.key) ?? []}
          onChoose={(value) => setSelections((prev) => ({ ...prev, [activeStep.key]: value }))}
        />
      )}

      {activeStep && activeStep.kind === 'search-method' && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#8A7A56]">{activeStep.label}</p>
          <div className="flex flex-wrap gap-2">
            {activeStep.methods.map((method) => (
              <button
                key={method.key}
                type="button"
                onClick={() => setSearchMethodKey(method.key)}
                className="rounded-lg border border-[#E7DFC9] bg-white px-3.5 py-2 text-xs font-semibold text-[#3A3222] transition-colors hover:border-[#8A6D2F] hover:bg-[#FBF8F1]"
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {allStaticStepsComplete && chosenMethod && !submitted && (
        <div className="space-y-3 rounded-xl border border-[#E7DFC9] bg-[#FBFAF6] p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#8A7A56]">Search Details</p>
          {chosenMethod.fields.map((field) => (
            <div key={field.key}>
              <label htmlFor={`field-${field.key}`} className="mb-1 block text-xs font-semibold text-[#5C5340]">
                {field.label}
              </label>
              {field.type === 'select' ? (
                <select
                  id={`field-${field.key}`}
                  value={fieldValues[field.key] ?? ''}
                  onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  className="w-full rounded-lg border border-[#E7DFC9] bg-white px-3 py-2 text-sm text-[#241E17] focus:border-[#8A6D2F] focus:outline-none"
                >
                  <option value="">Select {field.label}</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`field-${field.key}`}
                  type="text"
                  value={fieldValues[field.key] ?? ''}
                  onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                  className="w-full rounded-lg border border-[#E7DFC9] bg-white px-3 py-2 text-sm text-[#241E17] focus:border-[#8A6D2F] focus:outline-none"
                />
              )}
              {field.helpText && <p className="mt-1 text-[10px] text-[#B0A588]">{field.helpText}</p>}
            </div>
          ))}
          <button
            type="button"
            disabled={chosenMethod.fields.some((f) => !(fieldValues[f.key] ?? '').trim())}
            onClick={() => setSubmitted(true)}
            className="w-full rounded-lg bg-[#8A6D2F] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#6F5624] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      )}

      {submitted && chosenMethod && (
        <div className="space-y-3 rounded-xl border border-[#E7DFC9] bg-[#FBFAF6] p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#8A7A56]">Ready to verify</p>
          <dl className="space-y-1 text-xs text-[#5C5340]">
            {chosenMethod.fields.map((field) => (
              <div key={field.key} className="flex justify-between gap-3">
                <dt className="text-[#8A7A56]">{field.label}</dt>
                <dd className="font-semibold text-[#241E17]">{fieldValues[field.key]}</dd>
              </div>
            ))}
          </dl>
          <Link
            href="/dashboard/matters"
            className="block w-full rounded-lg bg-[#8A6D2F] px-4 py-2.5 text-center text-sm font-bold text-white transition-colors hover:bg-[#6F5624]"
          >
            Continue to Matter Register
          </Link>
        </div>
      )}
    </div>
  );
}

function SelectStep({
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
