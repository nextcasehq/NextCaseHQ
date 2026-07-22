'use client';

import React from 'react';
import { LEGAL_TEMPLATES, type LegalTemplate } from '@/lib/documents/editor/templates';
import { getInterviewConfigForTemplate } from '@/lib/documents/survey/registry';

interface TemplateLibraryProps {
  selectedTemplateId: string | null;
  onSelectTemplate: (template: LegalTemplate) => void;
  onStartBlank: () => void;
  isBlankSelected: boolean;
  /** 'stack' (default) is the compact single-column list used inside the
      editing sidebar. 'grid' is the larger, multi-column layout used by
      the initial document-choosing screen, where there's room to show
      every option at a glance without scrolling. */
  layout?: 'stack' | 'grid';
}

function DocumentCard({
  selected,
  onSelect,
  title,
  subtitle,
  badges,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  subtitle: string;
  badges?: React.ReactNode;
}) {
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
        <span className="block text-xs font-bold leading-snug">{title}</span>
        <span className={`block text-[10px] mt-0.5 ${selected ? 'text-[#FDFBF7]/70' : 'text-[#8A7A56]'}`}>{subtitle}</span>
      </div>
      {badges && <span className="flex items-center gap-1.5 mt-1.5 flex-wrap">{badges}</span>}
    </button>
  );
}

function Badge({
  selected,
  tone,
  title,
  children,
}: {
  selected: boolean;
  tone: 'neutral' | 'starter' | 'interview';
  title?: string;
  children: React.ReactNode;
}) {
  const toneClass = selected
    ? 'bg-white/15 text-[#FDFBF7]/80'
    : tone === 'starter'
      ? 'bg-[#FBF6EA] text-[#8A6D2F] border border-[#C6A253]/40'
      : tone === 'interview'
        ? 'bg-[#EAF2FB] text-[#1D4ED8] border border-[#1D4ED8]/30'
        : 'bg-[#F4EEE0] text-[#8A7A56]';
  return (
    <span title={title} className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${toneClass}`}>
      {children}
    </span>
  );
}

/**
 * A single flat gallery — Blank Document plus every starter template, all
 * the same size and in the same list, the way Google Docs' and Word's own
 * "new document" picker present a blank page alongside templates. This
 * used to be a five-Court-Vertical accordion (per the UI/UX Specification's
 * Appendix A taxonomy): with only a handful of starter templates so far,
 * three of the five groups showed nothing but "No starter templates yet
 * for this court" — a lawyer had to scan past that noise before reaching
 * the two groups that actually had anything. Court and Practice Area are
 * still shown on each card; the enclosing taxonomy can come back once
 * there are enough templates that a flat list stops being the fastest way
 * to scan them.
 */
export function TemplateLibrary({ selectedTemplateId, onSelectTemplate, onStartBlank, isBlankSelected, layout = 'stack' }: TemplateLibraryProps) {
  const containerClass = layout === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-2';
  return (
    <div className={containerClass} aria-label="Create a document">
      <DocumentCard selected={isBlankSelected} onSelect={onStartBlank} title="Blank Document" subtitle="Start with an empty page" />
      {LEGAL_TEMPLATES.map((template) => {
        const hasInterview = !!getInterviewConfigForTemplate(template.id);
        const selected = selectedTemplateId === template.id;
        return (
          <DocumentCard
            key={template.id}
            selected={selected}
            onSelect={() => onSelectTemplate(template)}
            title={template.name}
            subtitle={`${template.court} · ${template.practiceArea}`}
            badges={
              <>
                <Badge selected={selected} tone="neutral">
                  {template.version}
                </Badge>
                {template.isStarterTemplate && (
                  <Badge selected={selected} tone="starter">
                    Starter Template
                  </Badge>
                )}
                {hasInterview && (
                  <Badge selected={selected} tone="interview" title="Answers a short questionnaire to generate this draft">
                    Guided Interview
                  </Badge>
                )}
              </>
            }
          />
        );
      })}
    </div>
  );
}
