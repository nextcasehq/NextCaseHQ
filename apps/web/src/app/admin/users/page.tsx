'use client';

import React from 'react';
import { getUsers, setUserStatus, assignUserRole, type AdminUser, type UserStatus } from '@/lib/admin/users';
import { ROLE_DEFINITIONS } from '@/lib/admin/roles';
import { DEMO_ADMINISTRATION_NOTICE } from '@/lib/admin/store-utils';

const STATUS_FILTERS: Array<'All' | UserStatus> = ['All', 'Active', 'Invited', 'Suspended', 'Disabled', 'Trial'];

function ReasonPrompt({ title, onConfirm, onCancel }: { title: string; onConfirm: (reason: string) => void; onCancel: () => void }) {
  const [reason, setReason] = React.useState('');
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wide text-[#111111]">{title}</h3>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Reason (required)</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full mt-1 px-3 py-2 text-xs border border-[#E7DFC9] rounded-lg bg-[#FBFAF6] focus:outline-none focus:border-[#8A6D2F]" />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white">Cancel</button>
          <button disabled={!reason.trim()} onClick={() => onConfirm(reason)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624] disabled:opacity-40 disabled:cursor-not-allowed">Confirm</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'All' | UserStatus>('All');
  const [pendingAction, setPendingAction] = React.useState<{ userId: string; kind: 'suspend' | 'restore' } | null>(null);

  React.useEffect(() => {
    setUsers(getUsers());
  }, []);

  const filtered = users.filter((u) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.firmName || '').toLowerCase().includes(q) || u.primaryRole.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'All' || u.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  function refresh() {
    setUsers(getUsers());
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">Users</h1>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] mt-1">{DEMO_ADMINISTRATION_NOTICE}</p>
      </div>

      <div className="bg-white border border-[#111111]/10 rounded-lg p-4 space-y-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, email, firm, or role..."
          className="w-full px-3 py-2 text-xs border border-[#E7DFC9] rounded-lg focus:outline-none focus:border-[#8A6D2F] bg-[#FBFAF6]"
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border ${statusFilter === s ? 'bg-[#8A6D2F] border-[#8A6D2F] text-white' : 'bg-white border-[#E7DFC9] text-[#8A6D2F]'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((u) => (
          <div key={u.id} className="bg-white border border-[#111111]/10 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#111111]">{u.name}</p>
              <p className="text-[10px] text-[#8A7A56] mt-0.5">{u.email} · {u.firmName || 'No firm'} · Last login {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-IN') : 'Never'}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={u.primaryRole}
                onChange={(e) => {
                  assignUserRole(u.id, e.target.value, 'Platform Admin', 'Role reassignment via Admin Panel.');
                  refresh();
                }}
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 border border-[#E7DFC9] rounded bg-white"
              >
                {ROLE_DEFINITIONS.map((r) => (
                  <option key={r.key} value={r.key}>{r.name}</option>
                ))}
              </select>
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-[#F4EEE0] text-[#8A7A56] border-[#E7DFC9]">{u.aiCreditUsageStatus}</span>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${u.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : u.status === 'Suspended' || u.status === 'Disabled' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-sky-50 text-sky-700 border-sky-200'}`}>{u.status}</span>
              {u.status === 'Suspended' ? (
                <button onClick={() => setPendingAction({ userId: u.id, kind: 'restore' })} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white">Restore</button>
              ) : (
                <button onClick={() => setPendingAction({ userId: u.id, kind: 'suspend' })} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-red-200 text-red-700 hover:bg-red-50 bg-white">Suspend</button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-8 bg-white border border-[#111111]/10 rounded-lg">
            <p className="text-xs font-semibold text-[#8A7A56]">No users match this search and filter.</p>
          </div>
        )}
      </div>

      {pendingAction && (
        <ReasonPrompt
          title={pendingAction.kind === 'suspend' ? 'Suspend Account' : 'Restore Account'}
          onCancel={() => setPendingAction(null)}
          onConfirm={(reason) => {
            setUserStatus(pendingAction.userId, pendingAction.kind === 'suspend' ? 'Suspended' : 'Active', 'Platform Admin', reason);
            setPendingAction(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
