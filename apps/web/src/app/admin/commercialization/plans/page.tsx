'use client';

import React from 'react';
import { getPlans, savePlan, DEMO_CONFIGURATION_NOTICE } from '@/lib/ai-credits/catalogue';
import type { Plan } from '@/lib/ai-credits/types';
import { recordAuditEvent } from '@/lib/admin/audit-log';

function PlanEditor({ plan, onSave, onClose }: { plan: Plan; onSave: (p: Plan) => void; onClose: () => void }) {
  const [draft, setDraft] = React.useState<Plan>(plan);

  function set<K extends keyof Plan>(key: K, value: Plan[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-3 my-8">
        <h3 className="text-sm font-black uppercase tracking-wide text-[#111111]">Edit Plan — {plan.name}</h3>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F]">{DEMO_CONFIGURATION_NOTICE}</p>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <label className="col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Plan Name</span>
            <input value={draft.name} onChange={(e) => set('name', e.target.value)} className="w-full mt-1 px-2 py-1.5 border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
          </label>
          <label className="col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Description</span>
            <textarea value={draft.description} onChange={(e) => set('description', e.target.value)} rows={2} className="w-full mt-1 px-2 py-1.5 border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
          </label>
          <label>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Status</span>
            <select value={draft.status} onChange={(e) => set('status', e.target.value as Plan['status'])} className="w-full mt-1 px-2 py-1.5 border border-[#E7DFC9] rounded bg-white">
              <option>Draft</option><option>Active</option><option>Archived</option>
            </select>
          </label>
          <label>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Billing Interval</span>
            <select value={draft.billingInterval} onChange={(e) => set('billingInterval', e.target.value as Plan['billingInterval'])} className="w-full mt-1 px-2 py-1.5 border border-[#E7DFC9] rounded bg-white">
              <option>Monthly</option><option>Annual</option>
            </select>
          </label>
          <label>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Price</span>
            <input type="number" value={draft.price} onChange={(e) => set('price', Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
          </label>
          <label>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Currency</span>
            <input value={draft.currency} onChange={(e) => set('currency', e.target.value)} className="w-full mt-1 px-2 py-1.5 border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
          </label>
          <label>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Included Monthly Credits</span>
            <input type="number" value={draft.includedMonthlyCredits} onChange={(e) => set('includedMonthlyCredits', Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
          </label>
          <label>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Display Order</span>
            <input type="number" value={draft.displayOrder} onChange={(e) => set('displayOrder', Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
          </label>
          <label>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Rollover Policy</span>
            <select value={draft.rolloverPolicy} onChange={(e) => set('rolloverPolicy', e.target.value as Plan['rolloverPolicy'])} className="w-full mt-1 px-2 py-1.5 border border-[#E7DFC9] rounded bg-white">
              <option>No rollover</option><option>Rolls over up to 1 month</option><option>Rolls over indefinitely</option>
            </select>
          </label>
          <label>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Credit Expiry Policy</span>
            <select value={draft.creditExpiryPolicy} onChange={(e) => set('creditExpiryPolicy', e.target.value as Plan['creditExpiryPolicy'])} className="w-full mt-1 px-2 py-1.5 border border-[#E7DFC9] rounded bg-white">
              <option>Expires at end of billing period</option><option>Expires after 90 days</option><option>Never expires</option>
            </select>
          </label>
          <label>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Max Users (blank = unlimited)</span>
            <input type="number" value={draft.maxUsers ?? ''} onChange={(e) => set('maxUsers', e.target.value === '' ? null : Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
          </label>
          <label>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Max Active Matters (blank = unlimited)</span>
            <input type="number" value={draft.maxActiveMatters ?? ''} onChange={(e) => set('maxActiveMatters', e.target.value === '' ? null : Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
          </label>
          <label className="flex items-center gap-2 col-span-2">
            <input type="checkbox" checked={draft.trialAvailable} onChange={(e) => set('trialAvailable', e.target.checked)} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Trial Available</span>
          </label>
          {draft.trialAvailable && (
            <>
              <label>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Trial Duration (days)</span>
                <input type="number" value={draft.trialDurationDays ?? ''} onChange={(e) => set('trialDurationDays', e.target.value === '' ? null : Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
              </label>
              <label>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Trial Credit Allocation</span>
                <input type="number" value={draft.trialCreditAllocation ?? ''} onChange={(e) => set('trialCreditAllocation', e.target.value === '' ? null : Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
              </label>
            </>
          )}
          <label className="flex items-center gap-2 col-span-2">
            <input type="checkbox" checked={draft.isPublic} onChange={(e) => set('isPublic', e.target.checked)} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Publicly Visible</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white">Cancel</button>
          <button
            onClick={() => {
              const updated = { ...draft, lastUpdatedAt: new Date().toISOString(), updatedBy: 'Platform Admin' };
              onSave(updated);
            }}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624]"
          >
            Save Plan
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPlansPage() {
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [editing, setEditing] = React.useState<Plan | null>(null);

  React.useEffect(() => {
    setPlans(getPlans());
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">Plans</h1>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] mt-1">{DEMO_CONFIGURATION_NOTICE}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.sort((a, b) => a.displayOrder - b.displayOrder).map((p) => (
          <div key={p.id} className="bg-white border border-[#111111]/10 rounded-lg p-5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-[#111111]">{p.name}</p>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${p.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-[#F4EEE0] text-[#8A7A56] border-[#E7DFC9]'}`}>{p.status}</span>
            </div>
            <p className="text-lg font-black text-[#8A6D2F]">{p.currency} {p.price} <span className="text-[10px] font-bold text-[#8A7A56] uppercase">/ {p.billingInterval}</span></p>
            <p className="text-xs text-[#8A7A56]">{p.description}</p>
            <p className="text-xs font-semibold text-[#3A3222]">{p.includedMonthlyCredits} AI Credits / month</p>
            <p className="text-[10px] text-[#8A7A56]">Rollover: {p.rolloverPolicy} · Expiry: {p.creditExpiryPolicy}</p>
            <p className="text-[10px] text-[#8A7A56]">Max users: {p.maxUsers ?? 'Unlimited'} · Max matters: {p.maxActiveMatters ?? 'Unlimited'}</p>
            {p.trialAvailable && <p className="text-[10px] text-[#8A7A56]">Trial: {p.trialDurationDays} days, {p.trialCreditAllocation} credits</p>}
            <button onClick={() => setEditing(p)} className="w-full px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white">Edit Plan</button>
          </div>
        ))}
      </div>

      {editing && (
        <PlanEditor
          plan={editing}
          onClose={() => setEditing(null)}
          onSave={(updated) => {
            const previous = plans.find((p) => p.id === updated.id);
            savePlan(updated);
            recordAuditEvent({
              actor: 'Platform Admin', actorRole: 'PLATFORM_ADMIN', tenantId: null,
              target: `Plan ${updated.name}`, action: 'Price change',
              previousValue: previous ? `${previous.currency} ${previous.price}` : null,
              newValue: `${updated.currency} ${updated.price}`,
              reason: 'Admin edit via Plans page.', sessionRef: null, result: 'SUCCESS',
            });
            setPlans(getPlans());
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
