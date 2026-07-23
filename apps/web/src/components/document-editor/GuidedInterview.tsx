'use client';

import React from 'react';
import { InterviewEngine } from '@/components/interview-engine/InterviewEngine';
import { fillTemplatePlaceholders } from '@/lib/documents/interview/fill-template';
import type { InterviewConfig } from '@/lib/documents/interview/types';
import type { EngineAnswers } from '@/lib/interview-engine/types';

interface GuidedInterviewProps {
  config: InterviewConfig;
  templateHtml: string;
  onCancel: () => void;
  onGenerate: (html: string) => void;
}

/**
 * The Legal Interview configuration layer's own composition root — the
 * only place in the product allowed to know both "interview engine" and
 * "document generation" at once. Replaces SurveyWizard.tsx with an
 * identical 4-prop contract, so draft-builder/page.tsx's own call site
 * needs only an import/tag rename, nothing else.
 *
 * The generic InterviewEngine underneath never sees `templateHtml` and
 * never produces HTML — it only ever hands back a plain answers object
 * via onComplete. Turning those answers into HTML via
 * fillTemplatePlaceholders happens entirely here, per Rule 5 (the engine
 * must never know about HTML/templates/placeholders/legal drafting/AI/
 * document generation).
 */
export function GuidedInterview({ config, templateHtml, onCancel, onGenerate }: GuidedInterviewProps) {
  const handleComplete = (answers: EngineAnswers) => {
    onGenerate(fillTemplatePlaceholders(templateHtml, answers, config));
  };

  // The confidence screen's preview: literally the same
  // fillTemplatePlaceholders pipeline that runs for real on submit, run
  // early against whatever answers exist right now. Not a mockup and not
  // a second rendering path — if this preview looks right, the generated
  // draft looks right, because it's the same function.
  const renderPreview = (answers: EngineAnswers) => (
    <div className="rounded-lg border border-[#E7DFC9] bg-white p-4">
      <h4 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-2">Draft Preview</h4>
      <div
        className="prose prose-sm max-w-none text-[#3A3222]"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: fillTemplatePlaceholders(templateHtml, answers, config) }}
      />
    </div>
  );

  return (
    <InterviewEngine
      schema={config.schema}
      title={config.title}
      persistenceKey={`nchq:interview-state:${config.id}`}
      submitLabel="Generate Draft"
      onCancel={onCancel}
      onComplete={handleComplete}
      renderPreview={renderPreview}
    />
  );
}
