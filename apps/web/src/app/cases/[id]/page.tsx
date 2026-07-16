'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { LitigationDb, Case, Matter } from '@/lib/db/litigation-db';

export default function CaseWorkspaceDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [cCase, setCase] = useState<Case | undefined>(undefined);
  const [matter, setMatter] = useState<Matter | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchedCase = LitigationDb.getCase(id);
    if (fetchedCase) {
      setCase(fetchedCase);
      setNotes(fetchedCase.notes);

      const parentMatter = LitigationDb.getMatter(fetchedCase.matterId);
      setMatter(parentMatter);
    }
  }, [id]);

  if (!cCase) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans">
        <Navbar />
        <main className="flex-1 flex flex-col justify-center items-center py-20">
          <span className="text-3xl">⚠️</span>
          <h2 className="text-lg font-bold mt-2">Case Workspace Not Found</h2>
          <p className="text-xs text-neutral-400 mt-1">This Case ID does not exist or you lack multi-tenant RLS clearance.</p>
          <Link href="/cases" className="mt-4 text-xs font-bold uppercase tracking-wider text-indigo-600 hover:underline">
            Back to Case Workspace
          </Link>
        </main>
      </div>
    );
  }

  const handleSaveNotes = () => {
    const updated = LitigationDb.updateCase(id, { notes });
    if (updated) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/cases" className="text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-indigo-600 transition-colors">
            ← Back to Case Workspace Chamber
          </Link>
        </div>

        {/* Case Title Card */}
        <div className="bg-white border border-neutral-200/80 rounded-xl p-6 md:p-8 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                {cCase.id}
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

            {matter && (
              <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">
                Bound Parent Matter:{' '}
                <Link href={`/matters/${matter.id}`} className="text-indigo-600 hover:underline">
                  {matter.id} // {matter.title} ({matter.clientName})
                </Link>
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Case Workspaces (Details, Timeline, Notes) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Core Field Details Panel */}
            <div className="bg-white border border-neutral-200/80 rounded-xl p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Litigation Panel Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">COURT / FORUM</span>
                  <span className="text-sm font-bold text-neutral-800">{cCase.court}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">JUDGE / CORAM</span>
                  <span className="text-sm font-bold text-neutral-800">{cCase.judge}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">PROCEDURAL STAGE</span>
                  <span className="text-sm font-bold text-indigo-600 font-mono uppercase">{cCase.stage}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">NEXT HEARING DATE</span>
                  <span className="text-sm font-mono font-bold text-neutral-800">{cCase.hearingDate || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Case Timeline Placeholder */}
            <div className="bg-white border border-neutral-200/80 rounded-xl p-6 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-6">Case Chronology Timeline</h3>

              {/* Vertical Chronology Line */}
              <div className="relative pl-6 border-l-2 border-neutral-100 space-y-6">
                <div className="relative">
                  {/* Point */}
                  <span className="absolute -left-[31px] top-1.5 w-4 h-4 bg-green-500 rounded-full border-4 border-white shadow-sm" />
                  <span className="text-[9px] font-mono font-bold text-green-600 block">12-Jan-2026</span>
                  <h4 className="font-bold text-sm text-neutral-800">Litigation Case Registered</h4>
                  <p className="text-xs text-neutral-500 mt-1">Initial file ingestion completed successfully under RLS isolation.</p>
                </div>

                <div className="relative">
                  <span className="absolute -left-[31px] top-1.5 w-4 h-4 bg-indigo-500 rounded-full border-4 border-white shadow-sm animate-pulse" />
                  <span className="text-[9px] font-mono font-bold text-indigo-600 block">14-Jan-2026</span>
                  <h4 className="font-bold text-sm text-neutral-800">Pleadings Draft Compiled</h4>
                  <p className="text-xs text-neutral-500 mt-1">First-draft petition loaded into the secure Drafting Canvas workspace.</p>
                </div>

                <div className="relative opacity-60">
                  <span className="absolute -left-[31px] top-1.5 w-4 h-4 bg-neutral-300 rounded-full border-4 border-white shadow-sm" />
                  <span className="text-[9px] font-mono font-bold text-neutral-400 block">{cCase.hearingDate || 'TBD'}</span>
                  <h4 className="font-bold text-sm text-neutral-700">Admission Hearing Scheduled</h4>
                  <p className="text-xs text-neutral-400 mt-1">Awaiting argument presentation before {cCase.judge}.</p>
                </div>
              </div>
            </div>

            {/* Active Notes Workspace Editor */}
            <div className="bg-white border border-neutral-200/80 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Courtroom Notes Workspace</h3>
                {isSaved && (
                  <span className="text-xs text-green-600 font-bold font-sans">✓ Saved to Secure Ledger</span>
                )}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter live courtroom notes, tasks, or arguments presented..."
                rows={6}
                className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-indigo-600 text-sm font-medium font-mono text-neutral-800"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleSaveNotes}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow"
                >
                  Save Notes to Ledger
                </button>
              </div>
            </div>

          </div>

          {/* Right Sidebar - Action & Integrations Panel */}
          <div className="space-y-6">
            {/* Future Modules Inbound Sync Slots */}
            <div className="bg-white border border-neutral-200/80 rounded-xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Integrated Litigation Slots</h3>

              <div className="p-3 border border-dashed border-neutral-200 rounded-lg opacity-60">
                <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1">EVIDENCE LEDGER (P1)</span>
                <span className="text-xs font-semibold text-neutral-700">0 Ingested Exhibits</span>
              </div>

              <div className="p-3 border border-dashed border-neutral-200 rounded-lg opacity-60">
                <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1">AI CHAMBER INTEL (P1)</span>
                <span className="text-xs font-semibold text-neutral-700">Awaiting Case Activation</span>
              </div>

              <div className="p-3 border border-dashed border-neutral-200 rounded-lg opacity-60">
                <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1">DRAFT CO-PILOT CANVAS</span>
                <span className="text-xs font-semibold text-neutral-700">Awaiting Template Binding</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
