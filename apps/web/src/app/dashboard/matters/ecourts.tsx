'use client';

import React from 'react';
import {
  isValidCnr,
  OFFICIAL_ECOURTS_URL,
  type ECourtsReference,
  type ECourtsVerificationStatus,
} from './mock-matters';

export const ECOURTS_DISCLAIMER =
  'eCourts information is provided for reference. Verify critical information against the relevant court record before acting.';

export const ECOURTS_ATTRIBUTION = 'External official service operated by the eCommittee / NIC.';

const ECOURTS_OVERRIDES_KEY = 'nchq-dashboard-ecourts-overrides-v1';

function loadECourtsOverrides(): Record<string, Partial<ECourtsReference>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(ECOURTS_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveECourtsOverride(matterId: string, patch: Partial<ECourtsReference>): void {
  if (typeof window === 'undefined') return;
  try {
    const all = loadECourtsOverrides();
    all[matterId] = { ...all[matterId], ...patch };
    window.sessionStorage.setItem(ECOURTS_OVERRIDES_KEY, JSON.stringify(all));
  } catch {
    // Session storage unavailable — the prototype simply won't persist across reloads.
  }
}

/** Hook: resolves a matter's base eCourts reference merged with any
 * prototype-only session override (e.g. after "Add CNR"). Nothing here
 * ever calls an external service — overrides are purely local UI state. */
export function useECourtsReference(matterId: string, base: ECourtsReference): [ECourtsReference, (patch: Partial<ECourtsReference>) => void] {
  const [override, setOverride] = React.useState<Partial<ECourtsReference> | null>(null);

  React.useEffect(() => {
    const all = loadECourtsOverrides();
    setOverride(all[matterId] || null);
  }, [matterId]);

  const resolved: ECourtsReference = override ? { ...base, ...override } : base;

  const applyPatch = React.useCallback(
    (patch: Partial<ECourtsReference>) => {
      saveECourtsOverride(matterId, patch);
      setOverride((prev) => ({ ...prev, ...patch }));
    },
    [matterId]
  );

  return [resolved, applyPatch];
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Not yet recorded';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
  onCheck: () => void;
  onAddCnr: () => void;
}

/** Compact CNR / status / last-checked strip, reused in both the Matter
 * Register card and the detail page header summary. */
export function ECourtsCompactStrip({ matterTitle, ecourtsRef, onCheck, onAddCnr }: CompactStripProps) {
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
      {ecourtsRef.cnrNumber ? (
        <button
          onClick={onCheck}
          aria-label={`Check eCourts update for ${matterTitle}`}
          className="flex-none px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-[#E7DFC9] rounded-lg text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all whitespace-nowrap"
        >
          Check eCourts Update
        </button>
      ) : (
        <button
          onClick={onAddCnr}
          aria-label={`Add CNR for ${matterTitle}`}
          className="flex-none px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-[#E7DFC9] rounded-lg text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all whitespace-nowrap"
        >
          Add CNR
        </button>
      )}
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
  onCheck,
  onAddCnr,
}: {
  matterTitle: string;
  ecourtsRef: ECourtsReference;
  onCheck: () => void;
  onAddCnr: () => void;
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

      {ecourtsRef.cnrNumber ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="CNR Number" value={ecourtsRef.cnrNumber} />
          <Field label="Court Type" value={ecourtsRef.courtType || 'Not recorded'} />
          <Field label="Court / Establishment" value={ecourtsRef.courtEstablishment || 'Not recorded'} />
          <Field label="District" value={ecourtsRef.district || 'Not recorded'} />
          <Field label="State" value={ecourtsRef.state || 'Not recorded'} />
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
      ) : (
        <p className="text-xs text-[#8A7A56]">CNR not yet linked. Add the case's official CNR number to enable eCourts verification.</p>
      )}

      <p className="text-[10px] text-[#B0A588] pt-2 border-t border-[#F4EEE0]">{ECOURTS_DISCLAIMER}</p>

      <div>
        {ecourtsRef.cnrNumber ? (
          <button
            onClick={onCheck}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all"
          >
            Check eCourts Update
          </button>
        ) : (
          <button
            onClick={onAddCnr}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624] transition-all"
          >
            Add CNR
          </button>
        )}
      </div>
    </div>
  );
}

/** Guided, informational placeholder for "Check eCourts Update" — explains
 * the advocate-assisted flow and links to the official eCourts CNR-search
 * service. Deliberately does not read, scrape, or auto-fill anything from
 * that service, and does not offer a previous-vs-new comparison or write
 * any Matter Register field — that full confirmed-update workflow, and its
 * timeline/audit writes, are explicitly deferred to a future, separate
 * eCourts integration milestone. */
export function CheckECourtsModal({ cnrNumber, onClose }: { cnrNumber: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-40" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-black uppercase tracking-wide text-[#111111]">Check eCourts Update</h3>
          <button onClick={onClose} aria-label="Close" className="text-[#B0A588] hover:text-[#8A7A56] text-sm font-bold">
            ✕
          </button>
        </div>

        <Field label="CNR Number" value={cnrNumber} />

        <ul className="text-xs text-[#3A3222] space-y-1.5 list-disc list-inside">
          <li>You will open the official eCourts service in a new browser tab.</li>
          <li>Any CAPTCHA must be completed directly on eCourts — NextCaseHQ never handles or bypasses it.</li>
          <li>NextCaseHQ does not automatically read or scrape the result.</li>
          <li>Any update to this Matter Register must be confirmed manually before it changes anything here.</li>
        </ul>

        <a
          href={OFFICIAL_ECOURTS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624] transition-all"
        >
          Open Official eCourts Search
        </a>
        <p className="text-[10px] text-[#B0A588] text-center">{ECOURTS_ATTRIBUTION}</p>

        <p className="text-[10px] text-[#8A7A56] bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg p-3">
          Recording a confirmed update from the official record — with previous-versus-new comparison and a timeline
          entry — is part of a future eCourts integration milestone, not this one.
        </p>

        <p className="text-[10px] text-[#B0A588] pt-2 border-t border-[#F4EEE0]">{ECOURTS_DISCLAIMER}</p>
      </div>
    </div>
  );
}

/** Simple CNR entry, validated as a 16-character alphanumeric identifier.
 * Purely a manual data-entry action on this Matter Register's own field —
 * no lookup, no external call. Session-only (prototype), not persisted to
 * a database. */
export function AddCnrModal({ matterTitle, onCancel, onConfirm }: { matterTitle: string; onCancel: () => void; onConfirm: (cnr: string) => void }) {
  const [value, setValue] = React.useState('');
  const trimmed = value.trim().toUpperCase();
  const valid = isValidCnr(trimmed);
  const touched = value.length > 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-40" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-black uppercase tracking-wide text-[#111111]">Add CNR</h3>
          <button onClick={onCancel} aria-label="Close" className="text-[#B0A588] hover:text-[#8A7A56] text-sm font-bold">
            ✕
          </button>
        </div>
        <p className="text-xs text-[#8A7A56]">
          Enter the 16-character CNR number for <span className="font-semibold text-[#3A3222]">{matterTitle}</span>.
        </p>
        <div>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. MHPU01D000882024"
            aria-label="CNR Number"
            aria-invalid={touched && !valid}
            maxLength={16}
            className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none bg-[#FBFAF6] font-mono tracking-wider ${
              touched && !valid ? 'border-red-300 focus:border-red-400' : 'border-[#E7DFC9] focus:border-[#8A6D2F]'
            }`}
          />
          {touched && !valid && (
            <p className="text-[10px] text-red-600 mt-1">CNR must be exactly 16 alphanumeric characters.</p>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all">
            Cancel
          </button>
          <button
            disabled={!valid}
            onClick={() => onConfirm(trimmed)}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
