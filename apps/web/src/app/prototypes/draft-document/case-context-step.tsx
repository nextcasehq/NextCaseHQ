'use client';

import React, { useState } from 'react';
import { DOCUMENT_TYPE_OPTIONS, ADVOCATE_CAPACITY_OPTIONS } from './templates-data';
import {
  type CaseContext,
  type EntryChoice,
  REQUIRED_CONTEXT_FIELDS,
  countCompletedRequiredFields,
} from './types';

interface CaseContextStepProps {
  entryChoice: EntryChoice;
  context: CaseContext;
  onChange: (context: CaseContext) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function CaseContextStep({ entryChoice, context, onChange, onBack, onContinue }: CaseContextStepProps) {
  const [showMore, setShowMore] = useState(false);

  const set = <K extends keyof CaseContext>(key: K, value: CaseContext[K]) => {
    onChange({ ...context, [key]: value });
  };

  const completedCount = countCompletedRequiredFields(context);
  const continueLabel = entryChoice === 'upload-existing' ? 'Continue to Upload' : 'Continue to Drafting';

  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-2xl bg-white border border-[#E7DFC9]/80 rounded-2xl p-6 md:p-8 space-y-5">
        <div>
          <button onClick={onBack} className="text-[10px] font-bold uppercase tracking-widest text-[#B0A588] hover:text-[#8A6D2F]">
            ← Back
          </button>
          <h2 className="text-lg font-black uppercase tracking-widest text-[#111111] mt-2">Minimum Case Context</h2>
          <p className="text-xs text-[#8A7A56] mt-1">
            Just enough to get started — you can add more detail later, and manual drafting stays available even if this is incomplete.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Document Type *</label>
            <select
              value={context.documentType}
              onChange={(e) => set('documentType', e.target.value)}
              className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
            >
              <option value="">Select document type...</option>
              {DOCUMENT_TYPE_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Court or Recipient *</label>
            <input
              type="text"
              value={context.court}
              onChange={(e) => set('court', e.target.value)}
              placeholder="e.g. High Court of Karnataka"
              className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Represented Party *</label>
            <input
              type="text"
              value={context.representedParty}
              onChange={(e) => set('representedParty', e.target.value)}
              placeholder="Who you represent"
              className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Opposing Party *</label>
            <input
              type="text"
              value={context.opposingParty}
              onChange={(e) => set('opposingParty', e.target.value)}
              placeholder="The other side"
              className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
            />
          </div>
        </div>

        <p className="text-[10px] font-bold uppercase tracking-widest text-[#B0A588]">
          Case context: {completedCount} of {REQUIRED_CONTEXT_FIELDS.length} required details completed
        </p>

        <button
          onClick={() => setShowMore((v) => !v)}
          className="text-xs font-bold text-[#8A6D2F] hover:text-[#6F5624]"
        >
          {showMore ? '− Hide additional details' : '+ Add more case details'}
        </button>

        {showMore && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#F4EEE0]">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Advocate Capacity</label>
              <select
                value={context.advocateCapacity}
                onChange={(e) => set('advocateCapacity', e.target.value)}
                className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
              >
                <option value="">Whom do you represent...</option>
                {ADVOCATE_CAPACITY_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Jurisdiction</label>
              <input
                type="text"
                value={context.jurisdiction}
                onChange={(e) => set('jurisdiction', e.target.value)}
                className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Case Category</label>
              <input
                type="text"
                value={context.caseCategory}
                onChange={(e) => set('caseCategory', e.target.value)}
                placeholder="e.g. Partition Suit"
                className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Case Number</label>
                <input
                  type="text"
                  value={context.caseNumber}
                  onChange={(e) => set('caseNumber', e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Year</label>
                <input
                  type="text"
                  value={context.caseYear}
                  onChange={(e) => set('caseYear', e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Short Gist</label>
              <textarea
                value={context.gist}
                onChange={(e) => set('gist', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Relief or Objective</label>
              <input
                type="text"
                value={context.relief}
                onChange={(e) => set('relief', e.target.value)}
                className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Applicable Provisions</label>
              <input
                type="text"
                value={context.provisions}
                onChange={(e) => set('provisions', e.target.value)}
                placeholder="Where relevant"
                className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
              />
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onContinue}
            className="px-5 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-bold text-[10px] uppercase tracking-widest rounded-lg shadow transition-all"
          >
            {continueLabel} →
          </button>
        </div>
      </div>
    </div>
  );
}
