'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  COURT_FORUM_TYPES,
  COURT_FORUM_LABELS,
  HEARING_OUTCOMES,
  HEARING_OUTCOME_LABELS,
  type CourtForumType,
  type HearingOutcome,
} from '@/lib/domain/court-note';

const STAGE_SUGGESTIONS = [
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

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Feature-detected browser dictation — no vendor SDK, no backend, no AI
 * field-extraction. Purely fills the field the advocate then reviews. */
function useDictation(onResult: (transcript: string) => void) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = React.useRef<any>(null);

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(Boolean(SpeechRecognitionCtor));
  }, []);

  const toggle = useCallback(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as any)
        .map((result: any) => result[0].transcript)
        .join(' ');
      onResult(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, onResult]);

  return { isSupported, isListening, toggle };
}

function DictationButton({ label, onResult, onUsed }: { label: string; onResult: (t: string) => void; onUsed: () => void }) {
  const { isSupported, isListening, toggle } = useDictation((transcript) => {
    onResult(transcript);
    onUsed();
  });

  if (!isSupported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isListening ? `Stop dictating ${label}` : `Dictate ${label}`}
      aria-pressed={isListening}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-colors ${
        isListening
          ? 'bg-red-50 border-red-200 text-red-700 animate-pulse'
          : 'bg-[#FBF8F1] border-[#E7DFC9] text-[#8A6D2F] hover:border-[#8A6D2F]'
      }`}
    >
      <span aria-hidden="true">{isListening ? '● Listening' : '🎙 Dictate'}</span>
    </button>
  );
}

export default function CourtNotePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [caseTitle, setCaseTitle] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [hearingDate, setHearingDate] = useState(todayISO());
  const [nextHearingDate, setNextHearingDate] = useState('');
  const [courtForumType, setCourtForumType] = useState<CourtForumType>('HIGH_COURT');
  const [courtForumOther, setCourtForumOther] = useState('');
  const [stage, setStage] = useState('');
  const [hearingOutcome, setHearingOutcome] = useState<HearingOutcome>('CONDUCTED');
  const [note, setNote] = useState('');
  const [nextActions, setNextActions] = useState('');
  const [inputMethod, setInputMethod] = useState<'MANUAL' | 'HYBRID'>('MANUAL');
  const [showMore, setShowMore] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

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
          setNotFound(true);
          return;
        }
        const data = await res.json();
        setCaseTitle(data.case.title);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const canSave = useMemo(
    () =>
      Boolean(hearingDate) &&
      Boolean(stage.trim()) &&
      Boolean(note.trim()) &&
      (courtForumType !== 'OTHER' || Boolean(courtForumOther.trim())),
    [hearingDate, stage, note, courtForumType, courtForumOther]
  );

  const handleSave = async () => {
    if (!canSave || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/cases/${id}/court-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hearing_date: hearingDate,
          next_hearing_date: nextHearingDate || null,
          court_forum_type: courtForumType,
          court_forum_other: courtForumType === 'OTHER' ? courtForumOther.trim() : null,
          stage: stage.trim(),
          hearing_outcome: hearingOutcome,
          note: note.trim(),
          next_actions: nextActions.trim() || null,
          input_method: inputMethod,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setSaveError(body?.message || 'Could not save the Court Note. Please try again.');
        return;
      }
      setIsSaved(true);
      setTimeout(() => router.push(`/cases/${id}`), 900);
    } catch {
      setSaveError('Network error — the Court Note was not saved.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex justify-center items-center">
        <span className="w-8 h-8 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans">
        <div className="flex-1 flex flex-col justify-center items-center py-20">
          <span className="text-3xl">🔒</span>
          <h2 className="text-lg font-bold mt-2">Authentication Required</h2>
          <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#8A6D2F]">
            Phone verification is required to save or access private work.
          </p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans">
        <div className="flex-1 flex flex-col justify-center items-center py-20">
          <span className="text-3xl">⚠️</span>
          <h2 className="text-lg font-bold mt-2">Case Not Found</h2>
          <Link href="/cases" className="mt-4 text-xs font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">
            Back to Cases
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] font-sans pb-28">
      <div className="max-w-xl mx-auto px-4 py-6 sm:py-8">
        <Link
          href={`/cases/${id}`}
          className="text-xs font-bold uppercase tracking-wider text-[#726B58] hover:text-[#8A6D2F] transition-colors"
        >
          ← Back to {caseTitle || 'Case'}
        </Link>

        <h1 className="text-2xl font-black uppercase tracking-tight text-[#111111] mt-3 mb-1">Record Court Note</h1>
        <p className="text-xs text-[#6F5624] mb-6">What just happened in court? Takes about 30 seconds.</p>

        <div className="space-y-5">
          {/* Primary fields — above the fold */}
          <div>
            <label htmlFor="hearing-date" className="block text-[11px] font-bold text-[#726B58] uppercase tracking-widest mb-1.5">
              Hearing Date
            </label>
            <input
              id="hearing-date"
              type="date"
              value={hearingDate}
              onChange={(e) => setHearingDate(e.target.value)}
              className="w-full min-h-[52px] px-4 bg-white border border-[#E7DFC9] rounded-xl outline-none focus:border-[#8A6D2F] text-base font-semibold text-[#3A3222]"
            />
          </div>

          <div>
            <label htmlFor="court-forum" className="block text-[11px] font-bold text-[#726B58] uppercase tracking-widest mb-1.5">
              Court / Forum
            </label>
            <select
              id="court-forum"
              value={courtForumType}
              onChange={(e) => setCourtForumType(e.target.value as CourtForumType)}
              className="w-full min-h-[52px] px-4 bg-white border border-[#E7DFC9] rounded-xl outline-none focus:border-[#8A6D2F] text-base font-semibold text-[#3A3222]"
            >
              {COURT_FORUM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {COURT_FORUM_LABELS[type]}
                </option>
              ))}
            </select>
            {courtForumType === 'OTHER' && (
              <input
                type="text"
                value={courtForumOther}
                onChange={(e) => setCourtForumOther(e.target.value)}
                placeholder="e.g. Tahsildar Court, Bengaluru"
                aria-label="Other Court / Forum name"
                className="w-full min-h-[52px] mt-2 px-4 bg-white border border-[#E7DFC9] rounded-xl outline-none focus:border-[#8A6D2F] text-base font-medium text-[#3A3222]"
              />
            )}
          </div>

          <div>
            <label htmlFor="stage" className="block text-[11px] font-bold text-[#726B58] uppercase tracking-widest mb-1.5">
              Stage of Case
            </label>
            <input
              id="stage"
              type="text"
              list="stage-suggestions"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              placeholder="e.g. Arguments"
              className="w-full min-h-[52px] px-4 bg-white border border-[#E7DFC9] rounded-xl outline-none focus:border-[#8A6D2F] text-base font-semibold text-[#3A3222]"
            />
            <datalist id="stage-suggestions">
              {STAGE_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="hearing-outcome" className="block text-[11px] font-bold text-[#726B58] uppercase tracking-widest mb-1.5">
              What Happened *
            </label>
            <select
              id="hearing-outcome"
              value={hearingOutcome}
              onChange={(e) => setHearingOutcome(e.target.value as HearingOutcome)}
              className="w-full min-h-[52px] px-4 bg-white border border-[#E7DFC9] rounded-xl outline-none focus:border-[#8A6D2F] text-base font-semibold text-[#3A3222]"
            >
              {HEARING_OUTCOMES.map((outcome) => (
                <option key={outcome} value={outcome}>
                  {HEARING_OUTCOME_LABELS[outcome]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="note" className="block text-[11px] font-bold text-[#726B58] uppercase tracking-widest">
                Court Note
              </label>
              <DictationButton
                label="Court Note"
                onResult={(t) => setNote((prev) => (prev ? `${prev} ${t}` : t))}
                onUsed={() => setInputMethod('HYBRID')}
              />
            </div>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What happened, what the court directed..."
              rows={4}
              className="w-full p-4 bg-white border border-[#E7DFC9] rounded-xl outline-none focus:border-[#8A6D2F] text-base font-medium text-[#3A3222]"
            />
          </div>

          {/* Secondary fields — progressive disclosure */}
          {!showMore ? (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              className="w-full min-h-[48px] text-xs font-bold uppercase tracking-wider text-[#8A6D2F] border border-dashed border-[#E7DFC9] rounded-xl hover:border-[#8A6D2F] transition-colors"
            >
              + Next Hearing Date &amp; Next Actions
            </button>
          ) : (
            <>
              <div>
                <label htmlFor="next-hearing-date" className="block text-[11px] font-bold text-[#726B58] uppercase tracking-widest mb-1.5">
                  Next Hearing Date
                </label>
                <input
                  id="next-hearing-date"
                  type="date"
                  value={nextHearingDate}
                  onChange={(e) => setNextHearingDate(e.target.value)}
                  className="w-full min-h-[52px] px-4 bg-white border border-[#E7DFC9] rounded-xl outline-none focus:border-[#8A6D2F] text-base font-semibold text-[#3A3222]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="next-actions" className="block text-[11px] font-bold text-[#726B58] uppercase tracking-widest">
                    Next Actions
                  </label>
                  <DictationButton
                    label="Next Actions"
                    onResult={(t) => setNextActions((prev) => (prev ? `${prev} ${t}` : t))}
                    onUsed={() => setInputMethod('HYBRID')}
                  />
                </div>
                <textarea
                  id="next-actions"
                  value={nextActions}
                  onChange={(e) => setNextActions(e.target.value)}
                  placeholder="e.g. Prepare rejoinder, file exhibits..."
                  rows={2}
                  className="w-full p-4 bg-white border border-[#E7DFC9] rounded-xl outline-none focus:border-[#8A6D2F] text-base font-medium text-[#3A3222]"
                />
              </div>
            </>
          )}

          {saveError && (
            <p role="alert" aria-live="assertive" className="text-xs font-bold text-red-600">
              {saveError}
            </p>
          )}
        </div>
      </div>

      {/* Sticky one-thumb save bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-[#E7DFC9] px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.05)]">
        <div className="max-w-xl mx-auto">
          <button
            onClick={handleSave}
            disabled={!canSave || isSaving}
            aria-live="polite"
            className="w-full min-h-[56px] bg-[#8A6D2F] hover:bg-[#6F5624] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold uppercase tracking-wider rounded-xl transition-all shadow"
          >
            {isSaved ? '✓ Saved' : isSaving ? 'Saving…' : 'Save Court Note'}
          </button>
        </div>
      </div>
    </div>
  );
}
