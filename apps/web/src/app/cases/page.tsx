'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import BrandBackground from '@/components/BrandBackground';
import EmptyState from '@/components/EmptyState';
import { AuthOrReviewGate } from '@/components/ReviewModeNotice';
import CourtBadge from '@/components/CourtBadge';
import { COURT_FORUM_TYPES, COURT_FORUM_LABELS, type CourtForumType } from '@/lib/domain/court-note';
import { classifyCourtForumType } from '@/lib/domain/court-forum-colors';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

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
  // Only ever set true by a successful, unauthenticated GET /api/beta-status
  // — i.e. Product Review Mode is actually active right now. Governs
  // whether the "Authentication Required" wall below uses neutral review
  // wording instead of the normal sign-in wording; when review mode is off
  // this never becomes true and the wall is unchanged.
  const [reviewModeActive, setReviewModeActive] = useState(false);

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

  // Case Diary core workflow — the advocate returns from court and, for
  // each matter, records only: current stage, next hearing date, and a
  // short note. Saving posts to the same POST /api/cases/[id]/court-notes
  // every other Court-Note entry point already uses, which — since the
  // Phase 1 Matter-sync fix — keeps the Matter's current_stage,
  // next_hearing_date, timeline, tasks, and AI context in lockstep with no
  // duplicate entry, satisfying "the diary feeds the matter."
  const [activeHearingCaseId, setActiveHearingCaseId] = useState<string | null>(null);
  const [hearingStage, setHearingStage] = useState('');
  const [hearingNextDate, setHearingNextDate] = useState('');
  const [hearingNote, setHearingNote] = useState('');
  const [hearingCourtForumType, setHearingCourtForumType] = useState<CourtForumType>('OTHER');
  const [hearingCourtForumOther, setHearingCourtForumOther] = useState('');
  const [hearingNextActions, setHearingNextActions] = useState('');
  const [hearingShowMore, setHearingShowMore] = useState(false);
  const [hearingSaving, setHearingSaving] = useState(false);
  const [hearingError, setHearingError] = useState<string | null>(null);
  const [hearingSavedCaseId, setHearingSavedCaseId] = useState<string | null>(null);

  const fetchCases = useCallback(async (status: string) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const query = status === 'ALL' ? '' : `?status=${status}`;
      const res = await fetch(`/api/cases${query}`);
      if (res.status === 401) {
        setNeedsAuth(true);
        setCases([]);
        fetch('/api/beta-status')
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.enabled) setReviewModeActive(true);
          })
          .catch(() => {});
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

  const openHearingForm = (c: LegalCase) => {
    setActiveHearingCaseId(c.id);
    setHearingStage(c.stage || '');
    setHearingNextDate('');
    setHearingNote('');
    setHearingCourtForumType(classifyCourtForumType(c.court));
    setHearingCourtForumOther(c.court || '');
    setHearingNextActions('');
    setHearingShowMore(false);
    setHearingError(null);
  };

  const closeHearingForm = () => {
    setActiveHearingCaseId(null);
    setHearingError(null);
  };

  const handleSaveHearing = async (caseId: string) => {
    if (!hearingStage.trim() || !hearingNote.trim() || hearingSaving) return;
    if (hearingCourtForumType === 'OTHER' && !hearingCourtForumOther.trim()) {
      setHearingError('Enter the court/forum name.');
      return;
    }
    setHearingSaving(true);
    setHearingError(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/court-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hearing_date: todayISO(),
          next_hearing_date: hearingNextDate || null,
          court_forum_type: hearingCourtForumType,
          court_forum_other: hearingCourtForumType === 'OTHER' ? hearingCourtForumOther.trim() : null,
          stage: hearingStage.trim(),
          note: hearingNote.trim(),
          next_actions: hearingNextActions.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setHearingError(body?.message || 'Could not save the hearing. Please try again.');
        return;
      }
      setActiveHearingCaseId(null);
      setHearingSavedCaseId(caseId);
      setTimeout(() => setHearingSavedCaseId((current) => (current === caseId ? null : current)), 2500);
      fetchCases(selectedStatus);
    } catch {
      setHearingError('Network error — the hearing was not saved.');
    } finally {
      setHearingSaving(false);
    }
  };

  if (needsAuth) {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-20 text-center">
        <AuthOrReviewGate
          reviewModeActive={reviewModeActive}
          what="the Case Diary"
          authDescription="Sign in to view and manage litigation cases under your tenant."
        />
      </div>
    );
  }

  return (
    <div className="relative isolate flex-1 max-w-7xl w-full mx-auto px-6 py-10">
      <BrandBackground />
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
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#726B58] mb-4">
            Spawn New Case Workspace
          </h2>

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
                className="px-4 py-2 border border-[#E7DFC9] text-[#6F5624] text-xs font-bold uppercase rounded-lg hover:bg-[#FBF8F1]"
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
      <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 shadow-sm flex items-center flex-wrap gap-4 mb-8">
        <span className="text-xs font-bold uppercase tracking-widest text-[#726B58]">
          Filters:
        </span>

        <div className="flex flex-wrap gap-2">
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

      <datalist id="case-diary-stage-suggestions">
        {CASE_DIARY_STAGE_SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

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
                  <h2 className="font-bold text-sm text-[#111111] group-hover:text-[#8A6D2F] transition-colors line-clamp-2">
                    {c.title}
                  </h2>
                </div>

                <div className="space-y-1.5 text-xs text-[#6F5624] font-medium">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-[#726B58] uppercase font-bold tracking-wider">Forum:</span>
                    {c.court ? (
                      <CourtBadge court={c.court} />
                    ) : (
                      <span className="text-[#4A4130] text-right font-semibold">N/A</span>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[9px] text-[#726B58] uppercase font-bold tracking-wider">Judge:</span>
                    <span className="text-[#4A4130] text-right truncate max-w-[70%] font-semibold">{c.judge || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[9px] text-[#726B58] uppercase font-bold tracking-wider">Stage:</span>
                    <span className="text-[#4A4130] text-right font-semibold">{c.stage || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-[#F4EEE0] pt-4 mt-5 flex items-center justify-between">
                <div>
                  <span className="block text-[8px] font-bold text-[#726B58] uppercase tracking-widest">NEXT HEARING</span>
                  <span className="text-xs font-mono font-bold text-[#8A6D2F]">{c.hearing_date || 'N/A'}</span>
                </div>
                <Link
                  href={`/cases/${c.id}`}
                  className="text-xs font-bold uppercase tracking-wider text-[#8A6D2F] hover:text-[#6F5624]"
                >
                  Open Workspace →
                </Link>
              </div>

              {hearingSavedCaseId === c.id && (
                <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-center">
                  ✓ Hearing saved — Matter updated
                </p>
              )}

              {activeHearingCaseId === c.id ? (
                <div className="mt-4 pt-4 border-t border-dashed border-[#E7DFC9] space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#726B58]">
                    What happened today ({todayISO()})
                  </p>
                  <div>
                    <label htmlFor={`hearing-stage-${c.id}`} className="block text-[9px] font-bold text-[#726B58] uppercase tracking-widest mb-1">
                      Current Stage *
                    </label>
                    <input
                      id={`hearing-stage-${c.id}`}
                      type="text"
                      list="case-diary-stage-suggestions"
                      value={hearingStage}
                      onChange={(e) => setHearingStage(e.target.value)}
                      placeholder="e.g. Arguments"
                      className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-semibold text-[#3A3222]"
                    />
                  </div>
                  <div>
                    <label htmlFor={`hearing-next-date-${c.id}`} className="block text-[9px] font-bold text-[#726B58] uppercase tracking-widest mb-1">
                      Next Hearing Date
                    </label>
                    <input
                      id={`hearing-next-date-${c.id}`}
                      type="date"
                      value={hearingNextDate}
                      onChange={(e) => setHearingNextDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-semibold text-[#3A3222]"
                    />
                  </div>
                  <div>
                    <label htmlFor={`hearing-note-${c.id}`} className="block text-[9px] font-bold text-[#726B58] uppercase tracking-widest mb-1">
                      Short Note *
                    </label>
                    <textarea
                      id={`hearing-note-${c.id}`}
                      value={hearingNote}
                      onChange={(e) => setHearingNote(e.target.value)}
                      placeholder="What happened, any court direction..."
                      rows={2}
                      className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
                    />
                  </div>

                  {!hearingShowMore ? (
                    <button
                      type="button"
                      onClick={() => setHearingShowMore(true)}
                      className="text-[9px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline"
                    >
                      + Court / Reminder
                    </button>
                  ) : (
                    <>
                      <div>
                        <label htmlFor={`hearing-forum-${c.id}`} className="block text-[9px] font-bold text-[#726B58] uppercase tracking-widest mb-1">
                          Court / Forum
                        </label>
                        <select
                          id={`hearing-forum-${c.id}`}
                          value={hearingCourtForumType}
                          onChange={(e) => setHearingCourtForumType(e.target.value as CourtForumType)}
                          className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-semibold text-[#3A3222]"
                        >
                          {COURT_FORUM_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {COURT_FORUM_LABELS[type]}
                            </option>
                          ))}
                        </select>
                        {hearingCourtForumType === 'OTHER' && (
                          <input
                            type="text"
                            value={hearingCourtForumOther}
                            onChange={(e) => setHearingCourtForumOther(e.target.value)}
                            placeholder="Court/forum name"
                            aria-label="Other court/forum name"
                            className="w-full mt-1.5 px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
                          />
                        )}
                      </div>
                      <div>
                        <label htmlFor={`hearing-next-actions-${c.id}`} className="block text-[9px] font-bold text-[#726B58] uppercase tracking-widest mb-1">
                          Reminder / Next Action
                        </label>
                        <input
                          id={`hearing-next-actions-${c.id}`}
                          type="text"
                          value={hearingNextActions}
                          onChange={(e) => setHearingNextActions(e.target.value)}
                          placeholder="e.g. File rejoinder before next date"
                          className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
                        />
                      </div>
                    </>
                  )}

                  {hearingError && (
                    <p role="alert" className="text-[10px] font-bold text-red-600">
                      {hearingError}
                    </p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={closeHearingForm}
                      className="flex-1 px-3 py-2 border border-[#E7DFC9] text-[#6F5624] text-[10px] font-bold uppercase rounded-lg hover:bg-[#FBF8F1]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveHearing(c.id)}
                      disabled={!hearingStage.trim() || !hearingNote.trim() || hearingSaving}
                      className="flex-1 px-3 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-bold uppercase rounded-lg"
                    >
                      {hearingSaving ? 'Saving…' : 'Save Hearing'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openHearingForm(c)}
                  className="mt-3 w-full text-xs font-bold uppercase tracking-wider text-[#8A6D2F] border border-dashed border-[#E7DFC9] rounded-lg py-2 hover:border-[#8A6D2F] transition-colors"
                >
                  📝 Save Hearing
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={
            <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
              <g stroke="#8A6D2F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 9v22" />
                <path d="M14.5 31h11" />
                <path d="M11 13h18" />
                <path d="M13 13l-2.5 6h5L13 13z" />
                <path d="M9.5 19a3.5 3.5 0 0 0 7 0" />
                <path d="M27 13l-2.5 6h5L27 13z" />
                <path d="M23.5 19a3.5 3.5 0 0 0 7 0" />
              </g>
              <circle cx="20" cy="9" r="1.8" fill="#8A6D2F" />
            </svg>
          }
          title="No Active Cases"
          description="No litigation cases exist under the active tenant context. Spawn a new case to initiate the workspace."
          action={
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-all uppercase tracking-wider"
            >
              Initiate New Case
            </button>
          }
        />
      )}
    </div>
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
