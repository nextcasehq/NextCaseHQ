'use client';

import React from 'react';
import type { EngineAnswers, EngineSchema } from '@/lib/interview-engine/types';
import { isFieldVisible } from '@/lib/interview-engine/visibility';
import type { IncompletePage } from '@/lib/interview-engine/useInterviewEngine';
import { FadeTransition } from './Transition';

interface Props {
  schema: EngineSchema;
  answers: EngineAnswers;
  canGenerate: boolean;
  incompletePages: IncompletePage[];
  onEditPage: (index: number) => void;
  onSubmit: () => void;
  submitLabel: string;
  /** Optional, engine-agnostic extension point: the legal composition
   *  layer (GuidedInterview.tsx) can inject a live rendering of the
   *  document-in-progress here, using the same fillTemplatePlaceholders
   *  pipeline that runs for real on submit. This component never touches
   *  HTML/templates itself — it only renders whatever node it's handed. */
  preview?: React.ReactNode;
}

/**
 * The interview's confidence screen — not a question/answer recap. Its
 * job is to answer three things before the lawyer commits: is this
 * actually complete, what (if anything) still needs attention, and can I
 * trust what's about to be generated. `canGenerate`/`incompletePages` come
 * from the exact same validateSchema/validatePage the per-page "Next"
 * gating uses — there is no second, review-screen-specific notion of
 * "done."
 */
export function InterviewReview({ schema, answers, canGenerate, incompletePages, onEditPage, onSubmit, submitLabel, preview }: Props) {
  return (
    <div className="space-y-6">
      {/* Keyed on canGenerate so the cross-fade fires at the exact
          moment completeness flips — the one place motion has to
          answer "what changed" in its most literal sense: you just
          became done, or you just stopped being done. */}
      <FadeTransition key={String(canGenerate)}>
        {canGenerate ? (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
            <p className="text-sm font-bold text-emerald-800">This looks complete.</p>
            <p className="text-xs text-emerald-700 mt-1">Every required answer has been given — nothing is missing.</p>
          </div>
        ) : (
          <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 space-y-2">
            <p className="text-sm font-bold text-red-800">
              {incompletePages.length} {incompletePages.length === 1 ? 'section needs' : 'sections need'} attention before this can be generated.
            </p>
            <ul className="space-y-1">
              {incompletePages.map((p) => (
                <li key={p.index}>
                  <button
                    type="button"
                    onClick={() => onEditPage(p.index)}
                    className="text-xs font-semibold text-red-700 underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1"
                  >
                    Fix {p.title} ({p.errorCount} {p.errorCount === 1 ? 'issue' : 'issues'})
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </FadeTransition>

      {preview}

      {/* Closed by default, native <details> — not a custom accordion,
          free keyboard/screen-reader disclosure semantics. The live
          preview above already answers "does this look right"; this raw
          per-field recap is now reference material, not the main event,
          so it no longer sits between the preview and the Generate button
          consuming a long scroll of now-redundant detail. */}
      <details className="group">
        <summary className="inline-block px-2 py-1 -mx-2 -my-1 text-xs font-semibold text-[#8A7A56] cursor-pointer select-none rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] focus-visible:ring-offset-1">
          Show full answer detail
        </summary>
        <div className="space-y-6 mt-4">
          {schema.pages.map((page, pageIndex) => (
            <div key={page.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wide text-[#8A7A56]">{page.title}</h4>
                <button
                  type="button"
                  onClick={() => onEditPage(pageIndex)}
                  className="text-xs font-semibold text-[#8A6D2F] hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] focus-visible:ring-offset-1"
                >
                  Edit
                </button>
              </div>
              <dl className="space-y-1 text-sm">
                {page.fields
                  .filter((field) => isFieldVisible(field, answers))
                  .map((field) => (
                    <div key={field.name} className="flex justify-between gap-4">
                      <dt className="text-[#8A7A56]">{field.title}</dt>
                      <dd className="text-right font-medium">
                        {field.type === 'group'
                          ? `${((answers[field.name] as unknown[] | undefined) ?? []).length} ${field.itemLabel.toLowerCase()}(s)`
                          : String(answers[field.name] ?? '—')}
                      </dd>
                    </div>
                  ))}
              </dl>
            </div>
          ))}
        </div>
      </details>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canGenerate}
        aria-disabled={!canGenerate}
        className="w-full px-4 py-2 bg-[#8A6D2F] text-white text-sm font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2"
      >
        {canGenerate ? submitLabel : 'Resolve the issues above to continue'}
      </button>
    </div>
  );
}
