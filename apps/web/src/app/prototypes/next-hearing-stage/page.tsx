'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  HEARING_CATEGORIES,
  CATEGORY_STYLES,
  SEED_HEARING_RECORDS,
  type HearingCategory,
  type HearingCaseRecord,
  type TimelineEntry,
} from './hearing-data';

const SESSION_KEY = 'nchq-next-hearing-stage-v1';

interface PersistedState {
  records: HearingCaseRecord[];
  timelineEntries: TimelineEntry[];
}

function formatDate(value: string | null): string {
  if (!value) return '';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTimestamp(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface PendingConfirmation {
  id: string;
  field: 'date' | 'stage';
  value: string;
  duplicates: HearingCaseRecord[];
}

interface HearingCardProps {
  record: HearingCaseRecord;
  onRequestUpdate: (id: string, field: 'date' | 'stage', value: string) => void;
  onUpdateNote: (id: string, value: string) => void;
  onOpenRegister: (id: string) => void;
}

function HearingCard({ record, onRequestUpdate, onUpdateNote, onOpenRegister }: HearingCardProps) {
  const style = CATEGORY_STYLES[record.category];
  const [editingField, setEditingField] = useState<'none' | 'date' | 'stage'>('none');
  const [dateDraft, setDateDraft] = useState(record.nextHearingDate || '');
  const [stageDraft, setStageDraft] = useState(record.currentStage || '');
  const [noteDraft, setNoteDraft] = useState(record.shortNote);

  const saveDate = () => {
    onRequestUpdate(record.id, 'date', dateDraft);
    setEditingField('none');
  };
  const saveStage = () => {
    onRequestUpdate(record.id, 'stage', stageDraft);
    setEditingField('none');
  };

  return (
    <div
      className="rounded-xl p-4 space-y-3 border min-w-0"
      style={{ backgroundColor: style.bg, borderColor: style.border }}
    >
      <div className="flex items-center gap-1.5">
        <span aria-hidden="true">{style.icon}</span>
        <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: style.text }}>
          {record.category}
        </span>
      </div>

      <div>
        <p className="text-xs font-bold text-[#111111] leading-snug">{record.matterName}</p>
        <p className="text-[10px] text-[#5C5340] mt-0.5">{record.courtLabel}</p>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px]">
        <div>
          <p className="font-bold uppercase tracking-wider text-[#8A7A56]">Hearing Date</p>
          <p className="text-[#3A3222] font-semibold">{formatDate(record.hearingDate)}</p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-wider text-[#8A7A56]">Case Number</p>
          <p className="text-[#3A3222] font-semibold">{record.caseNumber}</p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-wider text-[#8A7A56]">Court No. / Bench</p>
          <p className="text-[#3A3222] font-semibold">{record.courtBench || 'Court number not assigned'}</p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-wider text-[#8A7A56]">Current Stage</p>
          <p className="text-[#3A3222] font-semibold">{record.currentStage || 'Stage not confirmed'}</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Next Hearing Date</p>
        {editingField === 'date' ? (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <input
              type="date"
              value={dateDraft}
              onChange={(e) => setDateDraft(e.target.value)}
              className="px-2 py-1 bg-white border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-[10px] font-medium text-[#3A3222]"
            />
            <button onClick={saveDate} className="px-2 py-1 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-[9px] font-bold uppercase rounded">
              Save
            </button>
            <button onClick={() => setEditingField('none')} className="px-2 py-1 border border-[#E7DFC9] text-[#8A7A56] text-[9px] font-bold uppercase rounded bg-white">
              Cancel
            </button>
          </div>
        ) : (
          <p className="text-[#3A3222] font-semibold text-[10px]">
            {record.nextHearingDate ? formatDate(record.nextHearingDate) : 'Next hearing not announced'}
          </p>
        )}
      </div>

      <input
        type="text"
        value={noteDraft}
        onChange={(e) => setNoteDraft(e.target.value)}
        onBlur={() => onUpdateNote(record.id, noteDraft)}
        placeholder="+ Short hearing note (optional)"
        className="w-full bg-transparent border-none outline-none italic text-[10px] text-[#8A7A56] placeholder-[#B0A588]"
      />

      <div className="flex flex-wrap gap-1.5 pt-2 border-t" style={{ borderColor: style.border }}>
        <button
          onClick={() => {
            setDateDraft(record.nextHearingDate || '');
            setEditingField(editingField === 'date' ? 'none' : 'date');
          }}
          className="px-2 py-1 bg-white/70 hover:bg-white border rounded text-[9px] font-bold uppercase tracking-wide text-[#3A3222]"
          style={{ borderColor: style.border }}
        >
          Update Date
        </button>
        <button
          onClick={() => {
            setStageDraft(record.currentStage || '');
            setEditingField(editingField === 'stage' ? 'none' : 'stage');
          }}
          className="px-2 py-1 bg-white/70 hover:bg-white border rounded text-[9px] font-bold uppercase tracking-wide text-[#3A3222]"
          style={{ borderColor: style.border }}
        >
          Update Stage
        </button>
        <button
          onClick={() => onOpenRegister(record.id)}
          className="px-2 py-1 bg-white/70 hover:bg-white border rounded text-[9px] font-bold uppercase tracking-wide text-[#3A3222]"
          style={{ borderColor: style.border }}
        >
          Open Matter Register
        </button>
      </div>

      {editingField === 'stage' && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={stageDraft}
            onChange={(e) => setStageDraft(e.target.value)}
            placeholder="e.g. Arguments"
            className="px-2 py-1 bg-white border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-[10px] font-medium text-[#3A3222] flex-1 min-w-[120px]"
          />
          <button onClick={saveStage} className="px-2 py-1 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-[9px] font-bold uppercase rounded">
            Save
          </button>
          <button onClick={() => setEditingField('none')} className="px-2 py-1 border border-[#E7DFC9] text-[#8A7A56] text-[9px] font-bold uppercase rounded bg-white">
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default function NextHearingStagePage() {
  const [records, setRecords] = useState<HearingCaseRecord[]>(SEED_HEARING_RECORDS);
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);
  const [openRegisterId, setOpenRegisterId] = useState<string | null>(null);
  const [showAddOtherCourt, setShowAddOtherCourt] = useState(false);

  const [newCourtLabel, setNewCourtLabel] = useState('');
  const [newMatterName, setNewMatterName] = useState('');
  const [newCaseNumber, setNewCaseNumber] = useState('');
  const [newCourtBench, setNewCourtBench] = useState('');
  const [newHearingDate, setNewHearingDate] = useState('');

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        if (parsed.records) setRecords(parsed.records);
        if (parsed.timelineEntries) setTimelineEntries(parsed.timelineEntries);
      }
    } catch {
      // Corrupt or unavailable sessionStorage — start from the seed data.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ records, timelineEntries }));
    } catch {
      // Best-effort only.
    }
  }, [hydrated, records, timelineEntries]);

  const addTimelineEntry = (caseId: string, message: string) => {
    setTimelineEntries((prev) => [
      ...prev,
      { id: `tl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, caseId, timestamp: new Date().toISOString(), message },
    ]);
  };

  const commitUpdate = (id: string, field: 'date' | 'stage', value: string) => {
    const record = records.find((r) => r.id === id);
    if (!record) return;
    const changed = field === 'date' ? (record.nextHearingDate || '') !== value : (record.currentStage || '') !== value;
    if (!changed) {
      setNotice('No change made — value was already the same.');
      return;
    }
    const oldValue = field === 'date' ? record.nextHearingDate : record.currentStage;
    setRecords((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return field === 'date'
          ? { ...r, previousNextHearingDate: r.nextHearingDate, nextHearingDate: value || null }
          : { ...r, previousStage: r.currentStage, currentStage: value || null };
      })
    );
    const label = field === 'date' ? 'Next hearing date' : 'Stage';
    addTimelineEntry(id, `${label} updated to "${value}"${oldValue ? ` (previously "${oldValue}")` : ''}.`);
  };

  const handleRequestUpdate = (id: string, field: 'date' | 'stage', value: string) => {
    const record = records.find((r) => r.id === id);
    if (!record) return;
    const duplicates = records.filter(
      (r) => r.id !== id && r.caseNumber.trim() !== '' && r.caseNumber.trim() === record.caseNumber.trim()
    );
    if (duplicates.length > 0) {
      setPendingConfirmation({ id, field, value, duplicates });
      return;
    }
    commitUpdate(id, field, value);
  };

  const handleUpdateNote = (id: string, value: string) => {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, shortNote: value } : r)));
  };

  const handleConfirmPending = () => {
    if (!pendingConfirmation) return;
    commitUpdate(pendingConfirmation.id, pendingConfirmation.field, pendingConfirmation.value);
    setPendingConfirmation(null);
  };

  const handleAddOtherCourtCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourtLabel.trim() || !newMatterName.trim()) return;
    const id = `oc-manual-${Date.now()}`;
    setRecords((prev) => [
      ...prev,
      {
        id,
        category: 'Other Court',
        courtLabel: newCourtLabel.trim(),
        matterName: newMatterName.trim(),
        caseNumber: newCaseNumber.trim(),
        courtBench: newCourtBench.trim(),
        hearingDate: newHearingDate || new Date().toISOString().slice(0, 10),
        nextHearingDate: null,
        currentStage: null,
        shortNote: '',
      },
    ]);
    addTimelineEntry(id, 'Case added manually under Other Court.');
    setNewCourtLabel('');
    setNewMatterName('');
    setNewCaseNumber('');
    setNewCourtBench('');
    setNewHearingDate('');
    setShowAddOtherCourt(false);
  };

  const openRecord = records.find((r) => r.id === openRegisterId) || null;
  const openRecordTimeline = openRegisterId
    ? timelineEntries.filter((t) => t.caseId === openRegisterId).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    : [];

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans selection:bg-[#8A6D2F] selection:text-white">
      <div className="bg-[#111111] text-[#FDFBF7] px-4 py-2 text-center text-[10px] md:text-[11px] font-bold uppercase tracking-widest">
        Prototype — Next Hearing &amp; Stage Action Card. Simulated data, local session state only — no real notifications, no court integrations.
      </div>

      <header className="border-b border-[#111111]/10 px-4 md:px-6 py-4">
        <Link href="/matters" className="text-[10px] font-bold uppercase tracking-widest text-[#B0A588] hover:text-[#8A6D2F]">
          ← Back to Matters
        </Link>
        <h1 className="text-lg md:text-xl font-black uppercase tracking-widest mt-1">Next Hearing &amp; Stage</h1>
        <p className="text-xs font-serif italic text-[#111111]/60">Prototype diary of cases by court category, linked to their Matter Register.</p>
      </header>

      {notice && (
        <div className="mx-4 md:mx-6 mt-4 p-4 bg-[#FBF6EA] border border-[#C6A253]/40 rounded-xl flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs font-semibold text-[#5C5340]">{notice}</p>
          <button onClick={() => setNotice(null)} className="text-xs font-bold text-[#B0A588] hover:text-[#8A7A56]" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      <div className="flex-1 p-4 md:p-6 space-y-8 max-w-6xl mx-auto w-full">
        {HEARING_CATEGORIES.map((category: HearingCategory) => {
          const categoryRecords = records.filter((r) => r.category === category);
          const style = CATEGORY_STYLES[category];
          return (
            <section key={category} className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#111111] flex items-center gap-2">
                  <span aria-hidden="true">{style.icon}</span>
                  {category} Cases
                  <span className="text-[#B0A588] font-normal normal-case">({categoryRecords.length})</span>
                </h2>
                {category === 'Other Court' && (
                  <button
                    onClick={() => setShowAddOtherCourt((v) => !v)}
                    className="px-3 py-1.5 border border-[#8A6D2F] text-[#8A6D2F] hover:bg-[#FBF6EA] font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all"
                  >
                    {showAddOtherCourt ? 'Cancel' : '+ Add Other Court Case'}
                  </button>
                )}
              </div>

              {category === 'Other Court' && showAddOtherCourt && (
                <form onSubmit={handleAddOtherCourtCase} className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Court Name *</label>
                    <input
                      type="text"
                      required
                      value={newCourtLabel}
                      onChange={(e) => setNewCourtLabel(e.target.value)}
                      placeholder="e.g. Motor Accident Claims Tribunal"
                      className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Matter Name *</label>
                    <input
                      type="text"
                      required
                      value={newMatterName}
                      onChange={(e) => setNewMatterName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Case Number</label>
                    <input
                      type="text"
                      value={newCaseNumber}
                      onChange={(e) => setNewCaseNumber(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Court No. / Bench</label>
                    <input
                      type="text"
                      value={newCourtBench}
                      onChange={(e) => setNewCourtBench(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Hearing Date</label>
                    <input
                      type="date"
                      value={newHearingDate}
                      onChange={(e) => setNewHearingDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button type="submit" className="px-5 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-bold text-[10px] uppercase tracking-widest rounded-lg shadow transition-all">
                      Add Case
                    </button>
                  </div>
                </form>
              )}

              {categoryRecords.length === 0 ? (
                <p className="text-xs text-[#B0A588] italic px-1">No {category} cases yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {categoryRecords.map((record) => (
                    <HearingCard
                      key={record.id}
                      record={record}
                      onRequestUpdate={handleRequestUpdate}
                      onUpdateNote={handleUpdateNote}
                      onOpenRegister={setOpenRegisterId}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Duplicate case number confirmation */}
      {pendingConfirmation && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111]">Confirm Matter Register</h3>
            <p className="text-xs text-[#5C5340]">
              More than one case in this prototype shares case number <strong>{records.find((r) => r.id === pendingConfirmation.id)?.caseNumber}</strong>. Confirm this update applies to the correct matter:
            </p>
            <div className="bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg p-3 space-y-1">
              <p className="text-xs font-bold text-[#3A3222]">
                {records.find((r) => r.id === pendingConfirmation.id)?.matterName} ({records.find((r) => r.id === pendingConfirmation.id)?.category})
              </p>
              <p className="text-[10px] text-[#8A7A56]">
                Also matches: {pendingConfirmation.duplicates.map((d) => `${d.matterName} (${d.category})`).join(', ')}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setPendingConfirmation(null)}
                className="px-4 py-2 text-xs font-bold uppercase border border-[#E7DFC9] text-[#8A7A56] rounded-lg hover:bg-[#FBF8F1] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPending}
                className="px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase rounded-lg transition-all"
              >
                Confirm &amp; Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Matter Register — this prototype's own lightweight per-case register view */}
      {openRecord && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-20 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111]">Matter Register (Prototype)</h3>
              <button onClick={() => setOpenRegisterId(null)} className="text-xs font-bold text-[#B0A588] hover:text-[#8A7A56]" aria-label="Close">
                ✕
              </button>
            </div>
            <div>
              <p className="text-sm font-bold text-[#111111]">{openRecord.matterName}</p>
              <p className="text-xs text-[#8A7A56]">{openRecord.courtLabel} — {openRecord.category}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg p-3">
              <div><p className="font-bold uppercase text-[9px] text-[#8A7A56]">Case Number</p><p className="text-[#3A3222]">{openRecord.caseNumber || '—'}</p></div>
              <div><p className="font-bold uppercase text-[9px] text-[#8A7A56]">Court No. / Bench</p><p className="text-[#3A3222]">{openRecord.courtBench || 'Not assigned'}</p></div>
              <div><p className="font-bold uppercase text-[9px] text-[#8A7A56]">Current Stage</p><p className="text-[#3A3222]">{openRecord.currentStage || 'Not confirmed'}</p></div>
              <div><p className="font-bold uppercase text-[9px] text-[#8A7A56]">Next Hearing</p><p className="text-[#3A3222]">{openRecord.nextHearingDate ? formatDate(openRecord.nextHearingDate) : 'Not announced'}</p></div>
              {openRecord.previousStage && (
                <div className="col-span-2"><p className="font-bold uppercase text-[9px] text-[#8A7A56]">Previous Stage</p><p className="text-[#3A3222]">{openRecord.previousStage}</p></div>
              )}
              {openRecord.previousNextHearingDate && (
                <div className="col-span-2"><p className="font-bold uppercase text-[9px] text-[#8A7A56]">Previous Hearing Date</p><p className="text-[#3A3222]">{formatDate(openRecord.previousNextHearingDate)}</p></div>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#B0A588] mb-2">Timeline</p>
              {openRecordTimeline.length === 0 ? (
                <p className="text-xs text-[#B0A588] italic">No updates recorded yet for this case.</p>
              ) : (
                <div className="space-y-2">
                  {openRecordTimeline.map((entry) => (
                    <div key={entry.id} className="flex gap-2 items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8A6D2F] mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-[#3A3222]">{entry.message}</p>
                        <p className="text-[9px] text-[#B0A588] font-mono">{formatTimestamp(entry.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[9px] text-[#B0A588] italic">
              This is this prototype&apos;s own lightweight register view (local session state) — separate from the Draft Document prototype&apos;s Matter Register reveal.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
