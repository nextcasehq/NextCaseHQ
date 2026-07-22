'use client';

import React from 'react';
import type { EngineAnswers, EngineSchema } from '@/lib/interview-engine/types';
import { useInterviewEngine } from '@/lib/interview-engine/useInterviewEngine';
import { InterviewHeader } from './InterviewHeader';
import { InterviewProgress } from './InterviewProgress';
import { InterviewPage } from './InterviewPage';
import { InterviewReview } from './InterviewReview';

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
}

/**
 * NextCaseHQ Interview Engine — composition root. This component and
 * everything it renders must never import, reference, or contain a
 * string constant naming any specific document type, court, or legal
 * concept. If a future interview needs a concept this component doesn't
 * support, the fix belongs in lib/interview-engine/types.ts (a new field
 * type) or the schema (more pages/fields) — never a special case here.
 */
export function InterviewEngine({ schema, title, persistenceKey, submitLabel = 'Continue', onCancel, onComplete }: InterviewEngineProps) {
  const engine = useInterviewEngine(schema, persistenceKey);

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
        {engine.mode === 'review' ? (
          <InterviewReview schema={schema} answers={engine.answers} onEditPage={engine.goToPage} onSubmit={() => onComplete(engine.answers)} submitLabel={submitLabel} />
        ) : (
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
        )}
      </div>
    </div>
  );
}
