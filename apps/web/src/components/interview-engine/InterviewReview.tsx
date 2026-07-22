'use client';

import React from 'react';
import type { EngineAnswers, EngineSchema } from '@/lib/interview-engine/types';
import { isFieldVisible } from '@/lib/interview-engine/visibility';

interface Props {
  schema: EngineSchema;
  answers: EngineAnswers;
  onEditPage: (index: number) => void;
  onSubmit: () => void;
  submitLabel: string;
}

/**
 * Placeholder review screen for this checkpoint only — a plain per-page
 * question/answer recap, functionally equivalent to the old SurveyJS
 * "showAllQuestions" preview it replaces. This is explicitly NOT the
 * NextCaseHQ-designed "first draft preview" the plan calls for — that is
 * Checkpoint 7's own deliverable, once navigation/fields/groups/
 * conditionals are all proven first.
 */
export function InterviewReview({ schema, answers, onEditPage, onSubmit, submitLabel }: Props) {
  return (
    <div className="space-y-6">
      {schema.pages.map((page, pageIndex) => (
        <div key={page.name} className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold">{page.title}</h4>
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
      <button
        type="button"
        onClick={onSubmit}
        className="w-full px-4 py-2 bg-[#8A6D2F] text-white text-sm font-bold rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] focus-visible:ring-offset-2"
      >
        {submitLabel}
      </button>
    </div>
  );
}
