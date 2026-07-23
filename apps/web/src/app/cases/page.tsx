'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import BrandBackground from '@/components/BrandBackground';
import EmptyState from '@/components/EmptyState';
import { AuthOrReviewGate } from '@/components/ReviewModeNotice';
import CourtBadge from '@/components/CourtBadge';
import {
  COURT_FORUM_TYPES,
  COURT_FORUM_LABELS,
  HEARING_OUTCOMES,
  HEARING_OUTCOME_LABELS,
  type CourtForumType,
  type HearingOutcome,
} from '@/lib/domain/court-note';
import { classifyCourtForumType, courtForumColorFor } from '@/lib/domain/court-forum-colors';

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
  matter_id: string | null;
  matter_title: string | null;
  client_name: string | null;
  updated_at: string;
  latest_hearing_outcome: HearingOutcome | null;
}

/**
 * Case Diary daily-bucket assignment. A Proceeding falls into exactly one
 * bucket, checked in this order (most specific/actionable first):
 *  1. Adjourned today — a Court Note was saved today and its outcome was
 *     ADJOURNED. The single most "needs follow-up" state.
 *  2. Today's Hearings — next hearing date is today and it hasn't been
 *     actioned yet today (once Save Hearing runs, hearing_date moves off
 *     today automatically, so this bucket naturally empties as the day
 *     goes on rather than needing separate "done" tracking).
 *  3. Completed today — a Court Note was saved today with any other
 *     outcome (conducted/disposed/etc.).
 *  4. Upcoming — a future hearing date, not yet due.
 *  5. Neither — no hearing_date, or last touched on an earlier day; these
 *     stay out of the daily view entirely and are only reachable through
 *     the "All Proceedings" section's filters/search below.
 */
type DailyBucket = 'adjourned' | 'today' | 'completed' | 'upcoming' | 'other';

function bucketFor(c: LegalCase, today: string): DailyBucket {
  const updatedToday = c.updated_at.slice(0, 10) === today;
  if (updatedToday && c.latest_hearing_outcome === 'ADJOURNED') return 'adjourned';
  if (c.hearing_date === today) return 'today';
  if (updatedToday) return 'completed';
  if (c.hearing_date && c.hearing_date > today) return 'upcoming';
  return 'other';
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

  // Case Diary core workflow — the advocate returns from court and, for
  // each matter, records only: current stage, next hearing date, and a
  // short note. Saving posts to the same POST /api/cases/[id]/court-notes
  // every other Court-Note entry point already uses, which — since the
  // Phase 1 Matter-sync fix — keeps the Matter's current_stage,
  // next_hearing_date, timeline, tasks, and AI context in lockstep with no
  // duplicate entry, satisfying "the diary feeds the matter."
  const [activeHearingCaseId, setActiveHearingCaseId] = useState<string | null>(null);
  const [hearingStage, setHearingStage] = useState('');
  const [hearingOutcome, setHearingOutcome] = useState<HearingOutcome>('CONDUCTED');
  const [hearingNextDate, setHearingNextDate] = useState('');
  const [hearingNote, setHearingNote] = useState('');
  const [hearingCourtForumType, setHearingCourtForumType] = useState<CourtForumType>('OTHER');
  const [hearingCourtForumOther, setHearingCourtForumOther] = useState('');
  const [hearingNextActions, setHearingNextActions] = useState('');
  const [hearingShowMore, setHearingShowMore] = useState(false);
  const [hearingSaving, setHearingSaving] = useState(false);
  const [hearingError, setHearingError] = useState<string | null>(null);
  const [hearingSavedCaseId, setHearingSavedCaseId] = useState<string | null>(null);

  // "All Proceedings" (the pre-existing status-filtered grid) is collapsed
  // by default — the daily-diary sections above are the primary screen;
  // older/all-time Proceedings stay reachable but never dominate first
  // paint (see the architectural directive this responds to).
  const [showAllProceedings, setShowAllProceedings] = useState(false);

  // Always fetches the full, unfiltered set — the daily-diary sections
  // below need every Proceeding regardless of status (a disposed matter's
  // last hearing today still belongs in "Completed Hearings"). selectedStatus
  // now only filters the collapsed "All Proceedings" section, client-side,
  // so toggling it there never requires a second round trip.
  const fetchCases = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/cases?limit=100`);
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
    fetchCases();
  }, [fetchCases]);

  const openHearingForm = (c: LegalCase) => {
    setActiveHearingCaseId(c.id);
    setHearingStage(c.stage || '');
    setHearingOutcome('CONDUCTED');
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
          hearing_outcome: hearingOutcome,
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
      fetchCases();
    } catch {
      setHearingError('Network error — the hearing was not saved.');
    } finally {
      setHearingSaving(false);
    }
  };

  function renderCaseCard(c: LegalCase) {
    const courtColor = courtForumColorFor(c.court);
    return (
      <div
        key={c.id}
        style={{ borderLeftColor: courtColor.border }}
        className="bg-white border border-[#E7DFC9]/80 border-l-4 rounded-2xl shadow-sm hover:border-[#E7DFC9] hover:shadow transition-all group"
      >
        {/* Horizontal strip — every field laid out left-to-right in one
            row instead of stacked in a tall box, so many Proceedings scan
            in the same vertical space a handful of card-grid boxes used
            to take. Wraps to a compact stack only below md. */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-5 px-5 py-4">
          <span className={`shrink-0 self-start md:self-auto text-[9px] font-bold px-2 py-0.5 rounded-full ${
            c.status === 'HEARING' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
            c.status === 'DISPOSED' ? 'bg-green-50 text-green-700 border border-green-200' :
            c.status === 'APPEAL' ? 'bg-red-50 text-red-700 border border-red-200' :
            'bg-yellow-50 text-yellow-700 border border-yellow-200'
          }`}>
            {c.status}
          </span>

          <div className="min-w-0 md:w-56 md:shrink-0">
            <h2 className="font-bold text-sm text-[#111111] group-hover:text-[#8A6D2F] transition-colors truncate">
              {c.title}
            </h2>
            {c.matter_id ? (
              <p className="text-[10px] font-bold text-[#8A6D2F] truncate">
                📁 {c.matter_title || 'Linked Matter'}
                {c.client_name ? ` — ${c.client_name}` : ''}
              </p>
            ) : (
              <p className="text-[10px] font-semibold text-[#B0A588]">Standalone — not linked to a Matter</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs md:flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-[#726B58] uppercase font-bold tracking-wider">Forum:</span>
              {c.court ? <CourtBadge court={c.court} /> : <span className="text-[#4A4130] font-semibold">N/A</span>}
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[9px] text-[#726B58] uppercase font-bold tracking-wider">Judge:</span>
              <span className="text-[#4A4130] font-semibold truncate max-w-[140px]">{c.judge || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[9px] text-[#726B58] uppercase font-bold tracking-wider">Stage:</span>
              <span className="text-[#4A4130] font-semibold truncate max-w-[160px]">{c.stage || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-[#726B58] uppercase font-bold tracking-wider">Next:</span>
              <span className="text-[#8A6D2F] font-mono font-bold">{c.hearing_date || 'N/A'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 md:ml-auto">
            {activeHearingCaseId !== c.id && (
              <button
                type="button"
                onClick={() => openHearingForm(c)}
                className="text-xs font-bold uppercase tracking-wider text-[#8A6D2F] border border-dashed border-[#E7DFC9] rounded-lg px-3 py-1.5 hover:border-[#8A6D2F] transition-colors whitespace-nowrap"
              >
                📝 Save Hearing
              </button>
            )}
            <Link
              href={`/cases/${c.id}`}
              className="text-xs font-bold uppercase tracking-wider text-[#8A6D2F] hover:text-[#6F5624] whitespace-nowrap"
            >
              Open Workspace →
            </Link>
          </div>
        </div>

        {hearingSavedCaseId === c.id && (
          <p className="mx-5 mb-4 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-center">
            ✓ Hearing saved — Matter updated
          </p>
        )}

        {activeHearingCaseId === c.id && (
          <div className="mx-5 mb-5 pt-4 border-t border-dashed border-[#E7DFC9] space-y-3">
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
              <label htmlFor={`hearing-outcome-${c.id}`} className="block text-[9px] font-bold text-[#726B58] uppercase tracking-widest mb-1">
                What Happened *
              </label>
              <select
                id={`hearing-outcome-${c.id}`}
                value={hearingOutcome}
                onChange={(e) => setHearingOutcome(e.target.value as HearingOutcome)}
                className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-semibold text-[#3A3222]"
              >
                {HEARING_OUTCOMES.map((outcome) => (
                  <option key={outcome} value={outcome}>
                    {HEARING_OUTCOME_LABELS[outcome]}
                  </option>
                ))}
              </select>
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
        )}
      </div>
    );
  }

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
            Case Diary
          </h1>
          <p className="text-xs font-semibold text-[#726B58] uppercase tracking-widest mt-1">
            Today&apos;s hearings, and the complete Proceeding register
          </p>
        </div>
        <Link
          href="/cases/new"
          className="self-start md:self-auto bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-semibold text-xs md:text-sm px-5 py-2.5 rounded-lg transition-all uppercase tracking-wider"
        >
          + New Proceeding
        </Link>
      </div>

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

      {/* Daily Diary Sections — the primary screen. Each Proceeding falls
          into exactly one bucket (see bucketFor above); anything else
          (no hearing due, not touched today) lives only in the collapsed
          "All Proceedings" section below, reachable through filters and
          search rather than dominating first paint. */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="w-8 h-8 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : cases.length > 0 ? (
        <div className="space-y-10">
          {(() => {
            const today = todayISO();
            const buckets: Record<DailyBucket, LegalCase[]> = {
              adjourned: [],
              today: [],
              completed: [],
              upcoming: [],
              other: [],
            };
            for (const c of cases) buckets[bucketFor(c, today)].push(c);
            buckets.upcoming.sort((a, b) => (a.hearing_date || '').localeCompare(b.hearing_date || ''));

            const sections: { key: string; label: string; items: LegalCase[]; emptyText: string; accent: string }[] = [
              { key: 'today', label: "Today's Hearings", items: buckets.today, emptyText: 'No hearings due today.', accent: 'text-[#8A6D2F]' },
              { key: 'adjourned', label: 'Adjourned Hearings', items: buckets.adjourned, emptyText: 'No adjournments recorded today.', accent: 'text-orange-700' },
              { key: 'completed', label: 'Completed Hearings', items: buckets.completed, emptyText: 'No hearings recorded yet today.', accent: 'text-green-700' },
              { key: 'upcoming', label: 'Upcoming Hearings', items: buckets.upcoming, emptyText: 'No future hearings scheduled.', accent: 'text-[#726B58]' },
            ];

            return sections.map((section) => (
              <section key={section.key}>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className={`text-xs font-black uppercase tracking-widest ${section.accent}`}>{section.label}</h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FBF6EA] text-[#8A6D2F] border border-[#E7DFC9]">
                    {section.items.length}
                  </span>
                </div>
                {section.items.length > 0 ? (
                  <div className="flex flex-col gap-3 animate-fadeIn">
                    {section.items.map(renderCaseCard)}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-[#B0A588] italic">{section.emptyText}</p>
                )}
              </section>
            ));
          })()}

          {/* All Proceedings — the complete, status-filterable register.
              Collapsed by default so older Proceedings never dominate the
              first screen; anything not surfaced above (or filtered out
              here) stays reachable through Universal Search. */}
          <section className="pt-6 border-t border-[#E7DFC9]/60">
            <button
              type="button"
              onClick={() => setShowAllProceedings((v) => !v)}
              aria-expanded={showAllProceedings}
              className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#726B58] hover:text-[#8A6D2F] transition-colors"
            >
              <span className={`inline-block transition-transform ${showAllProceedings ? 'rotate-90' : ''}`} aria-hidden="true">▸</span>
              All Proceedings
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FBF6EA] text-[#8A6D2F] border border-[#E7DFC9]">
                {cases.length}
              </span>
            </button>

            {showAllProceedings && (
              <div className="mt-4">
                <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 shadow-sm flex items-center flex-wrap gap-4 mb-6">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#726B58]">Filters:</span>
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
                  <Link
                    href="/search?type=PROCEEDING"
                    className="ml-auto text-xs font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline"
                  >
                    🔍 Search Proceedings →
                  </Link>
                </div>

                {(() => {
                  const filtered = selectedStatus === 'ALL' ? cases : cases.filter((c) => c.status === selectedStatus);
                  return filtered.length > 0 ? (
                    <div className="flex flex-col gap-3 animate-fadeIn">
                      {filtered.map(renderCaseCard)}
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-[#B0A588] italic">No Proceedings match this filter.</p>
                  );
                })()}
              </div>
            )}
          </section>
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
          description="No litigation cases exist under the active tenant context. Register a new Proceeding to begin."
          action={
            <Link
              href="/cases/new"
              className="bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-all uppercase tracking-wider"
            >
              + New Proceeding
            </Link>
          }
        />
      )}
    </div>
  );
}

export default function CasesChamberPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex justify-center items-center py-20">
        <span className="w-8 h-8 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
      </div>
    }>
      <CasesChamberContent />
    </Suspense>
  );
}
