'use client';

import React from 'react';
import { getLegalSearchSources, updateSourceStatus, setSourceEnabled, getCitationGovernanceRules, type LegalSearchSource, type SourceStatus } from '@/lib/admin/legal-search-config';

const STATUS_OPTIONS: SourceStatus[] = ['Demonstration source', 'Unverified source', 'Verified official source', 'Disabled source', 'Integration pending'];

export default function AdminLegalSearchPage() {
  const [sources, setSources] = React.useState<LegalSearchSource[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const rules = getCitationGovernanceRules();

  React.useEffect(() => {
    setSources(getLegalSearchSources());
  }, []);

  function changeStatus(id: string, status: SourceStatus) {
    const result = updateSourceStatus(id, status, 'Platform Admin');
    if (!result.ok) {
      setError(result.reason || 'Unable to change status.');
      return;
    }
    setError(null);
    setSources(getLegalSearchSources());
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">Legal Search Configuration</h1>
        <p className="text-sm font-serif italic text-[#8A7A56]">Search results must preserve source provenance. Citations are never treated as factual evidence.</p>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700">{error}</div>}

      <div className="space-y-3">
        {sources.map((s) => (
          <div key={s.id} className="bg-white border border-[#111111]/10 rounded-lg p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-[#111111]">{s.name}</p>
              <select value={s.status} onChange={(e) => changeStatus(s.id, e.target.value as SourceStatus)} className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-[#E7DFC9] rounded bg-white">
                {STATUS_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
              <div><p className="font-bold uppercase text-[#8A7A56]">Source Type</p><p className="font-semibold text-[#3A3222]">{s.sourceType}</p></div>
              <div><p className="font-bold uppercase text-[#8A7A56]">Jurisdiction</p><p className="font-semibold text-[#3A3222]">{s.jurisdictionCoverage}</p></div>
              <div><p className="font-bold uppercase text-[#8A7A56]">Court Coverage</p><p className="font-semibold text-[#3A3222]">{s.courtCoverage}</p></div>
              <div><p className="font-bold uppercase text-[#8A7A56]">Document Types</p><p className="font-semibold text-[#3A3222]">{s.documentTypes.join(', ')}</p></div>
              <div><p className="font-bold uppercase text-[#8A7A56]">Citation Format</p><p className="font-semibold text-[#3A3222]">{s.citationFormat}</p></div>
              <div><p className="font-bold uppercase text-[#8A7A56]">Last Successful Check</p><p className="font-semibold text-[#3A3222]">{s.lastSuccessfulCheck ? new Date(s.lastSuccessfulCheck).toLocaleDateString('en-IN') : 'Never'}</p></div>
            </div>
            <p className="text-[10px] text-[#8A7A56] pt-2 border-t border-[#F4EEE0]">{s.internalNote}</p>
            <button
              onClick={() => { setSourceEnabled(s.id, !s.enabled, 'Platform Admin'); setSources(getLegalSearchSources()); }}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white"
            >
              {s.enabled ? 'Disable Source' : 'Enable Source'}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#111111]/10 rounded-lg p-5 space-y-2">
        <h2 className="text-xs font-black uppercase tracking-widest text-[#8A7A56]">Citation &amp; Authority Governance</h2>
        <p className="text-xs text-[#3A3222]">AI-summary disclaimer required: <span className="font-bold">{rules.aiSummaryDisclaimerRequired ? 'Yes' : 'No'}</span></p>
        <p className="text-xs text-[#3A3222]">Advocate confirmation required before final use: <span className="font-bold">{rules.advocateConfirmationRequiredBeforeFinalUse ? 'Yes' : 'No'}</span></p>
        <p className="text-xs text-[#3A3222]">Source provenance must be visible: <span className="font-bold">{rules.sourceProvenanceMustBeVisible ? 'Yes' : 'No'}</span></p>
        <p className="text-xs text-red-600 font-bold">Citations may be marked as factual evidence: No — never permitted.</p>
      </div>
    </div>
  );
}
