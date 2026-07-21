'use client';

import React, { useState } from 'react';
import { EXISTING_MATTER_OPTIONS } from './templates-data';
import type { MatterRegisterInfo } from './types';

interface SummaryField {
  label: string;
  value: string;
}

interface ConfirmIdentityStepProps {
  suggestedMatterName: string;
  summaryFields: SummaryField[];
  onBack: () => void;
  onConfirm: (register: MatterRegisterInfo) => void;
}

export default function ConfirmIdentityStep({ suggestedMatterName, summaryFields, onBack, onConfirm }: ConfirmIdentityStepProps) {
  const [matterTab, setMatterTab] = useState<'new' | 'link'>('new');
  const [matterName, setMatterName] = useState(suggestedMatterName);
  const [matterNumber, setMatterNumber] = useState('');
  const [linkedMatterId, setLinkedMatterId] = useState('');

  const canSubmit = matterTab === 'new' ? matterName.trim() !== '' : linkedMatterId !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (matterTab === 'new') {
      if (!matterName.trim()) return;
      onConfirm({ mode: 'new', name: matterName.trim(), number: matterNumber.trim() || undefined });
    } else {
      const existing = EXISTING_MATTER_OPTIONS.find((m) => m.id === linkedMatterId);
      if (!existing) return;
      onConfirm({ mode: 'link', name: existing.label });
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-2xl bg-white border border-[#E7DFC9]/80 rounded-2xl p-6 md:p-8 space-y-5">
        <div>
          <button onClick={onBack} className="text-[10px] font-bold uppercase tracking-widest text-[#B0A588] hover:text-[#8A6D2F]">
            ← Back
          </button>
          <h2 className="text-lg font-black uppercase tracking-widest text-[#111111] mt-2">Confirm Matter Identity</h2>
          <p className="text-xs text-[#8A7A56] mt-1">
            Review these details before an authoritative Matter Register is created — nothing here has been inferred without your input.
          </p>
        </div>

        <div className="bg-[#FBF8F1] border border-[#E7DFC9] rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {summaryFields.map((field) => (
            <div key={field.label}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#B0A588]">{field.label}</p>
              <p className="text-xs font-semibold text-[#3A3222] mt-0.5">{field.value || 'Not yet provided'}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex border-b border-[#111111]/10">
            <button
              type="button"
              onClick={() => setMatterTab('new')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                matterTab === 'new' ? 'border-[#8A6D2F] text-[#8A6D2F]' : 'border-transparent text-[#B0A588] hover:text-[#5C5340]'
              }`}
            >
              Create New Register
            </button>
            <button
              type="button"
              onClick={() => setMatterTab('link')}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                matterTab === 'link' ? 'border-[#8A6D2F] text-[#8A6D2F]' : 'border-transparent text-[#B0A588] hover:text-[#5C5340]'
              }`}
            >
              Link Existing Matter
            </button>
          </div>

          {matterTab === 'new' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Matter Title *</label>
                <input
                  type="text"
                  required
                  value={matterName}
                  onChange={(e) => setMatterName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Internal Matter Number</label>
                <input
                  type="text"
                  value={matterNumber}
                  onChange={(e) => setMatterNumber(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Existing Matter</label>
              <select
                value={linkedMatterId}
                onChange={(e) => setLinkedMatterId(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium text-[#3A3222]"
              >
                <option value="">Select a matter...</option>
                {EXISTING_MATTER_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-bold text-[10px] uppercase tracking-widest rounded-lg shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {matterTab === 'new' ? 'Create Matter Register' : 'Link Matter Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
