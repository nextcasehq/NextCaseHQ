'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import EmptyState from '@/components/EmptyState';
import LegalSearchWorkspace from './legal-search-workspace';
import { LowBalanceBanner } from '@/components/ai-credits/credits-popover';

interface RecentMatter {
  id: string;
  title: string;
  matter_number: string | null;
  status: string;
  client_name: string | null;
  court: string | null;
  bench: string | null;
}

interface LegalCaseSummary {
  id: string;
  title: string;
  case_number: string | null;
  status: string;
  court: string | null;
  stage: string | null;
  hearing_date: string | null;
  matter_id: string | null;
}

/** Today's date as YYYY-MM-DD in the browser's local timezone (not UTC, unlike toISOString). */
function todayIso(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function formatDate(value: string): string {
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** True when a hearing date is today or within the next 3 days. */
function isUrgent(hearingDate: string | null, today: string): boolean {
  if (!hearingDate) return false;
  const diffDays = Math.round((new Date(`${hearingDate}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000);
  return diffDays >= 0 && diffDays <= 3;
}

interface MatterActionsMenuProps {
  matterId: string;
  onArgumentsEvidence: () => void;
}

/** Compact per-Matter-Register action menu — Open Matter, Draft Document,
 * Upload Document, Next Hearing & Stage, Arguments & Evidence — kept as a
 * dropdown rather than five inline buttons so the card stays uncluttered. */
function MatterActionsMenu({ matterId, onArgumentsEvidence }: MatterActionsMenuProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

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
        <div role="menu" className="absolute right-0 top-full mt-1 w-56 bg-white border border-[#E7DFC9] rounded-xl shadow-xl z-30 py-1.5">
          <Link href={`/matters/${matterId}`} role="menuitem" onClick={() => setOpen(false)} className="block px-4 py-2 text-xs font-semibold text-[#3A3222] hover:bg-[#FBF8F1] transition-colors">
            Open Matter
          </Link>
          <Link href="/prototypes/draft-document" role="menuitem" onClick={() => setOpen(false)} className="block px-4 py-2 text-xs font-semibold text-[#3A3222] hover:bg-[#FBF8F1] transition-colors">
            Draft Document
          </Link>
          <Link href="/prototypes/draft-document" role="menuitem" onClick={() => setOpen(false)} className="block px-4 py-2 text-xs font-semibold text-[#3A3222] hover:bg-[#FBF8F1] transition-colors">
            Upload Document
          </Link>
          <Link href="/prototypes/next-hearing-stage" role="menuitem" onClick={() => setOpen(false)} className="block px-4 py-2 text-xs font-semibold text-[#3A3222] hover:bg-[#FBF8F1] transition-colors">
            Next Hearing &amp; Stage
          </Link>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onArgumentsEvidence();
            }}
            className="w-full text-left px-4 py-2 text-xs font-semibold text-[#3A3222] hover:bg-[#FBF8F1] transition-colors bg-transparent border-none outline-none cursor-pointer"
          >
            Arguments &amp; Evidence
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Dashboard launch page — restructured around Matter Registers as the
 * primary focus, action-oriented Quick Actions, and a compact Today's
 * Cases list. The top-bar Search/Notifications/AI Credits/Profile controls
 * live in dashboard/layout.tsx; this page does not duplicate search.
 *
 * "Draft a Document," "Upload / Link a Document," and "Next Hearing &
 * Stage" all open the already-merged /prototypes/* routes rather than a
 * new implementation — those routes remain clearly labelled prototypes
 * (simulated AI, no real uploads, local/session state only) even when
 * reached from this real, authenticated dashboard.
 *
 * Current Stage / Next Hearing / Case Number enrichment on each Matter
 * Register card comes from the real, existing /api/cases endpoint (the
 * LegalCase records linked to that Matter via matter_id) — no new API
 * surface was added. Today's Cases is the same /api/cases data, filtered
 * client-side to hearing_date === today. "Arguments & Evidence" has no
 * implementation anywhere yet (prototype or production), so it shows a
 * neutral not-yet-available message rather than a fabricated workflow.
 *
 * Legal Search is the primary main-workspace section, reusing the real,
 * existing GET /api/search endpoint (see legal-search-workspace.tsx) rather
 * than recreating the deleted /dashboard/search demo page. The top bar's
 * search stays general matter/document navigation to the real /search page
 * (Top-Bar Search Rule, option B) — the Legal Search workspace's own input
 * is labelled "Search Judgments & Citations" so the two are never confused
 * for duplicate, identical search bars.
 */
function DashboardPageContent() {
  const searchParams = useSearchParams();
  const initialLegalSearchQuery = searchParams.get('q') ?? '';
  const [recentMatters, setRecentMatters] = React.useState<RecentMatter[] | null>(null);
  const [cases, setCases] = React.useState<LegalCaseSummary[] | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/matters?limit=6')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setRecentMatters(data?.matters ?? []);
      })
      .catch(() => {
        if (!cancelled) setRecentMatters([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/cases?limit=100')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setCases(data?.cases ?? []);
      })
      .catch(() => {
        if (!cancelled) setCases([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const casesByMatter = React.useMemo(() => {
    const map = new Map<string, LegalCaseSummary[]>();
    for (const c of cases || []) {
      if (!c.matter_id) continue;
      const list = map.get(c.matter_id) || [];
      list.push(c);
      map.set(c.matter_id, list);
    }
    return map;
  }, [cases]);

  const today = todayIso();

  const todaysCases = React.useMemo(() => (cases || []).filter((c) => c.hearing_date === today), [cases, today]);

  function relevantCaseFor(matterId: string): LegalCaseSummary | null {
    const list = casesByMatter.get(matterId);
    if (!list || list.length === 0) return null;
    const upcoming = list
      .filter((c) => c.hearing_date && c.hearing_date >= today)
      .sort((a, b) => (a.hearing_date! < b.hearing_date! ? -1 : 1));
    return upcoming[0] || list[0];
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 md:py-12 space-y-8">
      <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#111111]">Dashboard</h1>

      <LowBalanceBanner />

      {notice && (
        <div className="p-4 bg-[#FBF6EA] border border-[#C6A253]/40 rounded-xl flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs font-semibold text-[#5C5340]">{notice}</p>
          <button onClick={() => setNotice(null)} className="text-xs font-bold text-[#B0A588] hover:text-[#8A7A56]" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {/* Responsive composition: mobile/tablet order is Search -> Quick
          Actions -> Today's Cases -> Matter Registers; desktop order is
          Quick Actions -> Legal Search (the wide, primary workspace) ->
          Matter Registers -> Today's Cases. Using flex + order utilities
          rather than duplicating markup per breakpoint. */}
      <div className="flex flex-col gap-8">
        {/* Quick Actions */}
        <section className="order-2 lg:order-1">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link href="/prototypes/draft-document" className="bg-white border border-[#E7DFC9]/80 rounded-xl p-5 hover:border-[#8A6D2F] hover:shadow transition-all space-y-1.5">
              <span className="text-2xl" aria-hidden="true">📝</span>
              <p className="text-sm font-bold text-[#111111]">Draft a Document</p>
              <p className="text-[10px] text-[#8A7A56]">Prototype flow — template or blank draft, linked to a Matter Register.</p>
            </Link>
            <Link href="/prototypes/draft-document" className="bg-white border border-[#E7DFC9]/80 rounded-xl p-5 hover:border-[#8A6D2F] hover:shadow transition-all space-y-1.5">
              <span className="text-2xl" aria-hidden="true">📄</span>
              <p className="text-sm font-bold text-[#111111]">Upload / Link a Document</p>
              <p className="text-[10px] text-[#8A7A56]">Prototype flow — upload an existing document or link it to a matter.</p>
            </Link>
            <Link href="/prototypes/next-hearing-stage" className="bg-white border border-[#E7DFC9]/80 rounded-xl p-5 hover:border-[#8A6D2F] hover:shadow transition-all space-y-1.5">
              <span className="text-2xl" aria-hidden="true">📅</span>
              <p className="text-sm font-bold text-[#111111]">Next Hearing &amp; Stage</p>
              <p className="text-[10px] text-[#8A7A56]">Prototype flow — track hearings and stage by court category.</p>
            </Link>
          </div>
        </section>

        {/* Legal Search — the primary, wide main workspace */}
        <section className="order-1 lg:order-2">
          <LegalSearchWorkspace initialQuery={initialLegalSearchQuery} onNotice={setNotice} />
        </section>

        {/* Matter Registers — supporting section, still clearly accessible */}
        <section className="order-4 lg:order-3">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <h2 className="text-sm font-black uppercase tracking-widest text-[#111111]">Matter Registers</h2>
          <div className="flex items-center gap-4">
            <Link href="/dashboard/matters" className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">
              Explore Matter Register Workspace →
            </Link>
            <Link href="/matters" className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">
              View All →
            </Link>
          </div>
        </div>
        {recentMatters === null ? (
          <div className="flex justify-center py-10">
            <span className="w-6 h-6 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
          </div>
        ) : recentMatters.length === 0 ? (
          <EmptyState
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#8A6D2F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
              </svg>
            }
            title="No Matter Registers Yet"
            description="Create your first Matter to start working."
            action={
              <Link href="/matters" className="inline-block bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-all uppercase tracking-wider">
                New Matter
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recentMatters.map((matter) => {
              const relevantCase = relevantCaseFor(matter.id);
              const urgent = isUrgent(relevantCase?.hearing_date ?? null, today);
              const caseNumber = relevantCase?.case_number || matter.matter_number || 'Not yet assigned';
              const courtDisplay = relevantCase?.court || matter.court || 'Not yet provided';
              const stageDisplay = relevantCase?.stage || 'Not tracked yet';
              const nextHearingDisplay =
                relevantCase?.hearing_date && relevantCase.hearing_date >= today ? formatDate(relevantCase.hearing_date) : 'Not tracked yet';

              return (
                <div key={matter.id} className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 shadow-sm hover:border-[#E7DFC9] hover:shadow transition-all space-y-3 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/matters/${matter.id}`} className="font-bold text-sm text-[#111111] hover:text-[#8A6D2F] transition-colors truncate block">
                        {matter.title}
                      </Link>
                      <p className="text-[10px] text-[#B0A588] font-bold uppercase tracking-wider mt-0.5 truncate">
                        {matter.client_name || 'Not yet linked'}
                      </p>
                    </div>
                    {urgent && (
                      <span className="flex-none text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                        Urgent
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[#8A7A56]">Case Number</p>
                      <p className="text-[#3A3222] font-semibold truncate">{caseNumber}</p>
                    </div>
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[#8A7A56]">Court{matter.bench ? ' / Bench' : ''}</p>
                      <p className="text-[#3A3222] font-semibold truncate">
                        {courtDisplay}
                        {matter.bench ? ` — ${matter.bench}` : ''}
                      </p>
                    </div>
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[#8A7A56]">Current Stage</p>
                      <p className="text-[#3A3222] font-semibold truncate">{stageDisplay}</p>
                    </div>
                    <div>
                      <p className="font-bold uppercase tracking-wider text-[#8A7A56]">Next Hearing</p>
                      <p className="text-[#3A3222] font-semibold truncate">{nextHearingDisplay}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#F4EEE0]">
                    <Link href={`/matters/${matter.id}`} className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:text-[#6F5624]">
                      Open Matter →
                    </Link>
                    <MatterActionsMenu
                      matterId={matter.id}
                      onArgumentsEvidence={() => setNotice('Prepare Arguments & Evidence is not yet available for this matter.')}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

        {/* Today's Cases — compact list, real data, no charts/analytics */}
        <section className="order-3 lg:order-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-4">Today&apos;s Cases</h2>
        {cases === null ? (
          <div className="flex justify-center py-8">
            <span className="w-6 h-6 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
          </div>
        ) : todaysCases.length === 0 ? (
          <div className="text-center py-8 bg-white border border-[#E7DFC9]/80 rounded-xl">
            <p className="text-xs font-semibold text-[#8A7A56]">No cases with a hearing scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todaysCases.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 bg-white border border-[#E7DFC9]/80 rounded-xl p-3 min-w-0">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#111111] truncate">{c.title}</p>
                  <p className="text-[10px] text-[#8A7A56] mt-0.5 truncate">
                    {c.case_number || 'No case number'} · {c.court || 'Court not provided'} · {c.stage || 'Stage not confirmed'}
                  </p>
                </div>
                {c.matter_id ? (
                  <Link href={`/matters/${c.matter_id}`} className="flex-none text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">
                    Open Matter →
                  </Link>
                ) : (
                  <span className="flex-none text-[10px] font-bold uppercase tracking-wider text-[#B0A588]">No Matter Linked</span>
                )}
              </div>
            ))}
          </div>
        )}
        </section>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center py-20">
          <span className="w-8 h-8 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
        </div>
      }
    >
      <DashboardPageContent />
    </Suspense>
  );
}
