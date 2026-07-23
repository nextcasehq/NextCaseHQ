'use client';

import React from 'react';
import { TemplateLibrary } from './TemplateLibrary';
import type { LegalTemplate } from '@/lib/documents/editor/templates';

interface DocumentChooserProps {
  onSelectTemplate: (template: LegalTemplate) => void;
  onStartBlank: () => void;
}

/**
 * The Document Creator's actual first screen — not the editor. An advocate's
 * first task is deciding what to prepare, not formatting text, so this is
 * the whole page until that choice is made: no ribbon, no page-shaped
 * canvas, no sidebars, nothing that only makes sense once a document
 * exists. The shared dashboard top bar (logo, notifications, profile)
 * still renders above this — that's app/dashboard/layout.tsx, not this
 * component — everything below it is this one decision.
 */
export function DocumentChooser({ onSelectTemplate, onStartBlank }: DocumentChooserProps) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#FDFBF7]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 py-10 md:py-16">
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-xl md:text-2xl font-black text-[#111111]">What would you like to prepare?</h1>
          <p className="text-sm text-[#8A7A56] mt-2">Choose a document to begin, or start with a blank page.</p>
        </div>
        <TemplateLibrary
          selectedTemplateId={null}
          isBlankSelected={false}
          onSelectTemplate={onSelectTemplate}
          onStartBlank={onStartBlank}
          layout="grid"
        />
      </div>
    </div>
  );
}
