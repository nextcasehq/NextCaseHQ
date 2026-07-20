'use client';

import React from 'react';
import { getFeatureFlags, setFlagEnabled, type FeatureFlag } from '@/lib/admin/feature-flags';

export default function AdminFeatureFlagsPage() {
  const [flags, setFlags] = React.useState<FeatureFlag[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setFlags(getFeatureFlags());
  }, []);

  function toggle(flag: FeatureFlag) {
    const result = setFlagEnabled(flag.key, !flag.enabled, 'Platform Admin', `Toggled via Admin Panel.`);
    if (!result.ok) {
      setError(result.reason || 'Unable to change this flag.');
      return;
    }
    setError(null);
    setFlags(getFeatureFlags());
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">Feature Flags</h1>
        <p className="text-sm font-serif italic text-[#8A7A56]">Unsafe production-only features remain guarded and cannot be enabled from this panel alone.</p>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700">{error}</div>}

      <div className="space-y-2">
        {flags.map((f) => (
          <div key={f.key} className="bg-white border border-[#111111]/10 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#111111]">{f.displayName} <span className="text-[10px] font-mono text-[#B0A588]">({f.key})</span></p>
              <p className="text-[10px] text-[#8A7A56] mt-0.5">{f.description}</p>
              <p className="text-[10px] text-[#B0A588] mt-0.5">Updated {new Date(f.updatedAt).toLocaleDateString('en-IN')} by {f.updatedBy}{f.productionGated ? ' · Production-gated' : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${f.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-[#F4EEE0] text-[#8A7A56] border-[#E7DFC9]'}`}>{f.enabled ? 'Enabled' : 'Disabled'}</span>
              <button onClick={() => toggle(f)} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white">
                {f.enabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
