'use client';

import React from 'react';
import {
  isValidCnr,
  OFFICIAL_ECOURTS_URL,
  type ECourtsReference,
  type ECourtsVerificationStatus,
  type MockMatter,
  type TimelineEvent,
} from './mock-matters';

export const ECOURTS_DISCLAIMER =
  'eCourts information is provided for reference. Verify critical information against the relevant court record before acting.';

export const ECOURTS_ATTRIBUTION = 'External official service operated by the eCommittee / NIC.';

const ECOURTS_OVERRIDES_KEY = 'nchq-dashboard-ecourts-overrides-v1';
const PROCEEDING_OVERRIDES_KEY = 'nchq-dashboard-ecourts-proceeding-overrides-v1';

const CASE_TYPE_OPTIONS = [
  'Civil Suit',
  'Criminal Miscellaneous Petition',
  'Writ Petition',
  'First Appeal',
  'Special Leave Petition',
  'Consumer Complaint',
  'Execution Petition',
  'Other',
];

function loadOverrides<T>(key: string): Record<string, Partial<T>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOverride<T>(key: string, id: string, patch: Partial<T>): void {
  if (typeof window === 'undefined') return;
  try {
    const all = loadOverrides<T>(key);
    all[id] = { ...all[id], ...patch };
    window.sessionStorage.setItem(key, JSON.stringify(all));
  } catch {
    // Session storage unavailable — the prototype simply won't persist across reloads.
  }
}

/** Hook: resolves a matter's base eCourts reference merged with any
 * prototype-only session override. Nothing here ever calls an external
 * service — overrides are purely local UI state. */
export function useECourtsReference(matterId: string, base: ECourtsReference): [ECourtsReference, (patch: Partial<ECourtsReference>) => void] {
  const [override, setOverride] = React.useState<Partial<ECourtsReference> | null>(null);

  React.useEffect(() => {
    const all = loadOverrides<ECourtsReference>(ECOURTS_OVERRIDES_KEY);
    setOverride(all[matterId] || null);
  }, [matterId]);

  const resolved: ECourtsReference = override ? { ...base, ...override } : base;

  const applyPatch = React.useCallback(
    (patch: Partial<ECourtsReference>) => {
      saveOverride(ECOURTS_OVERRIDES_KEY, matterId, patch);
      setOverride((prev) => ({ ...prev, ...patch }));
    },
    [matterId]
  );

  return [resolved, applyPatch];
}

interface ProceedingOverride {
  stage?: string;
  nextHearingDate?: string | null;
  extraTimeline?: TimelineEvent[];
}

interface ProceedingBase {
  id: string;
  stage: string;
  nextHearingDate: string | null;
  timeline: TimelineEvent[];
}

/** Hook: resolves a matter's stage/next-hearing plus any advocate-confirmed
 * eCourts update, and any timeline entries recorded from a confirmed
 * update. Session-only (prototype), not persisted to a database — a real
 * implementation would write these to the Matter/LegalCase record and the
 * real timeline/audit tables instead. */
export function useMatterProceedingOverride(
  base: ProceedingBase
): [{ stage: string; nextHearingDate: string | null; timeline: TimelineEvent[] }, (patch: { stage?: string; nextHearingDate?: string | null }, timelineEntry: TimelineEvent | null) => void] {
  const [override, setOverride] = React.useState<ProceedingOverride | null>(null);

  React.useEffect(() => {
    const all = loadOverrides<ProceedingOverride>(PROCEEDING_OVERRIDES_KEY);
    setOverride(all[base.id] || null);
  }, [base.id]);

  const stage = override?.stage ?? base.stage;
  const nextHearingDate = override?.nextHearingDate !== undefined ? override.nextHearingDate : base.nextHearingDate;
  const timeline = [...base.timeline, ...(override?.extraTimeline || [])];

  const applyUpdate = React.useCallback(
    (patch: { stage?: string; nextHearingDate?: string | null }, timelineEntry: TimelineEvent | null) => {
      const all = loadOverrides<ProceedingOverride>(PROCEEDING_OVERRIDES_KEY);
      const current = all[base.id] || {};
      const nextExtra = timelineEntry ? [...(current.extraTimeline || []), timelineEntry] : current.extraTimeline || [];
      const next: ProceedingOverride = { ...current, ...patch, extraTimeline: nextExtra };
      saveOverride(PROCEEDING_OVERRIDES_KEY, base.id, next);
      setOverride(next);
    },
    [base.id]
  );

  return [{ stage, nextHearingDate, timeline }, applyUpdate];
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Not yet recorded';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDateOnly(value: string | null): string {
  if (!value) return 'Not yet recorded';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ECourtsStatusBadge({ status }: { status: ECourtsVerificationStatus }) {
  const styles: Record<ECourtsVerificationStatus, string> = {
    'Not checked': 'bg-[#F4EEE0] text-[#8A7A56] border-[#E7DFC9]',
    'Pending advocate confirmation': 'bg-sky-50 text-sky-700 border-sky-200',
    'Advocate confirmed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Needs rechecking': 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border whitespace-nowrap ${styles[status]}`}>
      {status}
    </span>
  );
}

interface CompactStripProps {
  matterTitle: string;
  ecourtsRef: ECourtsReference;
  onOpen: () => void;
}

/** Compact CNR / status / last-checked strip, reused in the Matter Register
 * card and the detail page header summary. One action either way — the
 * single "Check eCourts Case Update" card handles both linking a CNR and
 * checking an already-linked one. */
export function ECourtsCompactStrip({ matterTitle, ecourtsRef, onOpen }: CompactStripProps) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-[#F4EEE0]">
      <div className="min-w-0 flex items-center gap-2 flex-wrap">
        {ecourtsRef.cnrNumber ? (
          <>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">CNR:</span>
            <span className="text-[10px] font-semibold text-[#3A3222] truncate">{ecourtsRef.cnrNumber}</span>
            <ECourtsStatusBadge status={ecourtsRef.verificationStatus} />
            <span className="text-[10px] text-[#B0A588]">Checked {formatDateTime(ecourtsRef.lastCheckedAt)}</span>
          </>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B0A588]">CNR not yet linked</span>
        )}
      </div>
      <button
        onClick={onOpen}
        aria-label={`Check eCourts case update for ${matterTitle}`}
        className="flex-none px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-[#E7DFC9] rounded-lg text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all whitespace-nowrap"
      >
        Check eCourts Case Update
      </button>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">{label}</p>
      <p className="text-xs text-[#3A3222] font-semibold mt-0.5">{value}</p>
    </div>
  );
}

/** Full eCourts Reference block for the Matter Register Overview /
 * court-details section — every field from the approved data model, plus
 * the mandatory reference disclaimer. */
export function ECourtsReferenceSection({
  matterTitle,
  ecourtsRef,
  onOpen,
}: {
  matterTitle: string;
  ecourtsRef: ECourtsReference;
  onOpen: () => void;
}) {
  return (
    <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">eCourts Reference</h3>
        {ecourtsRef.cnrNumber ? (
          <ECourtsStatusBadge status={ecourtsRef.verificationStatus} />
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#B0A588]">CNR not yet linked</span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="State" value={ecourtsRef.state || 'Not recorded'} />
        <Field label="District" value={ecourtsRef.district || 'Not recorded'} />
        <Field label="Court / Establishment" value={ecourtsRef.courtEstablishment || 'Not recorded'} />
        <Field label="Case Type" value={ecourtsRef.caseType || 'Not recorded'} />
        <Field label="Case Number" value={ecourtsRef.searchCaseNumber || 'Not recorded'} />
        <Field label="Year" value={ecourtsRef.year || 'Not recorded'} />
        <Field label="CNR Number" value={ecourtsRef.cnrNumber || 'CNR not yet linked'} />
        <Field label="Synchronisation Mode" value={ecourtsRef.synchronisationMode} />
        <Field label="Last Checked" value={formatDateTime(ecourtsRef.lastCheckedAt)} />
        <Field label="Last Confirmed" value={formatDateTime(ecourtsRef.lastConfirmedAt)} />
        <Field label="Confirmed By" value={ecourtsRef.confirmedBy || 'Not yet confirmed'} />
        <Field
          label="Official eCourts Source"
          value={
            <a href={ecourtsRef.officialSourceLink} target="_blank" rel="noopener noreferrer" className="text-[#8A6D2F] hover:underline">
              services.ecourts.gov.in ↗
            </a>
          }
        />
      </div>

      <p className="text-[10px] text-[#B0A588] pt-2 border-t border-[#F4EEE0]">{ECOURTS_DISCLAIMER}</p>

      <button
        onClick={onOpen}
        className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624] transition-all"
      >
        Check eCourts Case Update
      </button>
    </div>
  );
}

type SearchMode = 'case_number' | 'cnr';
type ReturnPhase = 'search' | 'returned';
type ReturnAction = null | 'record_update' | 'save_cnr';

interface CheckECourtsCaseUpdateModalProps {
  matter: MockMatter;
  ecourtsRef: ECourtsReference;
  proceeding: { stage: string; nextHearingDate: string | null };
  onClose: () => void;
  onApplyEcourtsPatch: (patch: Partial<ECourtsReference>) => void;
  onRecordProceedingUpdate: (patch: { stage?: string; nextHearingDate?: string | null }, timelineEntry: TimelineEvent | null) => void;
  onNotice: (msg: string) => void;
}

function confirmedByFor(matter: MockMatter): string {
  return matter.representation.find((r) => r.status === 'Active')?.advocateName || 'Advocate (You)';
}

/**
 * The single "Check eCourts Case Update" Action Card. One card, two
 * selectable search modes (Case Number — default — or CNR), one shared
 * "Open Official eCourts Search" action, and one manual advocate-confirmed
 * return flow. Never reads, scrapes, or auto-fills anything from the
 * official service, never bypasses or automates CAPTCHA, and never writes
 * to the Matter Register without an explicit advocate confirmation.
 */
export function CheckECourtsCaseUpdateModal({
  matter,
  ecourtsRef,
  proceeding,
  onClose,
  onApplyEcourtsPatch,
  onRecordProceedingUpdate,
  onNotice,
}: CheckECourtsCaseUpdateModalProps) {
  const [mode, setMode] = React.useState<SearchMode>('case_number');
  const [phase, setPhase] = React.useState<ReturnPhase>('search');
  const [returnAction, setReturnAction] = React.useState<ReturnAction>(null);

  const [state, setState] = React.useState(ecourtsRef.state || '');
  const [district, setDistrict] = React.useState(ecourtsRef.district || '');
  const [courtEstablishment, setCourtEstablishment] = React.useState(ecourtsRef.courtEstablishment || matter.court || '');
  const [caseType, setCaseType] = React.useState(ecourtsRef.caseType || '');
  const [caseNumber, setCaseNumber] = React.useState(ecourtsRef.searchCaseNumber || '');
  const [year, setYear] = React.useState(ecourtsRef.year || '');

  const [cnrValue, setCnrValue] = React.useState(ecourtsRef.cnrNumber || '');
  const cnrTouched = cnrValue.length > 0;
  const cnrValid = isValidCnr(cnrValue);

  const [foundCnr, setFoundCnr] = React.useState('');
  const foundCnrTouched = foundCnr.length > 0;
  const foundCnrValid = isValidCnr(foundCnr);

  const [officialCaseStatus, setOfficialCaseStatus] = React.useState(ecourtsRef.officialCaseStatus || '');
  const [stageProposed, setStageProposed] = React.useState(proceeding.stage);
  const [hearingProposed, setHearingProposed] = React.useState(proceeding.nextHearingDate || '');
  const [courtroomProposed, setCourtroomProposed] = React.useState(ecourtsRef.courtroomOrBench || '');
  const [orderDateProposed, setOrderDateProposed] = React.useState(ecourtsRef.latestOrderDate || '');
  const [disposalProposed, setDisposalProposed] = React.useState(ecourtsRef.disposalStatus || '');
  const [note, setNote] = React.useState('');

  function handleOpenOfficialSearch() {
    setPhase('returned');
  }

  function handleNoChangeFound() {
    const now = new Date().toISOString();
    onApplyEcourtsPatch({
      lastCheckedAt: now,
      lastConfirmedAt: now,
      confirmedBy: confirmedByFor(matter),
      verificationStatus: 'Advocate confirmed',
    });
    onRecordProceedingUpdate({}, null);
    onNotice('No change found — eCourts check recorded (prototype only — not persisted to a database).');
    onClose();
  }

  function handleSaveCnr() {
    if (!foundCnrValid) return;
    const cnrChanged = foundCnr !== (ecourtsRef.cnrNumber || '');
    onApplyEcourtsPatch({
      cnrNumber: foundCnr,
      state: state || ecourtsRef.state,
      district: district || ecourtsRef.district,
      courtEstablishment: courtEstablishment || ecourtsRef.courtEstablishment,
      caseType: caseType || ecourtsRef.caseType,
      searchCaseNumber: caseNumber || ecourtsRef.searchCaseNumber,
      year: year || ecourtsRef.year,
    });
    if (cnrChanged) {
      onRecordProceedingUpdate({}, {
        id: `tl-ecourts-cnr-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        label: 'CNR linked from eCourts case-number search',
        eventType: 'CNR Linked',
      });
    }
    onNotice('CNR saved to this Matter Register (prototype only — not persisted to a database).');
    onClose();
  }

  function handleConfirmUpdate() {
    const now = new Date().toISOString();
    const stageChanged = stageProposed !== proceeding.stage;
    const hearingChanged = hearingProposed !== (proceeding.nextHearingDate || '');
    const statusChanged = officialCaseStatus !== (ecourtsRef.officialCaseStatus || '');
    const courtroomChanged = courtroomProposed !== (ecourtsRef.courtroomOrBench || '');
    const orderDateChanged = orderDateProposed !== (ecourtsRef.latestOrderDate || '');
    const disposalChanged = disposalProposed !== (ecourtsRef.disposalStatus || '');
    const anyChanged = stageChanged || hearingChanged || statusChanged || courtroomChanged || orderDateChanged || disposalChanged;

    const changedLabels: string[] = [];
    if (stageChanged) changedLabels.push(`stage → "${stageProposed}"`);
    if (hearingChanged) changedLabels.push(`next hearing → ${hearingProposed ? formatDateOnly(hearingProposed) : 'not scheduled'}`);
    if (statusChanged) changedLabels.push(`case status → "${officialCaseStatus}"`);
    if (courtroomChanged) changedLabels.push(`court number/bench → "${courtroomProposed}"`);
    if (orderDateChanged) changedLabels.push(`latest order date → ${orderDateProposed ? formatDateOnly(orderDateProposed) : 'none'}`);
    if (disposalChanged) changedLabels.push(`disposal status → "${disposalProposed}"`);

    onApplyEcourtsPatch({
      lastCheckedAt: now,
      lastConfirmedAt: now,
      confirmedBy: confirmedByFor(matter),
      verificationStatus: 'Advocate confirmed',
      officialCaseStatus: officialCaseStatus || null,
      courtroomOrBench: courtroomProposed || null,
      latestOrderDate: orderDateProposed || null,
      disposalStatus: disposalProposed || null,
      lastVerificationNote: note || ecourtsRef.lastVerificationNote,
    });

    onRecordProceedingUpdate(
      { stage: stageChanged ? stageProposed : undefined, nextHearingDate: hearingChanged ? hearingProposed || null : undefined },
      anyChanged
        ? {
            id: `tl-ecourts-update-${Date.now()}`,
            date: now.slice(0, 10),
            label: `eCourts update confirmed — ${changedLabels.join(', ')}`,
            eventType: 'Advocate Confirmation Recorded',
          }
        : null
    );

    onNotice(
      anyChanged
        ? 'eCourts update confirmed and recorded (prototype only — not persisted to a database).'
        : 'Update reviewed — no values differed from the Matter Register, so no timeline entry was created.'
    );
    onClose();
  }

  const canOpenOfficialSearch = mode === 'cnr' ? true : caseNumber.trim() !== '' && year.trim() !== '';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-40 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 my-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-[#111111]">Check eCourts Case Update</h3>
            <p className="text-[11px] text-[#8A7A56] mt-1">
              Search the official eCourts service using either the court case number or the CNR number, then record
              advocate-confirmed updates in the Matter Register.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex-none text-[#B0A588] hover:text-[#8A7A56] text-sm font-bold">
            ✕
          </button>
        </div>

        {/* Segmented control — Search by Case Number is the default */}
        <div className="flex rounded-lg border border-[#E7DFC9] overflow-hidden text-[10px] font-bold uppercase tracking-wider">
          <button
            onClick={() => setMode('case_number')}
            className={`flex-1 px-3 py-2 transition-all ${mode === 'case_number' ? 'bg-[#8A6D2F] text-white' : 'bg-white text-[#8A6D2F] hover:bg-[#FBF8F1]'}`}
          >
            Search by Case Number
          </button>
          <button
            onClick={() => setMode('cnr')}
            className={`flex-1 px-3 py-2 transition-all border-l border-[#E7DFC9] ${mode === 'cnr' ? 'bg-[#8A6D2F] text-white' : 'bg-white text-[#8A6D2F] hover:bg-[#FBF8F1]'}`}
          >
            Search by CNR Number
          </button>
        </div>

        {mode === 'case_number' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]" htmlFor="ecourts-state">State</label>
              <input id="ecourts-state" value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Maharashtra" className="w-full mt-1 px-3 py-2 text-xs border border-[#E7DFC9] rounded-lg focus:outline-none focus:border-[#8A6D2F] bg-[#FBFAF6]" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]" htmlFor="ecourts-district">District</label>
              <input id="ecourts-district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. Pune" className="w-full mt-1 px-3 py-2 text-xs border border-[#E7DFC9] rounded-lg focus:outline-none focus:border-[#8A6D2F] bg-[#FBFAF6]" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]" htmlFor="ecourts-court">Court / Establishment</label>
              <input id="ecourts-court" value={courtEstablishment} onChange={(e) => setCourtEstablishment(e.target.value)} placeholder="e.g. Civil Judge (Senior Division), Pune" className="w-full mt-1 px-3 py-2 text-xs border border-[#E7DFC9] rounded-lg focus:outline-none focus:border-[#8A6D2F] bg-[#FBFAF6]" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]" htmlFor="ecourts-case-type">Case Type</label>
              <select id="ecourts-case-type" value={caseType} onChange={(e) => setCaseType(e.target.value)} className="w-full mt-1 px-3 py-2 text-xs border border-[#E7DFC9] rounded-lg focus:outline-none focus:border-[#8A6D2F] bg-[#FBFAF6]">
                <option value="">Select case type</option>
                {CASE_TYPE_OPTIONS.map((ct) => (
                  <option key={ct} value={ct}>{ct}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]" htmlFor="ecourts-case-number">Case Number</label>
                <input id="ecourts-case-number" value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} placeholder="e.g. 214" className="w-full mt-1 px-3 py-2 text-xs border border-[#E7DFC9] rounded-lg focus:outline-none focus:border-[#8A6D2F] bg-[#FBFAF6]" />
              </div>
              <div className="w-20 flex-none">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]" htmlFor="ecourts-year">Year</label>
                <input id="ecourts-year" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2024" maxLength={4} className="w-full mt-1 px-3 py-2 text-xs border border-[#E7DFC9] rounded-lg focus:outline-none focus:border-[#8A6D2F] bg-[#FBFAF6]" />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]" htmlFor="ecourts-cnr-input">CNR Number</label>
            <input
              id="ecourts-cnr-input"
              value={cnrValue}
              onChange={(e) => setCnrValue(e.target.value)}
              placeholder="e.g. MHPU01D000882024"
              aria-invalid={cnrTouched && !cnrValid}
              maxLength={16}
              className={`w-full mt-1 px-3 py-2 text-xs border rounded-lg focus:outline-none bg-[#FBFAF6] font-mono tracking-wider ${
                cnrTouched && !cnrValid ? 'border-red-300 focus:border-red-400' : 'border-[#E7DFC9] focus:border-[#8A6D2F]'
              }`}
            />
            {cnrTouched && !cnrValid && <p className="text-[10px] text-red-600 mt-1">CNR must be exactly 16 alphanumeric characters.</p>}
          </div>
        )}

        <button
          onClick={handleOpenOfficialSearch}
          disabled={!canOpenOfficialSearch || (mode === 'cnr' && !cnrValid)}
          className="block w-full text-center px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <a
            href={OFFICIAL_ECOURTS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
            onClick={(e) => {
              if (!canOpenOfficialSearch || (mode === 'cnr' && !cnrValid)) e.preventDefault();
            }}
          >
            Open Official eCourts Search
          </a>
        </button>
        <p className="text-[10px] text-[#B0A588] text-center">{ECOURTS_ATTRIBUTION}</p>

        <ul className="text-[10px] text-[#3A3222] space-y-1 list-disc list-inside bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg p-3">
          <li>Any CAPTCHA must be completed directly on eCourts — NextCaseHQ never handles or bypasses it.</li>
          <li>NextCaseHQ does not automatically read or scrape the result.</li>
          <li>Any update to this Matter Register must be confirmed manually before it changes anything here.</li>
        </ul>

        {phase === 'returned' && returnAction === null && (
          <div className="space-y-2 pt-2 border-t border-[#F4EEE0]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">After returning from eCourts</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleNoChangeFound} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-[#E7DFC9] rounded-lg text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all">
                No change found
              </button>
              <button onClick={() => setReturnAction('record_update')} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-[#E7DFC9] rounded-lg text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all">
                Record an update
              </button>
              {mode === 'case_number' && (
                <button onClick={() => setReturnAction('save_cnr')} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-[#E7DFC9] rounded-lg text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all">
                  Save CNR to Matter Register
                </button>
              )}
            </div>
          </div>
        )}

        {returnAction === 'save_cnr' && (
          <div className="space-y-2 pt-2 border-t border-[#F4EEE0]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]" htmlFor="ecourts-found-cnr">CNR found on eCourts</label>
            <input
              id="ecourts-found-cnr"
              value={foundCnr}
              onChange={(e) => setFoundCnr(e.target.value)}
              placeholder="e.g. MHPU01D000882024"
              maxLength={16}
              className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none bg-[#FBFAF6] font-mono tracking-wider ${
                foundCnrTouched && !foundCnrValid ? 'border-red-300 focus:border-red-400' : 'border-[#E7DFC9] focus:border-[#8A6D2F]'
              }`}
            />
            {foundCnrTouched && !foundCnrValid && <p className="text-[10px] text-red-600">CNR must be exactly 16 alphanumeric characters.</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setReturnAction(null)} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all">Cancel</button>
              <button disabled={!foundCnrValid} onClick={handleSaveCnr} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624] transition-all disabled:opacity-40 disabled:cursor-not-allowed">Confirm</button>
            </div>
          </div>
        )}

        {returnAction === 'record_update' && (
          <div className="space-y-3 pt-2 border-t border-[#F4EEE0]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Previous value → Proposed value</p>

            <div className="grid grid-cols-2 gap-2 items-center text-[10px]">
              <span className="text-[#8A7A56]">Current case status</span>
              <span />
              <span className="text-[#B0A588] truncate">{ecourtsRef.officialCaseStatus || 'Not recorded'}</span>
              <input value={officialCaseStatus} onChange={(e) => setOfficialCaseStatus(e.target.value)} className="px-2 py-1 border border-[#E7DFC9] rounded bg-[#FBFAF6]" />

              <span className="text-[#8A7A56]">Current stage / purpose</span>
              <span />
              <span className="text-[#B0A588] truncate">{proceeding.stage}</span>
              <input value={stageProposed} onChange={(e) => setStageProposed(e.target.value)} className="px-2 py-1 border border-[#E7DFC9] rounded bg-[#FBFAF6]" />

              <span className="text-[#8A7A56]">Next hearing date</span>
              <span />
              <span className="text-[#B0A588] truncate">{formatDateOnly(proceeding.nextHearingDate)}</span>
              <input type="date" value={hearingProposed} onChange={(e) => setHearingProposed(e.target.value)} className="px-2 py-1 border border-[#E7DFC9] rounded bg-[#FBFAF6]" />

              <span className="text-[#8A7A56]">Court number / bench</span>
              <span />
              <span className="text-[#B0A588] truncate">{ecourtsRef.courtroomOrBench || 'Not recorded'}</span>
              <input value={courtroomProposed} onChange={(e) => setCourtroomProposed(e.target.value)} className="px-2 py-1 border border-[#E7DFC9] rounded bg-[#FBFAF6]" />

              <span className="text-[#8A7A56]">Latest order date</span>
              <span />
              <span className="text-[#B0A588] truncate">{formatDateOnly(ecourtsRef.latestOrderDate)}</span>
              <input type="date" value={orderDateProposed} onChange={(e) => setOrderDateProposed(e.target.value)} className="px-2 py-1 border border-[#E7DFC9] rounded bg-[#FBFAF6]" />

              <span className="text-[#8A7A56]">Disposal status</span>
              <span />
              <span className="text-[#B0A588] truncate">{ecourtsRef.disposalStatus || 'Pending'}</span>
              <input value={disposalProposed} onChange={(e) => setDisposalProposed(e.target.value)} className="px-2 py-1 border border-[#E7DFC9] rounded bg-[#FBFAF6]" />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]" htmlFor="ecourts-note">Short verification note</label>
              <textarea id="ecourts-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="w-full mt-1 px-2 py-1.5 text-xs border border-[#E7DFC9] rounded-lg bg-[#FBFAF6] focus:outline-none focus:border-[#8A6D2F]" />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setReturnAction(null)} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all">Cancel</button>
              <button onClick={handleConfirmUpdate} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624] transition-all">Confirm Update</button>
            </div>
          </div>
        )}

        <p className="text-[10px] text-[#B0A588] pt-2 border-t border-[#F4EEE0]">{ECOURTS_DISCLAIMER}</p>
      </div>
    </div>
  );
}
