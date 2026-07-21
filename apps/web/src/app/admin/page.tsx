'use client';

import React from 'react';
import Link from 'next/link';
import { getUsers } from '@/lib/admin/users';
import { getFirms } from '@/lib/admin/firms';
import { getAuditLog } from '@/lib/admin/audit-log';
import { getMatterOversightRows } from '@/lib/admin/matter-oversight';
import { getIntegrations } from '@/lib/admin/integrations';
import { getOperationalNotices } from '@/lib/admin/operational-notices';
import { DEMO_ACCOUNTS, getBalance, getLedger } from '@/lib/ai-credits/wallet-store';

function SummaryCard({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'default' | 'warning' | 'danger' }) {
  const toneClass = tone === 'danger' ? 'text-red-600' : tone === 'warning' ? 'text-amber-600' : 'text-[#111111]';
  return (
    <div className="bg-white border border-[#111111]/10 rounded-lg p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">{label}</p>
      <p className={`text-xl font-black mt-1 ${toneClass}`}>{value}</p>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [ready, setReady] = React.useState(false);
  const [snapshot, setSnapshot] = React.useState<ReturnType<typeof buildSnapshot> | null>(null);

  React.useEffect(() => {
    setSnapshot(buildSnapshot());
    setReady(true);
  }, []);

  function buildSnapshot() {
    const users = getUsers();
    const firms = getFirms();
    const matters = getMatterOversightRows();
    const integrations = getIntegrations();
    const notices = getOperationalNotices().filter((n) => n.active);
    const auditLog = getAuditLog();

    let creditsIssued = 0;
    let creditsUsed = 0;
    let failedOrReversed = 0;
    for (const account of DEMO_ACCOUNTS) {
      const balance = getBalance(account.id);
      creditsIssued += balance.monthlyIncludedCredits + balance.promotionalCredits + balance.purchasedCredits;
      creditsUsed += balance.usedCreditsThisPeriod;
      failedOrReversed += getLedger(account.id).filter((e) => e.status === 'Failed' || e.status === 'Reversed').length;
    }

    const today = new Date().toISOString().slice(0, 10);
    const upcomingHearings = matters.filter((m) => m.nextHearingDate && m.nextHearingDate >= today).length;

    return {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.status === 'Active').length,
      totalFirms: firms.length,
      activeSubscriptions: firms.filter((f) => f.status === 'Active').length,
      trialAccounts: users.filter((u) => u.status === 'Trial').length,
      creditsIssued,
      creditsUsed,
      failedOrReversed,
      activeMatters: matters.filter((m) => !m.closed).length,
      upcomingHearings,
      recentChanges: auditLog.slice(0, 5),
      suspendedUsers: users.filter((u) => u.status === 'Suspended').length,
      integrationsEnabled: integrations.filter((i) => i.enabled).length,
      integrationsTotal: integrations.length,
      activeNotices: notices,
    };
  }

  if (!ready || !snapshot) {
    return (
      <div className="flex justify-center py-20">
        <span className="w-8 h-8 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">Platform Overview</h1>
        <p className="text-sm font-serif italic text-[#8A7A56]">Compact operational summary — no revenue forecasting or financial accounting here.</p>
      </div>

      {snapshot.activeNotices.length > 0 && (
        <div className="space-y-2">
          {snapshot.activeNotices.map((n) => (
            <div key={n.id} className="p-3 bg-[#FBF6EA] border border-[#C6A253]/40 rounded-lg text-xs font-semibold text-[#5C5340]">
              <span className="font-bold uppercase tracking-wider mr-2">{n.type}:</span>{n.title} — {n.message}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Users" value={snapshot.totalUsers} />
        <SummaryCard label="Active Users" value={snapshot.activeUsers} />
        <SummaryCard label="Total Firms / Tenants" value={snapshot.totalFirms} />
        <SummaryCard label="Active Subscriptions" value={snapshot.activeSubscriptions} />
        <SummaryCard label="Trial Accounts" value={snapshot.trialAccounts} />
        <SummaryCard label="AI Credits Issued" value={snapshot.creditsIssued} />
        <SummaryCard label="AI Credits Used" value={snapshot.creditsUsed} />
        <SummaryCard label="Failed / Reversed Transactions" value={snapshot.failedOrReversed} tone={snapshot.failedOrReversed > 0 ? 'warning' : 'default'} />
        <SummaryCard label="Active Matter Registers" value={snapshot.activeMatters} />
        <SummaryCard label="Matters With Upcoming Hearings" value={snapshot.upcomingHearings} />
        <SummaryCard label="Suspended Accounts" value={snapshot.suspendedUsers} tone={snapshot.suspendedUsers > 0 ? 'danger' : 'default'} />
        <SummaryCard label="Integrations Enabled" value={`${snapshot.integrationsEnabled} / ${snapshot.integrationsTotal}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#111111]/10 rounded-lg p-5 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-[#8A7A56]">Recent Administrative Changes</h2>
          {snapshot.recentChanges.length === 0 ? (
            <p className="text-xs text-[#8A7A56]">No administrative changes recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {snapshot.recentChanges.map((e) => (
                <div key={e.id} className="text-xs border-b border-[#F4EEE0] pb-2 last:border-0">
                  <p className="font-bold text-[#111111]">{e.action} — {e.target}</p>
                  <p className="text-[#8A7A56] mt-0.5">{e.actor} · {new Date(e.timestamp).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          )}
          <Link href="/admin/audit" className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">View Full Audit Log →</Link>
        </div>

        <div className="bg-white border border-[#111111]/10 rounded-lg p-5 space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-[#8A7A56]">Security &amp; Integration Status</h2>
          <p className="text-xs text-[#3A3222]">
            <span className="font-bold">{snapshot.suspendedUsers}</span> account(s) currently suspended.
          </p>
          <p className="text-xs text-[#3A3222]">
            <span className="font-bold">{snapshot.integrationsEnabled}</span> of {snapshot.integrationsTotal} integrations enabled.
          </p>
          <div className="flex gap-2 pt-2">
            <Link href="/admin/security" className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">Security →</Link>
            <Link href="/admin/integrations" className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">Integrations →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
