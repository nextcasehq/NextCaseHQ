'use client';

import React from 'react';
import { LEGAL_TEMPLATES, COURT_VERTICALS, type LegalTemplate, type CourtVertical } from '@/lib/documents/editor/templates';
import { getInterviewConfigForTemplate } from '@/lib/documents/survey/registry';

interface TemplateLibraryProps {
  selectedTemplateId: string | null;
  onSelectTemplate: (template: LegalTemplate) => void;
  onStartBlank: () => void;
  /** The caller already renders its own "Create Manually" action. */
  hideBlankAction?: boolean;
}

function TemplateCard({ template, selected, onSelect }: { template: LegalTemplate; selected: boolean; onSelect: () => void }) {
  const hasInterview = !!getInterviewConfigForTemplate(template.id);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full min-h-[10.5rem] flex flex-col justify-between text-left p-3 rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] ${
        selected ? 'bg-[#111111] border-[#111111] text-[#FDFBF7]' : 'bg-white border-[#E7DFC9] text-[#3A3222] hover:border-[#8A6D2F]'
      }`}
    >
      <div>
        <span className="block text-xs font-bold leading-snug">{template.name}</span>
        <span className={`block text-[10px] mt-0.5 ${selected ? 'text-[#FDFBF7]/70' : 'text-[#8A7A56]'}`}>
          {template.court} · {template.practiceArea}
        </span>
      </div>
      <span className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        <span
          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
            selected ? 'bg-white/15 text-[#FDFBF7]/80' : 'bg-[#F4EEE0] text-[#8A7A56]'
          }`}
        >
          {template.version}
        </span>
        {template.isStarterTemplate && (
          <span
            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              selected ? 'bg-white/15 text-[#FDFBF7]/80' : 'bg-[#FBF6EA] text-[#8A6D2F] border border-[#C6A253]/40'
            }`}
          >
            Starter Template
          </span>
        )}
        {hasInterview && (
          <span
            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              selected ? 'bg-white/15 text-[#FDFBF7]/80' : 'bg-[#EAF2FB] text-[#1D4ED8] border border-[#1D4ED8]/30'
            }`}
          >
            Guided Interview
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * Templates grouped by Court Vertical, per the UI/UX Specification's
 * Appendix A. Only the three genuine starter templates that exist today
 * are shown — verticals with none show an honest empty note rather than
 * a fabricated placeholder card.
 */
export function TemplateLibrary({ selectedTemplateId, onSelectTemplate, onStartBlank, hideBlankAction }: TemplateLibraryProps) {
  const templatesByVertical = React.useMemo(() => {
    const map = new Map<CourtVertical, LegalTemplate[]>();
    for (const vertical of COURT_VERTICALS) map.set(vertical.id, []);
    for (const template of LEGAL_TEMPLATES) map.get(template.courtVertical)?.push(template);
    return map;
  }, []);

  const [openVerticals, setOpenVerticals] = React.useState<Set<CourtVertical>>(
    () => new Set(COURT_VERTICALS.filter((v) => (templatesByVertical.get(v.id)?.length ?? 0) > 0).map((v) => v.id))
  );

  const toggleVertical = (id: CourtVertical) => {
    setOpenVerticals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-2" aria-label="Template library">
      {COURT_VERTICALS.map((vertical) => {
        const templates = templatesByVertical.get(vertical.id) ?? [];
        const isOpen = openVerticals.has(vertical.id);
        return (
          <div key={vertical.id} className="border border-[#E7DFC9] rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleVertical(vertical.id)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between px-3 py-2 bg-[#FBF8F1] text-xs font-bold text-[#3A3222] hover:bg-[#F4EEE0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F]"
            >
              <span>{vertical.label}</span>
              <span className="flex items-center gap-2">
                <span className="text-[9px] font-semibold text-[#B0A588]">{templates.length}</span>
                <span className="text-[#B0A588]">{isOpen ? '▾' : '▸'}</span>
              </span>
            </button>
            {isOpen && (
              <div className="p-2 space-y-2 bg-white">
                {templates.length > 0 ? (
                  templates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      selected={selectedTemplateId === template.id}
                      onSelect={() => onSelectTemplate(template)}
                    />
                  ))
                ) : (
                  <p className="text-[10px] text-[#B0A588] italic px-1 py-1">No starter templates yet for this court.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
      {!hideBlankAction && (
        <button
          type="button"
          onClick={onStartBlank}
          className="w-full py-2 border border-[#E7DFC9] text-[#8A6D2F] text-[10px] uppercase tracking-widest font-bold rounded-lg hover:bg-[#FBF8F1] transition-all"
        >
          Start Blank Draft
        </button>
      )}
    </div>
  );
}
