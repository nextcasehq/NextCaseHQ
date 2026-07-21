'use client';

import React from 'react';
import { getPromotions, setPromotionActive, type Promotion } from '@/lib/admin/promotions';
import { getPlans } from '@/lib/ai-credits/catalogue';

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = React.useState<Promotion[]>([]);
  const plans = getPlans();

  React.useEffect(() => {
    setPromotions(getPromotions());
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">Promotions &amp; Trials</h1>
        <p className="text-sm font-serif italic text-[#8A7A56]">Prototype interactions here do not create real financial obligations.</p>
      </div>

      <div className="space-y-3">
        {promotions.map((p) => (
          <div key={p.id} className="bg-white border border-[#111111]/10 rounded-lg p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-[#111111]">{p.name} <span className="text-[10px] font-mono text-[#B0A588]">({p.code})</span></p>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${p.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-[#F4EEE0] text-[#8A7A56] border-[#E7DFC9]'}`}>{p.active ? 'Active' : 'Inactive'}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
              <div><p className="font-bold uppercase text-[#8A7A56]">Credit Allocation</p><p className="font-semibold text-[#3A3222]">{p.creditAllocation}</p></div>
              <div><p className="font-bold uppercase text-[#8A7A56]">Eligible Plans</p><p className="font-semibold text-[#3A3222]">{p.eligiblePlanCodes.length ? p.eligiblePlanCodes.join(', ') : 'All'}</p></div>
              <div><p className="font-bold uppercase text-[#8A7A56]">Max Redemptions</p><p className="font-semibold text-[#3A3222]">{p.maxRedemptions ?? 'Unlimited'}</p></div>
              <div><p className="font-bold uppercase text-[#8A7A56]">Per-Account Limit</p><p className="font-semibold text-[#3A3222]">{p.perAccountRedemptionLimit}</p></div>
              <div><p className="font-bold uppercase text-[#8A7A56]">Start</p><p className="font-semibold text-[#3A3222]">{new Date(p.startDate).toLocaleDateString('en-IN')}</p></div>
              <div><p className="font-bold uppercase text-[#8A7A56]">End</p><p className="font-semibold text-[#3A3222]">{p.endDate ? new Date(p.endDate).toLocaleDateString('en-IN') : 'No end date'}</p></div>
            </div>
            <p className="text-[10px] text-[#8A7A56] pt-2 border-t border-[#F4EEE0]">{p.internalNote}</p>
            <button
              onClick={() => { setPromotionActive(p.id, !p.active, 'Platform Admin'); setPromotions(getPromotions()); }}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white"
            >
              {p.active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#111111]/10 rounded-lg p-5 space-y-2">
        <h2 className="text-xs font-black uppercase tracking-widest text-[#8A7A56]">Trial Configuration (per plan)</h2>
        {plans.map((p) => (
          <div key={p.code} className="flex items-center justify-between text-xs py-1.5 border-b border-[#F4EEE0] last:border-0">
            <span className="font-semibold text-[#3A3222]">{p.name}</span>
            <span className="text-[10px] text-[#8A7A56]">
              {p.trialAvailable ? `${p.trialDurationDays} days · ${p.trialCreditAllocation} credits` : 'No trial'}
            </span>
          </div>
        ))}
        <p className="text-[10px] text-[#B0A588] pt-2 border-t border-[#F4EEE0]">Edit trial duration and credit allocation from Commercialization → Plans.</p>
      </div>
    </div>
  );
}
