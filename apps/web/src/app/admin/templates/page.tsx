'use client';

import React from 'react';
import { getTemplates, setTemplateEnabled, publishNewVersion, TEMPLATE_CATEGORIES, type DocumentTemplate } from '@/lib/admin/templates';

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = React.useState<DocumentTemplate[]>([]);
  const [categoryFilter, setCategoryFilter] = React.useState<string>('All');

  React.useEffect(() => {
    setTemplates(getTemplates());
  }, []);

  const filtered = templates.filter((t) => categoryFilter === 'All' || t.category === categoryFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">Document Templates</h1>
        <p className="text-sm font-serif italic text-[#8A7A56]">Publishing a new version never overwrites history — every prior version's row is preserved.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setCategoryFilter('All')} className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${categoryFilter === 'All' ? 'bg-[#8A6D2F] border-[#8A6D2F] text-white' : 'bg-white border-[#E7DFC9] text-[#8A6D2F]'}`}>All</button>
        {TEMPLATE_CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategoryFilter(c)} className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${categoryFilter === c ? 'bg-[#8A6D2F] border-[#8A6D2F] text-white' : 'bg-white border-[#E7DFC9] text-[#8A6D2F]'}`}>{c}</button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((t) => (
          <div key={t.id} className="bg-white border border-[#111111]/10 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#111111]">{t.name} <span className="text-[10px] font-mono text-[#B0A588]">v{t.version}</span></p>
              <p className="text-[10px] text-[#8A7A56] mt-0.5">{t.category} · {t.scope} · {t.jurisdiction} · {t.courtLevel} · Updated {new Date(t.updatedAt).toLocaleDateString('en-IN')} by {t.updatedBy}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${t.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-[#F4EEE0] text-[#8A7A56] border-[#E7DFC9]'}`}>{t.enabled ? 'Enabled' : 'Disabled'}</span>
              <button onClick={() => { setTemplateEnabled(t.id, !t.enabled, 'Platform Admin'); setTemplates(getTemplates()); }} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white">{t.enabled ? 'Disable' : 'Enable'}</button>
              <button onClick={() => { publishNewVersion(t.id, 'Platform Admin'); setTemplates(getTemplates()); }} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white">Publish New Version</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
