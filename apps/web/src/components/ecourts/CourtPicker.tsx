'use client';

import React from 'react';
import { COURT_SYSTEMS } from '@/lib/ecourts-registry/registry';
import type { StepConfig } from '@/lib/ecourts-registry/types';
import { resolveOptions, CompletedStepChip, SelectStep } from './step-widgets';
import { composeCourtName } from './compose-court-name';

const AVAILABLE_COURT_SYSTEMS = COURT_SYSTEMS.filter((cs) => cs.status === 'available');

/**
 * "Can't find your court?" — lands in a review queue (CourtDataReport),
 * never an automatic registry edit. Shown whenever the active step has
 * degraded to free-text (the exact moment an advocate discovers their
 * court isn't listed), pre-filled with whatever geography was already
 * selected.
 */
function ReportMissingCourt({
  courtSystemId,
  selections,
}: {
  courtSystemId: string;
  selections: Record<string, string>;
}) {
  const [open, setOpen] = React.useState(false);
  const [courtName, setCourtName] = React.useState('');
  const [comments, setComments] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  async function submit() {
    if (!courtName.trim()) return;
    const res = await fetch('/api/court-data-reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        court_system_id: courtSystemId,
        state: selections.state ?? null,
        district: selections.district ?? null,
        court_establishment: courtName.trim(),
        court_name: courtName.trim(),
        comments: comments.trim() || undefined,
      }),
    });
    if (res.ok) setSubmitted(true);
  }

  if (submitted) {
    return <p className="text-xs font-semibold text-[#6F5624]">Thanks — this has been sent for review.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[10px] font-bold uppercase tracking-wider text-[#B0A588] hover:text-[#8A6D2F]"
      >
        Can&rsquo;t find your court? Report it →
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-[#E7DFC9] bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">
        Report a missing or incorrect court
      </p>
      <input
        type="text"
        value={courtName}
        onChange={(e) => setCourtName(e.target.value)}
        placeholder="Court / establishment name"
        className="w-full rounded-lg border border-[#E7DFC9] bg-[#FBFAF6] px-3 py-2 text-sm font-medium text-[#241E17] focus:border-[#8A6D2F] focus:outline-none"
      />
      <textarea
        value={comments}
        onChange={(e) => setComments(e.target.value)}
        placeholder="Optional comments (e.g. address, court type)"
        rows={2}
        className="w-full rounded-lg border border-[#E7DFC9] bg-[#FBFAF6] px-3 py-2 text-sm font-medium text-[#241E17] focus:border-[#8A6D2F] focus:outline-none"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#B0A588] hover:text-[#8A6D2F]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!courtName.trim()}
          onClick={submit}
          className="rounded-lg bg-[#8A6D2F] px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#6F5624] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Submit
        </button>
      </div>
    </div>
  );
}

/**
 * A compact, reusable "find the court" picker for any form that just
 * needs a court/forum name string (Matter creation, Add Proceeding) —
 * not a full eCourts Case Status search like CourtStatusWizard. Walks
 * the same registry configs' geography/jurisdiction steps (skipping the
 * Search Method step, which only makes sense for an actual case lookup),
 * then hands the caller one composed court name. An advocate can always
 * fall back to typing the court name directly instead — this never
 * blocks entry for a court/forum the registry doesn't cover yet.
 */
export function CourtPicker({
  onSelect,
  onCancel,
}: {
  onSelect: (courtName: string) => void;
  onCancel?: () => void;
}) {
  const [courtSystemId, setCourtSystemId] = React.useState(AVAILABLE_COURT_SYSTEMS[0]?.id ?? '');
  const [selections, setSelections] = React.useState<Record<string, string>>({});

  const activeConfig = AVAILABLE_COURT_SYSTEMS.find((cs) => cs.id === courtSystemId);
  const geographySteps = (activeConfig?.steps ?? []).filter(
    (s): s is Extract<StepConfig, { kind: 'select' }> => s.kind === 'select'
  );

  function switchCourtSystem(id: string) {
    setCourtSystemId(id);
    setSelections({});
  }

  function resetFromStep(stepKey: string) {
    const idx = geographySteps.findIndex((s) => s.key === stepKey);
    const keysFromHere = geographySteps.slice(idx).map((s) => s.key);
    setSelections((prev) => {
      const next = { ...prev };
      for (const k of keysFromHere) delete next[k];
      return next;
    });
  }

  const completed: Extract<StepConfig, { kind: 'select' }>[] = [];
  let activeStep: Extract<StepConfig, { kind: 'select' }> | undefined;
  for (const step of geographySteps) {
    if (selections[step.key]) completed.push(step);
    else {
      activeStep = step;
      break;
    }
  }
  const allComplete = !activeStep && geographySteps.length > 0;
  const composedName = allComplete ? composeCourtName(courtSystemId, selections) : '';

  if (AVAILABLE_COURT_SYSTEMS.length === 0) return null;

  return (
    <div className="space-y-3 rounded-xl border border-[#E7DFC9] bg-[#FBFAF6] p-4">
      {AVAILABLE_COURT_SYSTEMS.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {AVAILABLE_COURT_SYSTEMS.map((cs) => (
            <button
              key={cs.id}
              type="button"
              onClick={() => switchCourtSystem(cs.id)}
              className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
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

      <div className="flex flex-wrap gap-1.5">
        {completed.map((step) => (
          <CompletedStepChip
            key={step.key}
            label={step.label.replace(/^Select /, '')}
            value={selections[step.key]}
            onReset={() => resetFromStep(step.key)}
          />
        ))}
      </div>

      {activeStep && (
        <SelectStep
          step={activeStep}
          resolvedOptions={resolveOptions(activeStep, selections)}
          onChoose={(value) => setSelections((prev) => ({ ...prev, [activeStep.key]: value }))}
        />
      )}

      {allComplete && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E7DFC9] bg-white p-3">
          <p className="text-sm font-semibold text-[#241E17]">{composedName}</p>
          <button
            type="button"
            onClick={() => onSelect(composedName)}
            className="shrink-0 rounded-lg bg-[#8A6D2F] px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#6F5624]"
          >
            Use this court
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[10px] font-bold uppercase tracking-wider text-[#B0A588] hover:text-[#8A6D2F]"
          >
            Type it manually instead
          </button>
        )}
        <ReportMissingCourt courtSystemId={courtSystemId} selections={selections} />
      </div>
    </div>
  );
}
