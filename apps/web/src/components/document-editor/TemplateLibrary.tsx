'use client';

import React from 'react';
import { LEGAL_TEMPLATES, type LegalTemplate } from '@/lib/documents/editor/templates';

interface TemplateLibraryProps {
  selectedTemplateId: string | null;
  onSelectTemplate: (template: LegalTemplate) => void;
  onStartBlank: () => void;
  /** The caller already renders its own "Create Manually" action. */
  hideBlankAction?: boolean;
}

export function TemplateLibrary({ selectedTemplateId, onSelectTemplate, onStartBlank, hideBlankAction }: TemplateLibraryProps) {
  return (
    <div className="space-y-2" aria-label="Template library">
      {LEGAL_TEMPLATES.map((template) => (
        <button
          key={template.id}
          type="button"
          onClick={() => onSelectTemplate(template)}
          aria-pressed={selectedTemplateId === template.id}
          className={`w-full text-left p-3 rounded-lg border transition-all ${
            selectedTemplateId === template.id
              ? 'bg-[#111111] border-[#111111] text-[#FDFBF7]'
              : 'bg-white border-[#E7DFC9] text-[#3A3222] hover:border-[#8A6D2F]'
          }`}
        >
          <span
            className={`block text-[9px] font-bold uppercase tracking-wider mb-1 ${
              selectedTemplateId === template.id ? 'text-[#FDFBF7]/60' : 'text-[#B0A588]'
            }`}
          >
            {template.jurisdiction} · {template.category}
          </span>
          <span className="block text-xs font-bold">{template.name}</span>
        </button>
      ))}
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
