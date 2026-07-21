'use client';

import React from 'react';
import { getAiActions, saveAiAction, getPlans, DEMO_CONFIGURATION_NOTICE } from '@/lib/ai-credits/catalogue';
import type { AiActionConfig } from '@/lib/ai-credits/types';
import { recordAuditEvent } from '@/lib/admin/audit-log';

function ActionEditor({ action, onSave, onClose }: { action: AiActionConfig; onSave: (a: AiActionConfig) => void; onClose: () => void }) {
  const [draft, setDraft] = React.useState<AiActionConfig>(action);
  const plans = getPlans();

  function set<K extends keyof AiActionConfig>(key: K, value: AiActionConfig[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-3 my-8">
        <h3 className="text-sm font-black uppercase tracking-wide text-[#111111]">Edit AI Action — {action.displayName}</h3>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={draft.enabled} onChange={(e) => set('enabled', e.target.checked)} />
          <span className="text-xs font-semibold">Enabled</span>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Credit Cost</span>
          <input type="number" min={0} value={draft.creditCost} onChange={(e) => set('creditCost', Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={draft.creditCost === 0} onChange={(e) => set('creditCost', e.target.checked ? 0 : action.creditCost || 5)} />
          <span className="text-xs font-semibold">Make this action temporarily free</span>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Minimum Plan</span>
          <select value={draft.minimumPlanCode ?? ''} onChange={(e) => set('minimumPlanCode', e.target.value || null)} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-white">
            <option value="">No minimum</option>
            {plans.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Max Usage Limit (blank = unlimited)</span>
          <input type="number" value={draft.maxUsageLimit ?? ''} onChange={(e) => set('maxUsageLimit', e.target.value === '' ? null : Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={draft.requireConfirmationAlways} onChange={(e) => set('requireConfirmationAlways', e.target.checked)} />
          <span className="text-xs font-semibold">Always require confirmation before this action</span>
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Effective Date</span>
          <input type="datetime-local" value={draft.effectiveFrom ? draft.effectiveFrom.slice(0, 16) : ''} onChange={(e) => set('effectiveFrom', e.target.value ? new Date(e.target.value).toISOString() : null)} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Internal Reason / Note</span>
          <textarea value={draft.adminNote} onChange={(e) => set('adminNote', e.target.value)} rows={2} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white">Cancel</button>
          <button
            onClick={() => onSave({ ...draft, lastUpdatedAt: new Date().toISOString(), updatedBy: 'Platform Admin' })}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624]"
          >
            Save Action
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAiCreditCostsPage() {
  const [actions, setActions] = React.useState<AiActionConfig[]>([]);
  const [editing, setEditing] = React.useState<AiActionConfig | null>(null);

  React.useEffect(() => {
    setActions(getAiActions());
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">AI Credit Costs</h1>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] mt-1">{DEMO_CONFIGURATION_NOTICE}</p>
        <p className="text-xs text-[#8A7A56] mt-1">One central catalogue — every user-facing surface (top bar, AI Credits & Usage, Matter Register AI actions) reads costs from this exact configuration.</p>
      </div>

      <div className="bg-white border border-[#111111]/10 rounded-lg divide-y divide-[#F4EEE0]">
        {actions.map((a) => (
          <div key={a.actionKey} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#111111]">{a.displayName} <span className="text-[10px] font-mono text-[#B0A588]">({a.actionKey})</span></p>
              <p className="text-[10px] text-[#8A7A56] mt-0.5">{a.description}</p>
              <p className="text-[10px] text-[#B0A588] mt-0.5">Updated {new Date(a.lastUpdatedAt).toLocaleDateString('en-IN')} by {a.updatedBy}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {!a.enabled && <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F4EEE0] text-[#8A7A56] border border-[#E7DFC9]">Disabled</span>}
              {a.creditCost === 0 && <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Free</span>}
              {a.minimumPlanCode && <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">{a.minimumPlanCode}+</span>}
              <span className="text-sm font-black text-[#8A6D2F]">{a.creditCost} Credits</span>
              <button onClick={() => setEditing(a)} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white">Edit</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <ActionEditor
          action={editing}
          onClose={() => setEditing(null)}
          onSave={(updated) => {
            const previous = actions.find((a) => a.actionKey === updated.actionKey);
            saveAiAction(updated);
            recordAuditEvent({
              actor: 'Platform Admin', actorRole: 'PLATFORM_ADMIN', tenantId: null,
              target: `AI Action ${updated.displayName}`, action: 'AI Credit adjustment',
              previousValue: previous ? String(previous.creditCost) : null, newValue: String(updated.creditCost),
              reason: updated.adminNote || 'Admin edit via AI Credit Costs page.', sessionRef: null, result: 'SUCCESS',
            });
            setActions(getAiActions());
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
