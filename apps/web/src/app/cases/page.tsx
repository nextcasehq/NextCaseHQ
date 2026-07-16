'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LitigationDb, Case, Matter } from '@/lib/db/litigation-db';

function CasesChamberContent() {
  const searchParams = useSearchParams();
  const preMatterId = searchParams.get('preMatterId');

  const [cases, setCases] = useState<Case[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [tenantId, setTenantId] = useState('');

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [matterId, setMatterId] = useState('');
  const [title, setTitle] = useState('');
  const [court, setCourt] = useState('');
  const [judge, setJudge] = useState('');
  const [stage, setStage] = useState('Filing Stage');
  const [hearingDate, setHearingDate] = useState('');
  const [caseStatus, setCaseStatus] = useState<'PENDING' | 'HEARING' | 'DISPOSED' | 'APPEAL'>('PENDING');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setTenantId(LitigationDb.getTenantId());
    setCases(LitigationDb.getCases());

    const activeMatters = LitigationDb.getMatters();
    setMatters(activeMatters);

    if (preMatterId) {
      setMatterId(preMatterId);
      setShowCreateForm(true);
    } else if (activeMatters.length > 0) {
      setMatterId(activeMatters[0].id);
    }
  }, [preMatterId]);

  const handleRefresh = () => {
    setCases(LitigationDb.getCases());
  };

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matterId || !title) return;

    LitigationDb.createCase({
      matterId,
      title,
      court,
      judge,
      stage,
      hearingDate,
      status: caseStatus,
      notes
    });

    // Reset Form
    setTitle('');
    setCourt('');
    setJudge('');
    setNotes('');
    setShowCreateForm(false);
    handleRefresh();
  };

  const filteredCases = cases.filter(c => {
    return selectedStatus === 'ALL' || c.status === selectedStatus;
  });

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-neutral-200/60">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-[#111111]">
            Case Workspace Chamber
          </h1>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mt-1">
            Active Tenant Context: <span className="font-mono text-indigo-600">{tenantId.slice(0, 8)}...</span>
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="self-start md:self-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs md:text-sm px-5 py-2.5 rounded-lg transition-all uppercase tracking-wider"
        >
          {showCreateForm ? 'Close Form' : 'Initiate New Case'}
        </button>
      </div>

      {/* Case Creation Form */}
      {showCreateForm && (
        <div className="mb-10 p-6 bg-white border border-neutral-200/80 rounded-xl shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-4">
            Spawn New Case Workspace
          </h3>

          {matters.length === 0 ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs rounded-lg font-semibold text-center">
              ⚠️ No Active Matters exist in this tenant. You must create at least one Matter before spawning a litigation case workspace.
            </div>
          ) : (
            <form onSubmit={handleCreateCase} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                  Linked Parent Matter *
                </label>
                <select
                  required
                  value={matterId}
                  onChange={(e) => setMatterId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-indigo-600 text-sm font-medium text-neutral-800"
                >
                  {matters.map(m => (
                    <option key={m.id} value={m.id}>{m.id} // {m.title} ({m.clientName})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                  Case Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Delhi High Court Writ Suit No. 132/2026"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-indigo-600 transition-all text-sm font-medium text-neutral-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                  Court / Forum
                </label>
                <input
                  type="text"
                  value={court}
                  onChange={(e) => setCourt(e.target.value)}
                  placeholder="e.g. Delhi High Court (Bench III)"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-indigo-600 transition-all text-sm font-medium text-neutral-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                  Judge / Coram
                </label>
                <input
                  type="text"
                  value={judge}
                  onChange={(e) => setJudge(e.target.value)}
                  placeholder="e.g. Honble Justice"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-indigo-600 transition-all text-sm font-medium text-neutral-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                  Current Procedural Stage
                </label>
                <input
                  type="text"
                  value={stage}
                  onChange={(e) => setStage(e.target.value)}
                  placeholder="e.g. Admission / Notice Stage"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-indigo-600 transition-all text-sm font-medium text-neutral-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                  Next Hearing Date
                </label>
                <input
                  type="date"
                  value={hearingDate}
                  onChange={(e) => setHearingDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-indigo-600 transition-all text-sm font-medium text-neutral-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                  Initial Case Status
                </label>
                <select
                  value={caseStatus}
                  onChange={(e) => setCaseStatus(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-indigo-600 text-sm font-medium text-neutral-800"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="HEARING">HEARING</option>
                  <option value="DISPOSED">DISPOSED</option>
                  <option value="APPEAL">APPEAL</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                  Procedural Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter immediate notes, courtroom tasks or next actions..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-indigo-600 text-sm font-medium font-sans"
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-500 text-xs font-bold uppercase rounded-lg hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase rounded-lg shadow"
                >
                  Spawn Case
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Filter Section */}
      <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-sm flex items-center justify-between gap-4 mb-8">
        <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
          Filters:
        </span>

        <div className="flex gap-2">
          {['ALL', 'PENDING', 'HEARING', 'DISPOSED', 'APPEAL'].map(status => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                selectedStatus === status
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-600'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Cases Grid */}
      {filteredCases.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
          {filteredCases.map((c) => {
            const pMatter = matters.find(m => m.id === c.matterId);
            return (
              <div
                key={c.id}
                className="bg-white border border-neutral-200/80 rounded-xl p-5 shadow-sm hover:border-indigo-200 hover:shadow transition-all group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                      {c.id}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      c.status === 'HEARING' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                      c.status === 'DISPOSED' ? 'bg-green-50 text-green-700 border border-green-200' :
                      c.status === 'APPEAL' ? 'bg-red-50 text-red-700 border border-red-200' :
                      'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-[#111111] group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {c.title}
                    </h3>
                    {pMatter && (
                      <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-1">
                        Parent Matter: {pMatter.id} // {pMatter.clientName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-neutral-500 font-medium">
                    <div className="flex justify-between">
                      <span className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider">Forum:</span>
                      <span className="text-neutral-700 text-right truncate max-w-[70%] font-semibold">{c.court}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider">Judge:</span>
                      <span className="text-neutral-700 text-right truncate max-w-[70%] font-semibold">{c.judge}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[9px] text-neutral-400 uppercase font-bold tracking-wider">Stage:</span>
                      <span className="text-neutral-700 text-right font-semibold">{c.stage}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-neutral-100 pt-4 mt-5 flex items-center justify-between">
                  <div>
                    <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-widest">NEXT HEARING</span>
                    <span className="text-xs font-mono font-bold text-indigo-600">{c.hearingDate || 'N/A'}</span>
                  </div>
                  <Link
                    href={`/cases/${c.id}`}
                    className="text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700"
                  >
                    Open Workspace →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-neutral-200/80 rounded-xl">
          <span className="text-3xl">⚖️</span>
          <h3 className="text-base font-bold text-neutral-700 mt-3">No Active Cases</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            No litigation cases exist under the active tenant context. Spawn a new case to initiate the workspace.
          </p>
        </div>
      )}
    </main>
  );
}

export default function CasesChamberPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      <Suspense fallback={
        <div className="flex-1 flex justify-center items-center">
          <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        </div>
      }>
        <CasesChamberContent />
      </Suspense>
    </div>
  );
}
