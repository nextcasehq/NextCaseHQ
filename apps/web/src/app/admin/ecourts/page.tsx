'use client';

import React from 'react';
import { getEcourtsConfig, requestUrlChange, updateEcourtsToggle, isOfficialDomain } from '@/lib/admin/ecourts-config';
import type { EcourtsAdminConfig } from '@/lib/admin/ecourts-config';

export default function AdminEcourtsPage() {
  const [config, setConfig] = React.useState<EcourtsAdminConfig | null>(null);
  const [urlDraft, setUrlDraft] = React.useState('');
  const [urlError, setUrlError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const c = getEcourtsConfig();
    setConfig(c);
    setUrlDraft(c.officialUrl);
  }, []);

  if (!config) return null;

  function saveUrl() {
    const result = requestUrlChange(urlDraft, 'Platform Admin', 'Admin update via eCourts Configuration page.');
    if (!result.ok) {
      setUrlError(result.reason || 'Unable to update URL.');
      return;
    }
    setUrlError(null);
    setConfig(getEcourtsConfig());
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">eCourts Administration</h1>
        <p className="text-sm font-serif italic text-[#8A7A56]">No scraping, CAPTCHA bypass, undocumented APIs, or background polling exist anywhere in this integration.</p>
      </div>

      <div className="bg-white border border-[#111111]/10 rounded-lg p-5 space-y-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Current Integration Mode</p>
          <p className="text-sm font-black text-[#8A6D2F] mt-1">{config.integrationMode}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Authorisation Status</p>
          <p className="text-sm font-bold text-red-600 mt-1">{config.authorisationStatus}</p>
        </div>
        <div>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Official eCourts URL</span>
            <input value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6] font-mono" />
          </label>
          {!isOfficialDomain(urlDraft) && urlDraft !== config.officialUrl && (
            <p className="text-[10px] text-red-600 mt-1">Only the official services.ecourts.gov.in domain is accepted without a privileged security approval step (not implemented in this prototype).</p>
          )}
          {urlError && <p className="text-[10px] text-red-600 mt-1">{urlError}</p>}
          <button onClick={saveUrl} className="mt-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624]">Save URL</button>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Disclaimer Text</p>
          <p className="text-xs text-[#3A3222] mt-1">{config.disclaimer}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Attribution Text</p>
          <p className="text-xs text-[#3A3222] mt-1">{config.attribution}</p>
        </div>
        <div className="flex flex-wrap gap-4 pt-2 border-t border-[#F4EEE0]">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={config.caseNumberSearchEnabled} onChange={(e) => { updateEcourtsToggle({ caseNumberSearchEnabled: e.target.checked }, 'Platform Admin'); setConfig(getEcourtsConfig()); }} />
            <span className="text-xs font-semibold">Case Number search enabled</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={config.cnrSearchEnabled} onChange={(e) => { updateEcourtsToggle({ cnrSearchEnabled: e.target.checked }, 'Platform Admin'); setConfig(getEcourtsConfig()); }} />
            <span className="text-xs font-semibold">CNR search enabled</span>
          </label>
        </div>
        <p className="text-[10px] text-[#B0A588] pt-2 border-t border-[#F4EEE0]">Last changed {new Date(config.lastConfigChangeAt).toLocaleString('en-IN')} by {config.lastConfigChangeBy}</p>
      </div>
    </div>
  );
}
