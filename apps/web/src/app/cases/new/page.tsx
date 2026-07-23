'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CourtPicker } from '@/components/ecourts/CourtPicker';
import { AuthOrReviewGate } from '@/components/ReviewModeNotice';

const CASE_DIARY_STAGE_SUGGESTIONS = [
  'Admission',
  'Notice',
  'Written Statement',
  'Evidence',
  'Cross-Examination',
  'Arguments',
  'Order Reserved',
  'Judgment',
  'Disposed',
];

interface MatterOption {
  id: string;
  title: string;
  matter_number: string | null;
  client_name: string | null;
}

function NewCaseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillMatterId = searchParams.get('matter_id') || '';

  const [needsAuth, setNeedsAuth] = useState(false);
  const [reviewModeActive, setReviewModeActive] = useState(false);
  const [matters, setMatters] = useState<MatterOption[]>([]);

  const [title, setTitle] = useState('');
  const [matterId, setMatterId] = useState(prefillMatterId);
  const [countryCode, setCountryCode] = useState('IN');
  const [court, setCourt] = useState('');
  const [showCourtPicker, setShowCourtPicker] = useState(false);
  const [judge, setJudge] = useState('');
  const [stage, setStage] = useState('');
  const [hearingDate, setHearingDate] = useState('');
  const [caseStatus, setCaseStatus] = useState<'PENDING' | 'HEARING' | 'DISPOSED' | 'APPEAL'>('PENDING');
  const [notes, setNotes] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    // Populates the "Link to Matter" dropdown — a Proceeding created here
    // with no Matter selected stays a standalone LegalCase (a fully valid
    // state), it just won't feed a Matter's stage/hearing-date/timeline.
    let cancelled = false;
    fetch('/api/matters?limit=100')
      .then((res) => {
        if (res.status === 401) {
          setNeedsAuth(true);
          fetch('/api/beta-status')
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
              if (!cancelled && data?.enabled) setReviewModeActive(true);
            })
            .catch(() => {});
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data) => {
        if (cancelled || !data) return;
        setMatters(data.matters);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          country_code: countryCode,
          court: court || undefined,
          judge: judge || undefined,
          stage: stage || undefined,
          hearing_date: hearingDate || undefined,
          status: caseStatus,
          notes: notes || undefined,
          matter_id: matterId || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setSaveError(body?.message || 'Could not create the Proceeding. Please try again.');
        return;
      }
      const data = await res.json();
      router.push(`/cases/${data.case.id}`);
    } catch {
      setSaveError('Network error — the Proceeding was not created.');
    } finally {
      setIsSaving(false);
    }
  };

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans">
        <div className="flex-1 flex flex-col justify-center items-center py-20">
          <AuthOrReviewGate
            reviewModeActive={reviewModeActive}
            what="creating a new Proceeding"
            authDescription="Sign in to create a new Proceeding under your tenant."
            headingClassName="text-lg font-bold mt-2"
            bodyClassName="text-xs text-[#726B58] mt-1"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans selection:bg-[#8A6D2F] selection:text-white">
      <div className="flex-1 max-w-2xl w-full mx-auto px-6 py-10">
        <Link href="/cases" className="text-xs font-bold uppercase tracking-wider text-[#726B58] hover:text-[#8A6D2F] transition-colors">
          ← Back to Case Diary
        </Link>

        <h1 className="text-2xl font-black uppercase tracking-tight text-[#111111] mt-3 mb-1">New Proceeding</h1>
        <p className="text-xs text-[#6F5624] mb-6">
          Register a court Proceeding. Link it to a Matter so hearings recorded here keep that Matter&apos;s stage,
          next hearing date, and timeline up to date automatically.
        </p>

        <form onSubmit={handleSubmit} className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
              Proceeding Title *
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
              Link to Matter
            </label>
            <select
              value={matterId}
              onChange={(e) => setMatterId(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium text-[#3A3222]"
            >
              <option value="">No Matter — standalone Proceeding</option>
              {matters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                  {m.matter_number ? ` (${m.matter_number})` : ''}
                  {m.client_name ? ` — ${m.client_name}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                Initial Status
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
          </div>

          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={court}
                onChange={(e) => setCourt(e.target.value)}
                placeholder="Court / Forum"
                className="flex-1 min-w-0 px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium text-[#3A3222]"
              />
              <button
                type="button"
                onClick={() => setShowCourtPicker((v) => !v)}
                className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:text-[#6F5624]"
              >
                {showCourtPicker ? 'Close' : 'Find court →'}
              </button>
            </div>
            {showCourtPicker && (
              <div className="mt-3">
                <CourtPicker
                  onSelect={(name) => {
                    setCourt(name);
                    setShowCourtPicker(false);
                  }}
                  onCancel={() => setShowCourtPicker(false)}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                Next Hearing Date
              </label>
              <input
                type="date"
                value={hearingDate}
                onChange={(e) => setHearingDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium text-[#3A3222]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
              Current Procedural Stage
            </label>
            <input
              type="text"
              list="new-case-stage-suggestions"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              placeholder="e.g. Admission / Notice Stage"
              className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium text-[#3A3222]"
            />
            <datalist id="new-case-stage-suggestions">
              {CASE_DIARY_STAGE_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any immediate notes on this filing..."
              rows={3}
              className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] transition-all text-sm font-medium font-sans"
            />
          </div>

          {saveError && (
            <p role="alert" className="text-xs font-bold text-red-600">
              {saveError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/cases"
              className="px-4 py-2 border border-[#E7DFC9] text-[#6F5624] text-xs font-bold uppercase rounded-lg hover:bg-[#FBF8F1]"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!title.trim() || isSaving}
              className="px-5 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold uppercase rounded-lg shadow"
            >
              {isSaving ? 'Creating…' : 'Create Proceeding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewCasePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FDFBF7] flex justify-center items-center">
          <span className="w-8 h-8 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <NewCaseContent />
    </Suspense>
  );
}
