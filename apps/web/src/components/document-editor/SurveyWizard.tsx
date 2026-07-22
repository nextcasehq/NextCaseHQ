'use client';

import React from 'react';
import { Model } from 'survey-core';
import { Survey } from 'survey-react-ui';
import '@/styles/survey-core-no-webfonts.css';
import '@/styles/survey-nchq-theme.css';
import type { InterviewConfig } from '@/lib/documents/survey/types';
import { fillTemplatePlaceholders } from '@/lib/documents/survey/fill-template';

interface SurveyWizardProps {
  config: InterviewConfig;
  templateHtml: string;
  onCancel: () => void;
  onGenerate: (html: string) => void;
}

function stateKey(interviewId: string): string {
  return `nchq:survey-state:${interviewId}`;
}

/**
 * The Legal Interview Engine's wizard — a single, schema-driven component
 * shared by every guided interview regardless of court vertical or
 * document type. Nothing here is specific to the Writ Petition reference
 * interview; a future interview supplies its own `InterviewConfig` and
 * gets the same step-based wizard, progress indicator, validation,
 * conditional branching, repeatable sections, review step, and
 * save/resume behaviour for free.
 */
export function SurveyWizard({ config, templateHtml, onCancel, onGenerate }: SurveyWizardProps) {
  const survey = React.useMemo(() => {
    const model = new Model(config.surveyJson);
    try {
      const saved = window.localStorage.getItem(stateKey(config.id));
      if (saved) model.data = JSON.parse(saved);
    } catch {
      // Corrupt or inaccessible localStorage — start the interview fresh
      // rather than failing to open it at all.
    }
    return model;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  React.useEffect(() => {
    const persist = () => {
      try {
        window.localStorage.setItem(stateKey(config.id), JSON.stringify(survey.data));
      } catch {
        // Best-effort save/resume only — never blocks the interview itself.
      }
    };
    survey.onValueChanged.add(persist);
    survey.onCurrentPageChanged.add(persist);

    const handleComplete = (sender: Model) => {
      const html = fillTemplatePlaceholders(templateHtml, sender.data, config);
      try {
        window.localStorage.removeItem(stateKey(config.id));
      } catch {
        // Not critical — a stale saved answer set is harmless since a
        // completed interview is never resumed again.
      }
      onGenerate(html);
    };
    survey.onComplete.add(handleComplete);

    return () => {
      survey.onValueChanged.remove(persist);
      survey.onCurrentPageChanged.remove(persist);
      survey.onComplete.remove(handleComplete);
    };
  }, [survey, config, templateHtml, onGenerate]);

  return (
    <div className="nchq-survey-wizard h-full overflow-y-auto bg-[#FBF8F1]">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-white border-b border-[#E7DFC9] px-4 md:px-8 py-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">Guided Interview</h2>
          <p className="text-sm font-bold text-[#111111]">{config.title}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 border border-[#E7DFC9] text-[#8A6D2F] text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-[#FBF8F1] transition-all"
        >
          Cancel
        </button>
      </div>
      <div className="max-w-3xl mx-auto p-4 md:p-8">
        <Survey model={survey} />
      </div>
    </div>
  );
}
