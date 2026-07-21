'use client';

import React from 'react';
import { getSystemRules, saveSystemRules } from '@/lib/ai-credits/catalogue';
import type { SystemRules } from '@/lib/ai-credits/types';
import { recordAuditEvent } from '@/lib/admin/audit-log';

export default function AdminBillingRulesPage() {
  const [rules, setRules] = React.useState<SystemRules | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    setRules(getSystemRules());
  }, []);

  if (!rules) return null;

  function set<K extends keyof SystemRules>(key: K, value: SystemRules[K]) {
    setRules((r) => (r ? { ...r, [key]: value } : r));
    setSaved(false);
  }

  function save() {
    const previous = getSystemRules();
    saveSystemRules(rules!);
    recordAuditEvent({
      actor: 'Platform Admin', actorRole: 'PLATFORM_ADMIN', tenantId: null,
      target: 'Billing Rules', action: 'System setting changed',
      previousValue: JSON.stringify(previous), newValue: JSON.stringify(rules), reason: 'Admin update via Billing Rules page.', sessionRef: null, result: 'SUCCESS',
    });
    setSaved(true);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">Billing Rules</h1>
        <p className="text-sm font-serif italic text-[#8A7A56]">Real tax calculation and invoicing are not implemented in this milestone.</p>
      </div>

      {saved && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700">Billing rules saved.</div>}

      <div className="bg-white border border-[#111111]/10 rounded-lg p-5 space-y-4">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Low-Balance Thresholds (comma-separated fractions)</span>
          <input
            value={rules.lowBalanceThresholds.join(', ')}
            onChange={(e) => set('lowBalanceThresholds', e.target.value.split(',').map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n)))}
            className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Zero-Balance Behaviour</span>
          <textarea value={rules.zeroBalanceBehavior} onChange={(e) => set('zeroBalanceBehavior', e.target.value)} rows={2} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Confirmation Threshold (credits)</span>
          <input type="number" value={rules.lowCostConfirmationCeiling} onChange={(e) => set('lowCostConfirmationCeiling', Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={rules.defaultRequireConfirmationAlways} onChange={(e) => set('defaultRequireConfirmationAlways', e.target.checked)} />
          <span className="text-xs font-semibold">Require confirmation by default for new actions</span>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Reservation Expiry (minutes)</span>
          <input type="number" value={rules.reservationExpiryMinutes} onChange={(e) => set('reservationExpiryMinutes', Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Maximum Admin Adjustment (credits, single action)</span>
          <input type="number" value={rules.maxAdminAdjustment} onChange={(e) => set('maxAdminAdjustment', Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={rules.usageSuspensionAutoTrigger} onChange={(e) => set('usageSuspensionAutoTrigger', e.target.checked)} />
          <span className="text-xs font-semibold">Automatically suspend usage on repeated failed reservations</span>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Trial Conversion Behaviour</span>
          <textarea value={rules.trialConversionBehavior} onChange={(e) => set('trialConversionBehavior', e.target.value)} rows={2} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Default Currency</span>
          <input value={rules.defaultCurrency} onChange={(e) => set('defaultCurrency', e.target.value)} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#F4EEE0]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Tax Handling</p>
            <p className="text-xs text-red-600 font-semibold mt-0.5">{rules.taxHandlingStatus}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Payment Status</p>
            <p className="text-xs text-red-600 font-semibold mt-0.5">{rules.paymentStatus}</p>
          </div>
        </div>
      </div>

      <button onClick={save} className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624]">Save Billing Rules</button>
    </div>
  );
}
