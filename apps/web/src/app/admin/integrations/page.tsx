'use client';

import React from 'react';
import { getIntegrations, setIntegrationEnabled, type IntegrationStatus } from '@/lib/admin/integrations';

export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = React.useState<IntegrationStatus[]>([]);

  React.useEffect(() => {
    setIntegrations(getIntegrations());
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">Integrations</h1>
        <p className="text-sm font-serif italic text-[#8A7A56]">Secrets are never displayed in plaintext — only masked identifiers, and never stored in frontend state.</p>
      </div>

      <div className="space-y-2">
        {integrations.map((i) => (
          <div key={i.id} className="bg-white border border-[#111111]/10 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#111111]">{i.name}</p>
              <p className="text-[10px] text-[#8A7A56] mt-0.5">{i.category} · {i.environment} · {i.maskedIdentifier || 'No credential configured'}</p>
              <p className="text-[10px] text-[#B0A588] mt-0.5">{i.internalNote}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${i.configurationComplete ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-[#F4EEE0] text-[#8A7A56] border-[#E7DFC9]'}`}>{i.authorisationStatus}</span>
              <span className="text-[10px] text-[#8A7A56]">{i.lastSuccessfulCheck ? `Checked ${new Date(i.lastSuccessfulCheck).toLocaleDateString('en-IN')}` : 'Never checked'}</span>
              <button
                onClick={() => { setIntegrationEnabled(i.id, !i.enabled, 'Platform Admin'); setIntegrations(getIntegrations()); }}
                disabled={!i.configurationComplete}
                className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {i.enabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
