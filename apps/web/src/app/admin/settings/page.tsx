'use client';

import React from 'react';
import { getSystemSettings, updateSystemSettings, type SystemSettings } from '@/lib/admin/system-settings';

export default function AdminSystemSettingsPage() {
  const [settings, setSettings] = React.useState<SystemSettings | null>(null);
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [savedAt, setSavedAt] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSettings(getSystemSettings());
  }, []);

  if (!settings) return null;

  function apply(patch: Partial<SystemSettings>) {
    const result = updateSystemSettings(patch, 'Platform Admin', reason);
    if (!result.ok) {
      setError(result.reason || 'Unable to save this change.');
      return;
    }
    setError(null);
    setSettings(getSystemSettings());
    setSavedAt(new Date().toLocaleTimeString('en-IN'));
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">System Settings</h1>
        <p className="text-sm font-serif italic text-[#8A7A56]">Security-sensitive changes (maintenance mode, public registration, session timeout) require a reason and are recorded in the audit log.</p>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700">{error}</div>}
      {savedAt && !error && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700">Saved at {savedAt}.</div>}

      <div className="bg-white border border-[#111111]/10 rounded-lg p-5 space-y-4">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Reason for sensitive changes</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required for maintenance mode, registration, or session timeout changes" className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
        </label>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Platform Name</span>
            <input defaultValue={settings.platformName} onBlur={(e) => apply({ platformName: e.target.value })} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Support Email</span>
            <input defaultValue={settings.supportEmail} onBlur={(e) => apply({ supportEmail: e.target.value })} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Default Timezone</span>
            <input defaultValue={settings.defaultTimezone} onBlur={(e) => apply({ defaultTimezone: e.target.value })} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Default Currency</span>
            <input defaultValue={settings.defaultCurrency} onBlur={(e) => apply({ defaultCurrency: e.target.value })} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Hearing Reminder Lead (days)</span>
            <input type="number" defaultValue={settings.hearingReminderLeadDays} onBlur={(e) => apply({ hearingReminderLeadDays: Number(e.target.value) })} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Session Timeout (minutes)</span>
            <input type="number" defaultValue={settings.sessionTimeoutMinutes} onBlur={(e) => apply({ sessionTimeoutMinutes: Number(e.target.value) })} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Max Upload Size (MB)</span>
            <input type="number" defaultValue={settings.maxUploadSizeMb} onBlur={(e) => apply({ maxUploadSizeMb: Number(e.target.value) })} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Allowed File Types</span>
            <input defaultValue={settings.allowedFileTypes.join(', ')} onBlur={(e) => apply({ allowedFileTypes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 pt-3 border-t border-[#F4EEE0]">
          <label className="flex items-center gap-2"><input type="checkbox" checked={settings.matterClosureRequiresReason} onChange={(e) => apply({ matterClosureRequiresReason: e.target.checked })} /><span className="text-xs font-semibold">Matter closure requires reason</span></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={settings.publicRegistrationEnabled} onChange={(e) => apply({ publicRegistrationEnabled: e.target.checked })} /><span className="text-xs font-semibold">Public registration enabled</span></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={settings.trialAvailable} onChange={(e) => apply({ trialAvailable: e.target.checked })} /><span className="text-xs font-semibold">Trial available</span></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={settings.aiAvailable} onChange={(e) => apply({ aiAvailable: e.target.checked })} /><span className="text-xs font-semibold">AI features available</span></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={settings.maintenanceMode} onChange={(e) => apply({ maintenanceMode: e.target.checked })} /><span className="text-xs font-semibold">Maintenance mode</span></label>
        </div>
      </div>
    </div>
  );
}
