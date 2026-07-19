'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface LegalCase {
  id: string;
  title: string;
  status: 'PENDING' | 'HEARING' | 'DISPOSED' | 'APPEAL';
  court: string | null;
  judge: string | null;
  stage: string | null;
  hearing_date: string | null;
  notes: string | null;
}

interface CourtNote {
  id: string;
  hearing_date: string;
  next_hearing_date: string | null;
  court_forum_display: string;
  stage: string;
  note: string;
  next_actions: string | null;
  created_at: string;
}

export default function CaseWorkspaceDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [cCase, setCase] = useState<LegalCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [courtNotes, setCourtNotes] = useState<CourtNote[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/cases/${id}`);
        if (cancelled) return;
        if (res.status === 401) {
          setNeedsAuth(true);
          return;
        }
        if (!res.ok) {
          setCase(null);
          return;
        }
        const data = await res.json();
        setCase(data.case);
        setNotes(data.case.notes || '');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cases/${id}/court-notes`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setCourtNotes(data.court_notes);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSaveNotes = async () => {
    const res = await fetch(`/api/cases/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    if (res.ok) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex justify-center items-center">
        <span className="w-8 h-8 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans">
        <div className="flex-1 flex flex-col justify-center items-center py-20">
          <span className="text-3xl">🔒</span>
          <h2 className="text-lg font-bold mt-2">Authentication Required</h2>
          <p className="text-xs text-[#726B58] mt-1">Sign in to view this case workspace.</p>
          <Link href="/login" className="mt-4 text-xs font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">
            Go to Login →
          </Link>
        </div>
      </div>
    );
  }

  if (!cCase) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans">
        <div className="flex-1 flex flex-col justify-center items-center py-20">
          <span className="text-3xl">⚠️</span>
          <h2 className="text-lg font-bold mt-2">Case Workspace Not Found</h2>
          <p className="text-xs text-[#726B58] mt-1">This Case ID does not exist or you lack multi-tenant RLS clearance.</p>
          <Link href="/cases" className="mt-4 text-xs font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">
            Back to Case Workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans selection:bg-[#8A6D2F] selection:text-white">

      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/cases" className="text-xs font-bold uppercase tracking-wider text-[#726B58] hover:text-[#8A6D2F] transition-colors">
            ← Back to Case Workspace Chamber
          </Link>
        </div>

        {/* Case Title Card */}
        <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 md:p-8 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#8A6D2F] bg-[#FBF6EA] px-2 py-0.5 rounded uppercase tracking-wider">
                {cCase.id.slice(0, 8)}...
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                cCase.status === 'HEARING' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                cCase.status === 'DISPOSED' ? 'bg-green-50 text-green-700 border border-green-200' :
                'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}>
                {cCase.status}
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#111111]">
              {cCase.title}
            </h1>
          </div>

          <Link
            href={`/cases/${id}/court-note`}
            className="w-full md:w-auto text-center px-5 py-3 min-h-[48px] bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow"
          >
            Record Court Note
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Case Workspaces (Details, Timeline, Notes) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Core Field Details Panel */}
            <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58] mb-4">Litigation Panel Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">COURT / FORUM</span>
                  <span className="text-sm font-bold text-[#3A3222]">{cCase.court || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">JUDGE / CORAM</span>
                  <span className="text-sm font-bold text-[#3A3222]">{cCase.judge || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">PROCEDURAL STAGE</span>
                  <span className="text-sm font-bold text-[#8A6D2F] font-mono uppercase">{cCase.stage || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">NEXT HEARING DATE</span>
                  <span className="text-sm font-mono font-bold text-[#3A3222]">{cCase.hearing_date || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Case Timeline Placeholder */}
            <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58] mb-6">Case Chronology Timeline</h2>

              {/* Vertical Chronology Line */}
              <div className="relative pl-6 border-l-2 border-[#F4EEE0] space-y-6">
                <div className="relative">
                  {/* Point */}
                  <span className="absolute -left-[31px] top-1.5 w-4 h-4 bg-green-500 rounded-full border-4 border-white shadow-sm" />
                  <span className="text-[9px] font-mono font-bold text-green-800 block">12-Jan-2026</span>
                  <h3 className="font-bold text-sm text-[#3A3222]">Litigation Case Registered</h3>
                  <p className="text-xs text-[#6F5624] mt-1">Initial file ingestion completed successfully under RLS isolation.</p>
                </div>

                <div className="relative">
                  <span className="absolute -left-[31px] top-1.5 w-4 h-4 bg-[#A9843F] rounded-full border-4 border-white shadow-sm animate-pulse" />
                  <span className="text-[9px] font-mono font-bold text-[#8A6D2F] block">14-Jan-2026</span>
                  <h3 className="font-bold text-sm text-[#3A3222]">Pleadings Draft Compiled</h3>
                  <p className="text-xs text-[#6F5624] mt-1">First-draft petition loaded into the secure Drafting Canvas workspace.</p>
                </div>

                <div className="relative">
                  <span className="absolute -left-[31px] top-1.5 w-4 h-4 bg-[#CFC3A8] rounded-full border-4 border-white shadow-sm opacity-60" />
                  <span className="text-[9px] font-mono font-bold text-[#726B58] block">{cCase.hearing_date || 'TBD'}</span>
                  <h3 className="font-bold text-sm text-[#4A4130]">Admission Hearing Scheduled</h3>
                  <p className="text-xs text-[#726B58] mt-1">Awaiting argument presentation before {cCase.judge || 'the assigned judge'}.</p>
                </div>
              </div>
            </div>

            {/* Court Note History — real, append-only hearing records */}
            <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58] mb-4">Court Note History</h2>
              {courtNotes.length === 0 ? (
                <p className="text-xs font-semibold text-[#6F5624]">
                  No Court Notes recorded yet. Record one right after your next hearing.
                </p>
              ) : (
                <div className="space-y-4">
                  {courtNotes.map((cn) => (
                    <div key={cn.id} className="border-l-2 border-[#F4EEE0] pl-4">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-[9px] font-mono font-bold text-[#8A6D2F]">{cn.hearing_date}</span>
                        <span className="text-[10px] font-bold text-[#726B58] uppercase tracking-wider">{cn.stage}</span>
                        <span className="text-[10px] text-[#726B58]">· {cn.court_forum_display}</span>
                      </div>
                      <p className="text-xs text-[#3A3222] mt-1">{cn.note}</p>
                      {cn.next_actions && (
                        <p className="text-xs text-[#8A6D2F] font-semibold mt-1">Next: {cn.next_actions}</p>
                      )}
                      {cn.next_hearing_date && (
                        <p className="text-[10px] text-[#726B58] mt-1">Next hearing: {cn.next_hearing_date}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Notes Workspace Editor */}
            <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58]">Courtroom Notes Workspace</h2>
                {isSaved && (
                  <span className="text-xs text-green-800 font-bold font-sans">✓ Saved to Secure Ledger</span>
                )}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter live courtroom notes, tasks, or arguments presented..."
                rows={6}
                className="w-full p-4 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium font-mono text-[#3A3222]"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleSaveNotes}
                  className="px-5 py-2.5 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow"
                >
                  Save Notes to Ledger
                </button>
              </div>
            </div>

          </div>

          {/* Right Sidebar - Action & Integrations Panel */}
          <div className="space-y-6">
            {/* Future Modules Inbound Sync Slots */}
            <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58]">Integrated Litigation Slots</h2>

              <div className="p-3 border border-dashed border-[#E7DFC9] rounded-lg">
                <span className="block text-[8px] font-bold text-[#726B58] uppercase tracking-widest mb-1">EVIDENCE LEDGER (P1)</span>
                <span className="text-xs font-semibold text-[#4A4130]">0 Ingested Exhibits</span>
              </div>

              <div className="p-3 border border-dashed border-[#E7DFC9] rounded-lg">
                <span className="block text-[8px] font-bold text-[#726B58] uppercase tracking-widest mb-1">AI CHAMBER INTEL (P1)</span>
                <span className="text-xs font-semibold text-[#4A4130]">Awaiting Case Activation</span>
              </div>

              <div className="p-3 border border-dashed border-[#E7DFC9] rounded-lg">
                <span className="block text-[8px] font-bold text-[#726B58] uppercase tracking-widest mb-1">DRAFT CO-PILOT CANVAS</span>
                <span className="text-xs font-semibold text-[#4A4130]">Awaiting Template Binding</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
