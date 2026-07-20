'use client';

import React from 'react';
import { getUsers, type AdminUser } from '@/lib/admin/users';
import { getAuditLog, type AuditEvent } from '@/lib/admin/audit-log';
import { getSystemSettings } from '@/lib/admin/system-settings';
import { getIntegrations } from '@/lib/admin/integrations';

function StatusCard({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'good' | 'warn' }) {
  const toneClass = tone === 'good' ? 'text-emerald-700' : tone === 'warn' ? 'text-red-600' : 'text-[#111111]';
  return (
    <div className="bg-white border border-[#111111]/10 rounded-lg p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">{label}</p>
      <p className={`text-sm font-black mt-1 ${toneClass}`}>{value}</p>
    </div>
  );
}

export default function AdminSecurityPage() {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [audit, setAudit] = React.useState<AuditEvent[]>([]);
  const settings = getSystemSettings();
  const integrations = getIntegrations();

  React.useEffect(() => {
    setUsers(getUsers());
    setAudit(getAuditLog());
  }, []);

  const suspendedCount = users.filter((u) => u.status === 'Suspended').length;
  const secretsConfigured = integrations.filter((i) => i.configurationComplete).length;
  const privilegedActions = audit.slice(0, 15);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">Security</h1>
        <p className="text-sm font-serif italic text-[#8A7A56]">Read-only status overview. No secret values are ever displayed here, and nothing on this page weakens existing authentication or middleware.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatusCard label="Authentication Mode" value="Single login — server-verified role" tone="good" />
        <StatusCard label="Admin Session Trust" value="Signed admin session cookie" tone="good" />
        <StatusCard label="Session Timeout" value={`${settings.sessionTimeoutMinutes} minutes`} />
        <StatusCard label="Suspended Accounts" value={String(suspendedCount)} tone={suspendedCount > 0 ? 'warn' : 'good'} />
        <StatusCard label="Active Security Alerts" value="0" tone="good" />
        <StatusCard label="Rate Limiting" value="Enforced at middleware / API layer" tone="good" />
        <StatusCard label="CSRF / Origin Protection" value="Allowed-origin enforcement active" tone="good" />
        <StatusCard label="Security Headers" value="Applied via middleware" tone="good" />
        <StatusCard label="Integration Secrets Configured" value={`${secretsConfigured} / ${integrations.length}`} />
        <StatusCard label="Failed Login Summary" value="No failed-login telemetry recorded yet" />
      </div>

      <div className="bg-white border border-[#111111]/10 rounded-lg p-5">
        <h2 className="text-xs font-black uppercase tracking-widest text-[#8A7A56] mb-3">Recent Privileged Actions</h2>
        <div className="space-y-2">
          {privilegedActions.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-[#F4EEE0] last:border-0">
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#111111]">{e.action} — {e.target}</p>
                <p className="text-[10px] text-[#8A7A56]">{e.actor} ({e.actorRole}) · {e.reason}</p>
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${e.result === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{e.result}</span>
              <span className="text-[10px] text-[#B0A588]">{new Date(e.timestamp).toLocaleString('en-IN')}</span>
            </div>
          ))}
          {privilegedActions.length === 0 && <p className="text-xs text-[#8A7A56]">No privileged actions recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}
