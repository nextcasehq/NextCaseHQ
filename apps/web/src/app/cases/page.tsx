'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';

interface LegalCase {
  id: string;
  title: string;
  case_number: string | null;
  country_code: string;
  status: 'PENDING' | 'HEARING' | 'DISPOSED' | 'APPEAL';
  court: string | null;
  judge: string | null;
  stage: string | null;
  hearing_date: string | null;
  notes: string | null;
}

function CasesChamberContent() {
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [countryCode, setCountryCode] = useState('IN');
  const [court, setCourt] = useState('');
  const [judge, setJudge] = useState('');
  const [stage, setStage] = useState('Filing Stage');
  const [hearingDate, setHearingDate] = useState('');
  const [caseStatus, setCaseStatus] = useState<'PENDING' | 'HEARING' | 'DISPOSED' | 'APPEAL'>('PENDING');
  const [notes, setNotes] = useState('');

  const fetchCases = useCallback(async (status: string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const query = status === 'ALL' ? '' : `?status=${status}`;
      const res = await fetch(`/api/cases${query}`);
      if (res.status === 401) {
        setNeedsAuth(true);
        setCases([]);
        return;
      }
      if (!res.ok) {
        setLoadError('Unable to load cases right now.');
        return;
      }
      const data = await res.json();
      setNeedsAuth(false);
      setCases(data.cases);
    } catch {
      setLoadError('Unable to reach the case management service.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCases(selectedStatus);
  }, [selectedStatus, fetchCases]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        country_code: countryCode,
        court,
        judge,
        stage,
        hearing_date: hearingDate || undefined,
        status: caseStatus,
        notes,
      }),
    });
    if (!res.ok) return;

    // Reset Form
    setTitle('');
    setCourt('');
    setJudge('');
    setNotes('');
    setShowCreateForm(false);
    fetchCases(selectedStatus);
  };

  if (needsAuth) {
    return (
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-20 text-center">
        <span className="text-3xl">🔒</span>
        <h3 className="text-base font-bold text-[#4A4130] mt-3">Authentication Required</h3>
        <p className="text-xs text-[#B0A588] mt-1 max-w-sm mx-auto">
          Sign in to view and manage litigation cases under your tenant.
        </p>
        <Link href="/login" className="inline-block mt-4 text-xs font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">
          Go to Login →
        </Link>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#E7DFC9]/60">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-[#111111]">
            Case Workspace Chamber
          </h1>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="self-start md:self-auto bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-semibold text-xs md:text-sm px-5 py-2.5 rounded-lg transition-all uppercase tracking-wider"
        >
          {showCreateForm ? 'Close Form' : 'Initiate New Case'}
        </button>
      </div>

      {/* Case Creation Form */}
      {showCreateForm && (
        <div className="mb-10 p-6 bg-white border border-[#E7DFC9]/80 rounded-xl shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#B0A588] mb-4">
            Spawn New Case Workspace
          </h3>

          <form onSubmit={handleCreateCase} className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium text-[#3A3222]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                Jurisdiction Pack *
              </label>
              <select
                required
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium text-[#3A3222]"
              >
                <option value="IN">IN (BNSS Compliant)</option>
                <option value="US">US (FRCP Compliant)</option>
                <option value="UK">UK (CPR Compliant)</option>
              </select>
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
                className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium text-[#3A3222]"
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
                className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium text-[#3A3222]"
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
                className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium text-[#3A3222]"
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
                className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium text-[#3A3222]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
                Initial Case Status
              </label>
              <select
                value={caseStatus}
                onChange={(e) => setCaseStatus(e.target.value as typeof caseStatus)}
                className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium text-[#3A3222]"
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
                className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium font-sans"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-[#E7DFC9] text-[#8A7A56] text-xs font-bold uppercase rounded-lg hover:bg-[#FBF8F1]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase rounded-lg shadow"
              >
                Spawn Case
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Section */}
      <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 shadow-sm flex items-center justify-between gap-4 mb-8">
        <span className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">
          Filters:
        </span>

        <div className="flex gap-2">
          {['ALL', 'PENDING', 'HEARING', 'DISPOSED', 'APPEAL'].map(status => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                selectedStatus === status
                  ? 'bg-[#8A6D2F] border-[#8A6D2F] text-white'
                  : 'bg-[#FBF8F1] hover:bg-[#F4EEE0] border-[#E7DFC9] text-[#5C5340]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-semibold text-center">
          {loadError}
        </div>
      )}

      {/* Cases Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="w-8 h-8 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : cases.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
          {cases.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-[#E7DFC9]/80 rounded-xl p-5 shadow-sm hover:border-[#E7DFC9] hover:shadow transition-all group flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] font-bold text-[#8A6D2F] bg-[#FBF6EA] px-2 py-0.5 rounded uppercase tracking-wider">
                    {c.id.slice(0, 8)}...
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
                  <h3 className="font-bold text-sm text-[#111111] group-hover:text-[#8A6D2F] transition-colors line-clamp-2">
                    {c.title}
                  </h3>
                </div>

                <div className="space-y-1.5 text-xs text-[#8A7A56] font-medium">
                  <div className="flex justify-between">
                    <span className="text-[9px] text-[#B0A588] uppercase font-bold tracking-wider">Forum:</span>
                    <span className="text-[#4A4130] text-right truncate max-w-[70%] font-semibold">{c.court || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[9px] text-[#B0A588] uppercase font-bold tracking-wider">Judge:</span>
                    <span className="text-[#4A4130] text-right truncate max-w-[70%] font-semibold">{c.judge || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[9px] text-[#B0A588] uppercase font-bold tracking-wider">Stage:</span>
                    <span className="text-[#4A4130] text-right font-semibold">{c.stage || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#F4EEE0] pt-4 mt-5 flex items-center justify-between">
                <div>
                  <span className="block text-[8px] font-bold text-[#B0A588] uppercase tracking-widest">NEXT HEARING</span>
                  <span className="text-xs font-mono font-bold text-[#8A6D2F]">{c.hearing_date || 'N/A'}</span>
                </div>
                <Link
                  href={`/cases/${c.id}`}
                  className="text-xs font-bold uppercase tracking-wider text-[#8A6D2F] hover:text-[#6F5624]"
                >
                  Open Workspace →
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-[#E7DFC9]/80 rounded-xl">
          <span className="text-3xl">⚖️</span>
          <h3 className="text-base font-bold text-[#4A4130] mt-3">No Active Cases</h3>
          <p className="text-xs text-[#B0A588] mt-1 max-w-sm mx-auto">
            No litigation cases exist under the active tenant context. Spawn a new case to initiate the workspace.
          </p>
        </div>
      )}
    </main>
  );
}

export default function CasesChamberPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans selection:bg-[#8A6D2F] selection:text-white">
      <Suspense fallback={
        <div className="flex-1 flex justify-center items-center">
          <span className="w-8 h-8 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
        </div>
      }>
        <CasesChamberContent />
      </Suspense>
    </div>
  );
}
