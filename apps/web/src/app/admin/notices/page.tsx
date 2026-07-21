'use client';

import React from 'react';
import { getOperationalNotices, saveOperationalNotice, setNoticeActive, type OperationalNotice, type NoticeType, type NoticeSeverity } from '@/lib/admin/operational-notices';

const NOTICE_TYPES: NoticeType[] = ['Maintenance', 'Service interruption', 'Feature preview', 'Security', 'Billing', 'Integration outage'];
const SEVERITIES: NoticeSeverity[] = ['Info', 'Warning', 'Critical'];

const EMPTY_DRAFT = {
  title: '',
  message: '',
  type: 'Maintenance' as NoticeType,
  severity: 'Info' as NoticeSeverity,
  audience: 'All users' as OperationalNotice['audience'],
  startTime: '',
  endTime: null as string | null,
  dismissible: true,
  active: true,
};

export default function AdminNoticesPage() {
  const [notices, setNotices] = React.useState<OperationalNotice[]>([]);
  const [draft, setDraft] = React.useState(EMPTY_DRAFT);

  React.useEffect(() => {
    setNotices(getOperationalNotices());
  }, []);

  function create() {
    if (!draft.title.trim() || !draft.message.trim() || !draft.startTime) return;
    saveOperationalNotice({ ...draft, startTime: new Date(draft.startTime).toISOString() }, 'Platform Admin');
    setNotices(getOperationalNotices());
    setDraft(EMPTY_DRAFT);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-wider">Operational Notices</h1>
        <p className="text-sm font-serif italic text-[#8A7A56]">Maintenance, outage, and status communication only — this is not a marketing-content manager.</p>
      </div>

      <div className="bg-white border border-[#111111]/10 rounded-lg p-5 space-y-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-[#8A7A56]">New Notice</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" className="px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
          <input type="datetime-local" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} className="px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
          <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as NoticeType })} className="px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-white">
            {NOTICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: e.target.value as NoticeSeverity })} className="px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-white">
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <textarea value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} placeholder="Message" rows={2} className="w-full px-2 py-1.5 text-xs border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
        <button onClick={create} className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624]">Create Notice</button>
      </div>

      <div className="space-y-2">
        {notices.map((n) => (
          <div key={n.id} className="bg-white border border-[#111111]/10 rounded-lg p-4 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-[#111111]">{n.title}</p>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${n.severity === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' : n.severity === 'Warning' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-[#F4EEE0] text-[#8A7A56] border-[#E7DFC9]'}`}>{n.severity}</span>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${n.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-[#F4EEE0] text-[#8A7A56] border-[#E7DFC9]'}`}>{n.active ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <p className="text-xs text-[#3A3222]">{n.message}</p>
            <p className="text-[10px] text-[#8A7A56]">{n.type} · {n.audience} · {new Date(n.startTime).toLocaleString('en-IN')}{n.endTime ? ` – ${new Date(n.endTime).toLocaleString('en-IN')}` : ''}</p>
            <button
              onClick={() => { setNoticeActive(n.id, !n.active, 'Platform Admin'); setNotices(getOperationalNotices()); }}
              className="mt-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white"
            >
              {n.active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
