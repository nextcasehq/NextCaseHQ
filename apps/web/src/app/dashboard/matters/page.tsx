'use client';

import React from 'react';
import Link from 'next/link';
import {
  MOCK_MATTERS,
  SYNTHETIC_DATA_NOTICE,
  isUrgentHearing,
  formatMockDate,
  type MockMatter,
  type MatterRegisterStatus,
} from './mock-matters';

const FILTERS: Array<'All' | MatterRegisterStatus> = ['All', 'Active', 'Hearing Soon', 'Awaiting Filing', 'Closed'];

function todayIso(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function matchesSearch(matter: MockMatter, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    matter.title.toLowerCase().includes(q) ||
    matter.caseNumber.toLowerCase().includes(q) ||
    matter.representedParty.toLowerCase().includes(q) ||
    matter.opposingParty.toLowerCase().includes(q) ||
    matter.court.toLowerCase().includes(q) ||
    matter.advocateReferenceNumber.toLowerCase().includes(q)
  );
}

interface MatterActionsMenuProps {
  matter: MockMatter;
  onNotice: (msg: string) => void;
}

/** Compact secondary action menu for a Matter Register card. Draft Document,
 * Upload/Link Document, and Next Hearing & Stage link to the already-merged
 * prototype flows rather than a new implementation. Prepare Arguments &
 * Evidence opens this specific matter's own Arguments tab, never a generic
 * workflow. Closed matters get a read-only action set instead. */
function MatterActionsMenu({ matter, onNotice }: MatterActionsMenuProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const isClosed = matter.status === 'Closed';

  React.useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-[#E7DFC9] rounded-lg text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all"
      >
        Actions ▾
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 w-60 bg-white border border-[#E7DFC9] rounded-xl shadow-xl z-30 py-1.5">
          {isClosed ? (
            <>
              <Link href={`/dashboard/matters/${matter.id}`} role="menuitem" onClick={() => setOpen(false)} className="block px-4 py-2 text-xs font-semibold text-[#3A3222] hover:bg-[#FBF8F1] transition-colors">
                View Record
              </Link>
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onNotice('Print / Export is a prototype action — no file is generated in this demonstration.');
                }}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-[#3A3222] hover:bg-[#FBF8F1] transition-colors bg-transparent border-none outline-none cursor-pointer"
              >
                Print / Export
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onNotice('Reopen Matter is a prototype action — status changes are not persisted in this demonstration.');
                }}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-[#3A3222] hover:bg-[#FBF8F1] transition-colors bg-transparent border-none outline-none cursor-pointer"
              >
                Reopen Matter
              </button>
            </>
          ) : (
            <>
              <Link href={`/dashboard/matters/${matter.id}`} role="menuitem" onClick={() => setOpen(false)} className="block px-4 py-2 text-xs font-semibold text-[#3A3222] hover:bg-[#FBF8F1] transition-colors">
                Open Matter
              </Link>
              <Link href="/prototypes/draft-document" role="menuitem" onClick={() => setOpen(false)} className="block px-4 py-2 text-xs font-semibold text-[#3A3222] hover:bg-[#FBF8F1] transition-colors">
                Draft Document
              </Link>
              <Link href="/prototypes/draft-document" role="menuitem" onClick={() => setOpen(false)} className="block px-4 py-2 text-xs font-semibold text-[#3A3222] hover:bg-[#FBF8F1] transition-colors">
                Upload / Link Document
              </Link>
              <Link href="/prototypes/next-hearing-stage" role="menuitem" onClick={() => setOpen(false)} className="block px-4 py-2 text-xs font-semibold text-[#3A3222] hover:bg-[#FBF8F1] transition-colors">
                Update Next Hearing &amp; Stage
              </Link>
              <Link href={`/dashboard/matters/${matter.id}?tab=arguments`} role="menuitem" onClick={() => setOpen(false)} className="block px-4 py-2 text-xs font-semibold text-[#3A3222] hover:bg-[#FBF8F1] transition-colors">
                Prepare Arguments &amp; Evidence
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: MatterRegisterStatus }) {
  const styles: Record<MatterRegisterStatus, string> = {
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Hearing Soon': 'bg-amber-50 text-amber-700 border-amber-200',
    'Awaiting Filing': 'bg-sky-50 text-sky-700 border-sky-200',
    Closed: 'bg-[#F4EEE0] text-[#8A7A56] border-[#E7DFC9]',
  };
  return (
    <span className={`flex-none text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles[status]}`}>
      {status}
    </span>
  );
}

function MatterCard({ matter, today, onNotice }: { matter: MockMatter; today: string; onNotice: (msg: string) => void }) {
  const urgent = isUrgentHearing(matter.nextHearingDate, today);

  return (
    <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 shadow-sm hover:border-[#E7DFC9] hover:shadow transition-all space-y-3 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/dashboard/matters/${matter.id}`} className="font-bold text-sm text-[#111111] hover:text-[#8A6D2F] transition-colors block">
            {matter.title}
          </Link>
          <p className="text-[10px] text-[#B0A588] font-bold uppercase tracking-wider mt-0.5 truncate">
            {matter.category} · {matter.procedureRole}
          </p>
        </div>
        <div className="flex-none flex flex-col items-end gap-1">
          <StatusBadge status={matter.status} />
          {urgent && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
              Urgent
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
        <div>
          <p className="font-bold uppercase tracking-wider text-[#8A7A56]">Case Number</p>
          <p className="text-[#3A3222] font-semibold truncate">{matter.caseNumber}</p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-wider text-[#8A7A56]">Court / Bench</p>
          <p className="text-[#3A3222] font-semibold truncate">{matter.court}</p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-wider text-[#8A7A56]">Represented Party</p>
          <p className="text-[#3A3222] font-semibold truncate">{matter.representedParty}</p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-wider text-[#8A7A56]">Current Stage</p>
          <p className="text-[#3A3222] font-semibold truncate">{matter.stage}</p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-wider text-[#8A7A56]">Next Hearing</p>
          <p className="text-[#3A3222] font-semibold truncate">{formatMockDate(matter.nextHearingDate)}</p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-wider text-[#8A7A56]">Advocate Ref.</p>
          <p className="text-[#3A3222] font-semibold truncate">{matter.advocateReferenceNumber}</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-[#B0A588] pt-1 border-t border-[#F4EEE0]">
        <span className="truncate">
          {matter.earlierCaseReference ? `Earlier ref: ${matter.earlierCaseReference.caseNumber}` : 'No earlier case reference'}
        </span>
        <span className="flex-none">
          {matter.pendingTaskCount} task{matter.pendingTaskCount === 1 ? '' : 's'} · Updated {formatMockDate(matter.lastUpdated)}
        </span>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[#F4EEE0]">
        <Link href={`/dashboard/matters/${matter.id}`} className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:text-[#6F5624]">
          Open Matter →
        </Link>
        <MatterActionsMenu matter={matter} onNotice={onNotice} />
      </div>
    </div>
  );
}

export default function MatterRegistersListPage() {
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<'All' | MatterRegisterStatus>('All');
  const [notice, setNotice] = React.useState<string | null>(null);
  const today = todayIso();

  const filtered = MOCK_MATTERS.filter((m) => (filter === 'All' || m.status === filter) && matchesSearch(m, query));

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 md:py-12 space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#111111]">Matter Registers</h1>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] mt-1">{SYNTHETIC_DATA_NOTICE}</p>
      </div>

      {notice && (
        <div className="p-4 bg-[#FBF6EA] border border-[#C6A253]/40 rounded-xl flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs font-semibold text-[#5C5340]">{notice}</p>
          <button onClick={() => setNotice(null)} className="text-xs font-bold text-[#B0A588] hover:text-[#8A7A56]" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {/* Search + filters — one compact area, no duplicate search bars */}
      <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 space-y-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search matter or case name, case number, party, court, or advocate reference..."
          aria-label="Search Matter Registers"
          className="w-full px-3 py-2 text-xs border border-[#E7DFC9] rounded-lg focus:outline-none focus:border-[#8A6D2F] bg-[#FBFAF6]"
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all ${
                filter === f ? 'bg-[#8A6D2F] border-[#8A6D2F] text-white' : 'bg-white border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white border border-[#E7DFC9]/80 rounded-xl">
          <p className="text-xs font-semibold text-[#8A7A56]">No Matter Registers match this search and filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((matter) => (
            <MatterCard key={matter.id} matter={matter} today={today} onNotice={setNotice} />
          ))}
        </div>
      )}
    </div>
  );
}
