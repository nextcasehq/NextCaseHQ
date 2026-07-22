'use client';

import React from 'react';
import Link from 'next/link';
import { COURT_SYSTEMS, getCourtSystem } from '@/lib/ecourts-registry/registry';
import type { SearchMethodStepConfig, StepConfig } from '@/lib/ecourts-registry/types';

function resolveOptions(
  step: Extract<StepConfig, { kind: 'select' }>,
  selections: Record<string, string>
): string[] | 'free-text' {
  return typeof step.options === 'function' ? step.options(selections) : step.options;
}

function isStepComplete(step: StepConfig, selections: Record<string, string>, searchMethodKey: string): boolean {
  if (step.kind === 'select') return Boolean(selections[step.key]);
  return Boolean(searchMethodKey);
}

/** Small pill summarizing a completed step, e.g. "State: Kerala ✕". Click
 * to jump back — clears this step and every step after it, matching the
 * official eCourts pattern of re-narrowing a prior selection. */
function CompletedStepChip({ label, value, onReset }: { label: string; value: string; onReset: () => void }) {
  return (
    <button
      type="button"
      onClick={onReset}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#E7DFC9] bg-[#FBF8F1] px-3 py-1.5 text-xs font-semibold text-[#3A3222] transition-colors hover:border-[#C6A253] hover:bg-white"
    >
      <span className="text-[#8A7A56]">{label}:</span> {value}
      <span aria-hidden="true" className="text-[#B0A588]">✕</span>
    </button>
  );
}

/**
 * Registry-driven eCourts Case Status wizard. Reads exactly one court
 * system's `steps` array and renders whichever generic step widget
 * matches each step's `kind` — no per-court branching lives here. Adding
 * a future court system means writing one new config
 * (lib/ecourts-registry/configs/) and registering it; this component
 * never changes.
 */
export default function CourtStatusWizard() {
  const [courtId, setCourtId] = React.useState('');
  const [selections, setSelections] = React.useState<Record<string, string>>({});
  const [searchMethodKey, setSearchMethodKey] = React.useState('');
  const [fieldValues, setFieldValues] = React.useState<Record<string, string>>({});
  const [submitted, setSubmitted] = React.useState(false);

  const court = courtId ? getCourtSystem(courtId) : undefined;

  function resetCourt(nextCourtId: string) {
    setCourtId(nextCourtId);
    setSelections({});
    setSearchMethodKey('');
    setFieldValues({});
    setSubmitted(false);
  }

  function resetFromStep(stepKey: string, steps: StepConfig[]) {
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

  if (!court) {
    return (
      <div className="space-y-2">
        <label htmlFor="court-system-select" className="block text-xs font-bold uppercase tracking-wider text-[#8A7A56]">
          Court System
        </label>
        <select
          id="court-system-select"
          value=""
          onChange={(e) => resetCourt(e.target.value)}
          className="w-full rounded-xl border border-[#E7DFC9] bg-[#FBFAF6] px-4 py-3 text-sm font-medium text-[#241E17] focus:border-[#8A6D2F] focus:outline-none"
        >
          <option value="" disabled>
            Select Court
          </option>
          {COURT_SYSTEMS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const courtChip = (
    <div className="flex flex-wrap items-center gap-2">
      <CompletedStepChip label="Court System" value={court.label} onReset={() => resetCourt('')} />
    </div>
  );

  if (court.status === 'coming-soon') {
    return (
      <div className="space-y-4">
        {courtChip}
        <div className="rounded-xl border border-[#E7DFC9] bg-[#FBF8F1] p-4 text-sm text-[#5C5340]">
          <p className="font-semibold text-[#241E17]">{court.label} isn&rsquo;t available here yet.</p>
          <p className="mt-1 text-xs text-[#8A7A56]">
            This court system doesn&rsquo;t yet have a verified, standardized self-service case-status search we can
            connect to honestly. Choose District Courts (eCourts) above, or check back later.
          </p>
        </div>
      </div>
    );
  }

  const steps = court.steps;
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

  function chipValueFor(step: StepConfig): string {
    if (step.kind === 'select') return selections[step.key] ?? '';
    return searchMethodStep?.methods.find((m) => m.key === searchMethodKey)?.label ?? '';
  }

  return (
    <div className="space-y-4">
      {courtChip}

      {completed.map((step) => (
        <CompletedStepChip
          key={step.key}
          label={step.label.replace(/^Select /, '')}
          value={chipValueFor(step)}
          onReset={() => resetFromStep(step.key, steps)}
        />
      ))}

      {activeStep && activeStep.kind === 'select' && (
        <SelectStep
          step={activeStep}
          resolvedOptions={resolveOptions(activeStep, selections)}
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
  resolvedOptions: string[] | 'free-text';
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
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
