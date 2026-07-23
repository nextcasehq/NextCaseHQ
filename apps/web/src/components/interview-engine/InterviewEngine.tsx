'use client';

import React from 'react';
import type { EngineAnswers, EngineSchema } from '@/lib/interview-engine/types';
import { useInterviewEngine } from '@/lib/interview-engine/useInterviewEngine';
import { InterviewHeader } from './InterviewHeader';
import { InterviewProgress } from './InterviewProgress';
import { InterviewPage } from './InterviewPage';
import { InterviewReview } from './InterviewReview';
import { FadeTransition, SlideTransition } from './Transition';

export interface InterviewEngineProps {
  schema: EngineSchema;
  title: string;
  /** Optional localStorage key for save/resume — an opaque string as far
   *  as the engine is concerned; it attaches no meaning to it. */
  persistenceKey?: string;
  submitLabel?: string;
  onCancel: () => void;
  /** The engine's entire output: a plain answers object. It never produces
   *  HTML and never knows what will be done with this value — that is the
   *  composition layer's job (see components/document-editor/
   *  GuidedInterview.tsx), never this component's. */
  onComplete: (answers: EngineAnswers) => void;
  /** Optional extension point for the confidence screen: called with the
   *  live answers on every render so the composition layer can inject a
   *  preview of whatever it will produce (a document, a summary, anything)
   *  without this component ever knowing what that content is. */
  renderPreview?: (answers: EngineAnswers) => React.ReactNode;
}

/**
 * NextCaseHQ Interview Engine — composition root. This component and
 * everything it renders must never import, reference, or contain a
 * string constant naming any specific document type, court, or legal
 * concept. If a future interview needs a concept this component doesn't
 * support, the fix belongs in lib/interview-engine/types.ts (a new field
 * type) or the schema (more pages/fields) — never a special case here.
 */
export function InterviewEngine({ schema, title, persistenceKey, submitLabel = 'Continue', onCancel, onComplete, renderPreview }: InterviewEngineProps) {
  const engine = useInterviewEngine(schema, persistenceKey);
  // Clicking Generate used to hand off instantly and silently — the
  // lawyer's action registered with no acknowledgment at all. A brief,
  // deliberate beat here answers "did that work" before the handoff
  // actually happens, the same completion-feedback gap flagged all the
  // way back when this was still SurveyJS.
  const [submitting, setSubmitting] = React.useState(false);

  // Which way the lawyer just moved — read before the effect below
  // updates the ref, so it reflects the transition that just happened,
  // not the one after it. Purely cosmetic (which side content slides in
  // from); never affects engine state.
  const prevPageIndexRef = React.useRef(engine.currentPageIndex);
  const direction: 'forward' | 'backward' = engine.currentPageIndex >= prevPageIndexRef.current ? 'forward' : 'backward';
  React.useEffect(() => {
    prevPageIndexRef.current = engine.currentPageIndex;
  }, [engine.currentPageIndex]);

  // Belt-and-suspenders: the Review screen's own button is already
  // `disabled` when `canGenerate` is false, but the actual call site that
  // would invoke generation re-checks the identical signal rather than
  // trusting the disabled attribute alone to be the only thing standing
  // between an incomplete interview and a generated draft.
  const handleSubmit = () => {
    if (!engine.canGenerate || submitting) return;
    setSubmitting(true);
    window.setTimeout(() => {
      try {
        onComplete(engine.answers);
      } catch (err) {
        // Today's actual caller (GuidedInterview.tsx) unmounts this
        // component synchronously inside onComplete, so this can't fire
        // in production today — but onComplete is a generic prop any
        // future caller can implement differently, and getting stuck on
        // "Generating your draft…" forever with no way back is worse
        // than surfacing the failure and letting the lawyer retry.
        setSubmitting(false);
        throw err;
      }
    }, 700);
  };

  return (
    <div className="h-full overflow-y-auto bg-[#FBF8F1]">
      <div className="sticky top-0 z-10 bg-white border-b border-[#E7DFC9] px-4 md:px-8 py-3 space-y-2">
        <InterviewHeader title={title} onCancel={onCancel} />
        <InterviewProgress
          pageTitles={schema.pages.map((p) => p.title)}
          currentPageIndex={engine.currentPageIndex}
          mode={engine.mode}
          onJumpToPage={engine.goToPage}
        />
      </div>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        {submitting ? (
          <div className="py-16 text-center space-y-3" role="status">
            <div className="mx-auto h-8 w-8 rounded-full border-2 border-[#8A6D2F] border-t-transparent animate-spin" aria-hidden="true" />
            <p className="text-sm font-semibold text-[#3A3222]">Generating your draft…</p>
          </div>
        ) : (
          // Keyed on `mode` — a fill/review switch is a bigger kind of
          // change than moving between two ordinary pages, so it gets the
          // plain cross-fade rather than the directional slide below,
          // deliberately reading as a different category of transition.
          <FadeTransition key={engine.mode}>
            {engine.mode === 'review' ? (
              <InterviewReview
                schema={schema}
                answers={engine.answers}
                canGenerate={engine.canGenerate}
                incompletePages={engine.incompletePages}
                onEditPage={engine.goToPage}
                onSubmit={handleSubmit}
                submitLabel={submitLabel}
                preview={renderPreview?.(engine.answers)}
              />
            ) : (
              // Keyed on the page index — remounts (and re-triggers the
              // slide) on every Next/Back/chip-jump, sliding in from the
              // direction just travelled.
              <SlideTransition key={engine.currentPageIndex} direction={direction}>
                <div className="space-y-6">
                  <InterviewPage
                    page={engine.currentPage}
                    answers={engine.answers}
                    errors={engine.errors}
                    setFieldValue={engine.setFieldValue}
                    addGroupItem={engine.addGroupItem}
                    removeGroupItem={engine.removeGroupItem}
                    setGroupItemValue={engine.setGroupItemValue}
                  />
                  <div className="flex items-center justify-between pt-4 border-t border-[#F4EEE0]">
                    <button
                      type="button"
                      onClick={engine.goPrevious}
                      disabled={engine.currentPageIndex === 0}
                      className="text-xs font-bold uppercase tracking-widest text-[#8A7A56] disabled:opacity-40 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] focus-visible:ring-offset-1"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={engine.goNext}
                      className="px-4 py-2 bg-[#8A6D2F] text-white text-xs font-bold uppercase tracking-widest rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2"
                    >
                      {engine.currentPageIndex === engine.pageCount - 1 ? 'Review' : 'Next'}
                    </button>
                  </div>
                </div>
              </SlideTransition>
            )}
          </FadeTransition>
        )}
      </div>
    </div>
  );
}
