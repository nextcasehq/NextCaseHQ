'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getFirmWithUsageSummary } from '@/lib/admin/firms';
import { getTemplates } from '@/lib/admin/templates';
import { getAuditLog } from '@/lib/admin/audit-log';
import { DEMO_ADMINISTRATION_NOTICE } from '@/lib/admin/store-utils';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">{label}</p>
      <p className="text-xs text-[#3A3222] font-semibold mt-0.5">{value}</p>
    </div>
  );
}

export default function AdminFirmDetailPage() {
  const params = useParams();
  const firmId = params.firmId as string;
  const summary = getFirmWithUsageSummary(firmId);
  const templateCount = getTemplates().filter((t) => t.firmId === firmId || t.scope === 'Global').length;
  const auditHistory = getAuditLog().filter((e) => e.tenantId === firmId).slice(0, 10);

  if (!summary) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-bold">Firm not found.</p>
        <Link href="/admin/firms" className="text-xs font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">← Back to Firms</Link>
      </div>
    );
  }

  const { firm, balance, users } = summary;
  const available = Math.max(0, balance.availableCredits - balance.reservedCredits);

  return (
    <div className="space-y-6">
      <Link href="/admin/firms" className="text-[10px] font-bold uppercase tracking-wider text-[#B0A588] hover:text-[#8A6D2F]">← Back to Firms</Link>
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">{firm.name}</h1>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] mt-1">{DEMO_ADMINISTRATION_NOTICE}</p>
      </div>

      <div className="bg-white border border-[#111111]/10 rounded-lg p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label="Tenant Reference" value={firm.tenantRef} />
        <Field label="Plan" value={firm.planCode} />
        <Field label="Status" value={firm.status} />
        <Field label="Offices" value={firm.offices.join(', ')} />
        <Field label="AI Credit Balance" value={available} />
        <Field label="Active Matters" value={firm.activeMatterCount} />
        <Field label="Document Templates" value={templateCount} />
        <Field label="Created" value={new Date(firm.createdAt).toLocaleDateString('en-IN')} />
      </div>

      <div className="bg-white border border-[#111111]/10 rounded-lg p-5 space-y-2">
        <h2 className="text-xs font-black uppercase tracking-widest text-[#8A7A56]">Authorised Users</h2>
        {users.length === 0 ? (
          <p className="text-xs text-[#8A7A56]">No users assigned to this firm yet.</p>
        ) : (
          users.map((u) => (
            <div key={u.id} className="flex items-center justify-between text-xs py-1.5 border-b border-[#F4EEE0] last:border-0">
              <span className="font-semibold text-[#3A3222]">{u.name} ({u.email})</span>
              <span className="text-[10px] text-[#8A7A56]">{u.primaryRole}</span>
            </div>
          ))
        )}
      </div>

      <div className="bg-white border border-[#111111]/10 rounded-lg p-5 space-y-2">
        <h2 className="text-xs font-black uppercase tracking-widest text-[#8A7A56]">Security &amp; Audit History</h2>
        {auditHistory.length === 0 ? (
          <p className="text-xs text-[#8A7A56]">No audit events recorded for this firm yet.</p>
        ) : (
          auditHistory.map((e) => (
            <div key={e.id} className="text-xs py-1.5 border-b border-[#F4EEE0] last:border-0">
              <p className="font-semibold text-[#3A3222]">{e.action} — {e.target}</p>
              <p className="text-[10px] text-[#8A7A56]">{e.actor} · {new Date(e.timestamp).toLocaleString('en-IN')}</p>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/commercialization/transactions" className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white">View Credit Ledger</Link>
        <Link href="/admin/matters" className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white">View Matter Registers</Link>
      </div>
    </div>
  );
}
