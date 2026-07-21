'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MATTER_CLOSURE_REASONS,
  MATTER_REOPENING_REASONS,
  MATTER_CLOSURE_CONFIRMATION_STATEMENT,
  type MatterClosureReason,
  type MatterReopeningReason,
} from '@/lib/domain/matter-closure';
import type { MatterStatus } from '@/lib/domain/matter';

/**
 * Close/Reopen UI for the real Matter Register (Matter Closure and
 * Reopening UI milestone). Talks only to the three already-shipped,
 * already-tested endpoints (POST .../close, POST .../reopen,
 * GET .../audit) — no new API surface, no new database access.
 */

interface MatterAuditEventRow {
  id: string;
  action: string;
  new_value: { closure_reason?: string; final_outcome?: string } | null;
  reason: string | null;
  created_at: string;
}

interface CloseFormState {
  closure_reason: MatterClosureReason | '';
  final_outcome: string;
  disposal_date: string;
  final_order_reference: string;
  pending_obligations: string;
  appeal_review_limitation_date: string;
  execution_compliance_requirement: string;
  original_document_status: string;
  client_communication_status: string;
  account_fee_status: string;
  unresolved_warnings: string;
  confirmation_typed: string;
}

const EMPTY_CLOSE_FORM: CloseFormState = {
  closure_reason: '',
  final_outcome: '',
  disposal_date: '',
  final_order_reference: '',
  pending_obligations: '',
  appeal_review_limitation_date: '',
  execution_compliance_requirement: '',
  original_document_status: '',
  client_communication_status: '',
  account_fee_status: '',
  unresolved_warnings: '',
  confirmation_typed: '',
};

interface MatterClosurePanelProps {
  matterId: string;
  status: MatterStatus;
  isDemo: boolean;
  onShowUnavailablePrompt: () => void;
  onClosureChanged: () => void;
}

function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const inputClass =
  'w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium';
const labelClass = 'block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-1.5';

export default function MatterClosurePanel({
  matterId,
  status,
  isDemo,
  onShowUnavailablePrompt,
  onClosureChanged,
}: MatterClosurePanelProps) {
  const isClosed = status === 'CLOSED';

  const [auditEvents, setAuditEvents] = useState<MatterAuditEventRow[]>([]);
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [showReopenForm, setShowReopenForm] = useState(false);

  const [closeForm, setCloseForm] = useState<CloseFormState>(EMPTY_CLOSE_FORM);
  const [closeSubmitting, setCloseSubmitting] = useState(false);
  const [closeError, setCloseError] = useState('');

  const [reopeningReason, setReopeningReason] = useState<MatterReopeningReason | ''>('');
  const [reopeningNotes, setReopeningNotes] = useState('');
  const [reopenSubmitting, setReopenSubmitting] = useState(false);
  const [reopenError, setReopenError] = useState('');

  const fetchAuditEvents = useCallback(async () => {
    const res = await fetch(`/api/matters/${matterId}/audit`);
    if (!res.ok) return;
    const data = await res.json();
    setAuditEvents(data.audit_events);
  }, [matterId]);

  useEffect(() => {
    fetchAuditEvents();
  }, [fetchAuditEvents]);

  const latestClosureEvent = auditEvents.find((e) => e.action === 'MATTER_CLOSED');

  const updateCloseField = <K extends keyof CloseFormState>(key: K, value: CloseFormState[K]) => {
    setCloseForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClose = async (e: React.FormEvent) => {
    e.preventDefault();
    setCloseError('');
    if (isDemo) {
      onShowUnavailablePrompt();
      return;
    }
    if (!closeForm.closure_reason) {
      setCloseError('Select a closure reason.');
      return;
    }
    if (closeForm.confirmation_typed !== MATTER_CLOSURE_CONFIRMATION_STATEMENT) {
      setCloseError('The confirmation statement must be typed exactly as shown above.');
      return;
    }
    setCloseSubmitting(true);
    try {
      const res = await fetch(`/api/matters/${matterId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closure_reason: closeForm.closure_reason,
          final_outcome: closeForm.final_outcome || null,
          disposal_date: closeForm.disposal_date || null,
          final_order_reference: closeForm.final_order_reference || null,
          pending_obligations: closeForm.pending_obligations || null,
          appeal_review_limitation_date: closeForm.appeal_review_limitation_date || null,
          execution_compliance_requirement: closeForm.execution_compliance_requirement || null,
          original_document_status: closeForm.original_document_status || null,
          client_communication_status: closeForm.client_communication_status || null,
          account_fee_status: closeForm.account_fee_status || null,
          unresolved_warnings: closeForm.unresolved_warnings
            .split('\n')
            .map((w) => w.trim())
            .filter(Boolean),
          confirmation_statement: closeForm.confirmation_typed,
        }),
      });
      const data = await res.json().catch(() => ({}) as { message?: string });
      if (!res.ok) {
        setCloseError(data.message || 'Unable to close this matter.');
        return;
      }
      setShowCloseForm(false);
      setCloseForm(EMPTY_CLOSE_FORM);
      await fetchAuditEvents();
      onClosureChanged();
    } finally {
      setCloseSubmitting(false);
    }
  };

  const handleReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    setReopenError('');
    if (isDemo) {
      onShowUnavailablePrompt();
      return;
    }
    if (!reopeningReason) {
      setReopenError('Select a reopening reason.');
      return;
    }
    setReopenSubmitting(true);
    try {
      const res = await fetch(`/api/matters/${matterId}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reopening_reason: reopeningReason, notes: reopeningNotes || null }),
      });
      const data = await res.json().catch(() => ({}) as { message?: string });
      if (!res.ok) {
        setReopenError(data.message || 'Unable to reopen this matter.');
        return;
      }
      setShowReopenForm(false);
      setReopeningReason('');
      setReopeningNotes('');
      await fetchAuditEvents();
      onClosureChanged();
    } finally {
      setReopenSubmitting(false);
    }
  };

  if (isClosed) {
    return (
      <div className="mb-8 bg-[#F4EEE0] border border-[#C6A253]/40 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">🔒</span>
              <h3 className="text-sm font-black uppercase tracking-wide text-[#3A3222]">
                This Matter Register is closed and read-only
              </h3>
            </div>
            <p className="text-xs text-[#5C5340] mt-1 max-w-2xl">
              No further edits, parties, proceedings, tasks, court notes, or documents can be added until this matter
              is reopened.
            </p>
            {latestClosureEvent && (
              <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                <div>
                  <dt className="inline font-bold text-[#8A7A56] uppercase tracking-wider">Closure reason: </dt>
                  <dd className="inline text-[#3A3222] font-semibold">
                    {latestClosureEvent.new_value?.closure_reason?.replace(/_/g, ' ') || 'Not recorded'}
                  </dd>
                </div>
                {latestClosureEvent.new_value?.final_outcome && (
                  <div>
                    <dt className="inline font-bold text-[#8A7A56] uppercase tracking-wider">Final outcome: </dt>
                    <dd className="inline text-[#3A3222] font-semibold">{latestClosureEvent.new_value.final_outcome}</dd>
                  </div>
                )}
                <div>
                  <dt className="inline font-bold text-[#8A7A56] uppercase tracking-wider">Closed: </dt>
                  <dd className="inline text-[#3A3222] font-semibold">{formatDateTime(latestClosureEvent.created_at)}</dd>
                </div>
              </dl>
            )}
          </div>
          <button
            onClick={() => setShowReopenForm(!showReopenForm)}
            className="flex-none px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
          >
            {showReopenForm ? 'Cancel' : 'Reopen Matter'}
          </button>
        </div>

        {showReopenForm && (
          <form onSubmit={handleReopen} className="pt-4 border-t border-[#C6A253]/30 space-y-3">
            <div>
              <label className={labelClass} htmlFor="reopen-reason">Reopening reason *</label>
              <select
                id="reopen-reason"
                required
                value={reopeningReason}
                onChange={(e) => setReopeningReason(e.target.value as MatterReopeningReason)}
                className={`${inputClass} md:w-80 bg-white`}
              >
                <option value="">Select a reason</option>
                {MATTER_REOPENING_REASONS.map((r) => (
                  <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="reopen-notes">Notes</label>
              <textarea
                id="reopen-notes"
                value={reopeningNotes}
                onChange={(e) => setReopeningNotes(e.target.value)}
                rows={3}
                className={`${inputClass} bg-white`}
              />
            </div>
            {reopenError && <p className="text-xs font-semibold text-red-700">{reopenError}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={reopenSubmitting}
                className="px-5 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase rounded-lg shadow disabled:opacity-50"
              >
                {reopenSubmitting ? 'Reopening…' : 'Confirm Reopen'}
              </button>
            </div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="mb-8">
      {!showCloseForm ? (
        <div className="flex justify-end">
          <button
            onClick={() => setShowCloseForm(true)}
            className="px-4 py-2 border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
          >
            Close Matter
          </button>
        </div>
      ) : (
        <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">Close Matter Register</h3>
            <button
              type="button"
              onClick={() => setShowCloseForm(false)}
              className="text-xs font-bold text-[#B0A588] hover:text-[#8A7A56]"
            >
              ✕ Cancel
            </button>
          </div>

          <form onSubmit={handleClose} className="space-y-4">
            <div>
              <label className={labelClass} htmlFor="closure-reason">Closure reason *</label>
              <select
                id="closure-reason"
                required
                value={closeForm.closure_reason}
                onChange={(e) => updateCloseField('closure_reason', e.target.value as MatterClosureReason)}
                className={inputClass}
              >
                <option value="">Select a reason</option>
                {MATTER_CLOSURE_REASONS.map((r) => (
                  <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass} htmlFor="final-outcome">Final outcome</label>
                <textarea
                  id="final-outcome"
                  value={closeForm.final_outcome}
                  onChange={(e) => updateCloseField('final_outcome', e.target.value)}
                  rows={2}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="disposal-date">Disposal date</label>
                <input
                  id="disposal-date"
                  type="date"
                  value={closeForm.disposal_date}
                  onChange={(e) => updateCloseField('disposal_date', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="final-order-reference">Final order reference</label>
                <input
                  id="final-order-reference"
                  type="text"
                  value={closeForm.final_order_reference}
                  onChange={(e) => updateCloseField('final_order_reference', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="pending-obligations">Pending obligations</label>
                <textarea
                  id="pending-obligations"
                  value={closeForm.pending_obligations}
                  onChange={(e) => updateCloseField('pending_obligations', e.target.value)}
                  rows={2}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="border-t border-[#F4EEE0] pt-4 space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#B0A588]">Limitation &amp; Compliance</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="appeal-limitation-date">Appeal / review limitation date</label>
                  <input
                    id="appeal-limitation-date"
                    type="date"
                    value={closeForm.appeal_review_limitation_date}
                    onChange={(e) => updateCloseField('appeal_review_limitation_date', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="execution-compliance">Execution / compliance requirement</label>
                  <textarea
                    id="execution-compliance"
                    value={closeForm.execution_compliance_requirement}
                    onChange={(e) => updateCloseField('execution_compliance_requirement', e.target.value)}
                    rows={2}
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass} htmlFor="unresolved-warnings">
                  Unresolved warnings <span className="normal-case font-medium text-[#B0A588]">(one per line)</span>
                </label>
                <textarea
                  id="unresolved-warnings"
                  value={closeForm.unresolved_warnings}
                  onChange={(e) => updateCloseField('unresolved_warnings', e.target.value)}
                  rows={3}
                  placeholder={'e.g. Appeal limitation expires 60 days from disposal\nCourt fee refund pending'}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="border-t border-[#F4EEE0] pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass} htmlFor="original-document-status">Original document status</label>
                <input
                  id="original-document-status"
                  type="text"
                  value={closeForm.original_document_status}
                  onChange={(e) => updateCloseField('original_document_status', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="client-communication-status">Client communication status</label>
                <input
                  id="client-communication-status"
                  type="text"
                  value={closeForm.client_communication_status}
                  onChange={(e) => updateCloseField('client_communication_status', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="account-fee-status">Account / fee status</label>
                <input
                  id="account-fee-status"
                  type="text"
                  value={closeForm.account_fee_status}
                  onChange={(e) => updateCloseField('account_fee_status', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="border-t border-[#F4EEE0] pt-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-[#111111]/60">Advocate confirmation</p>
              <div className="bg-[#FBF6EA] border border-[#E7DFC9] rounded-lg p-3 text-xs text-[#3A3222] font-medium leading-relaxed">
                {MATTER_CLOSURE_CONFIRMATION_STATEMENT}
              </div>
              <label className={labelClass} htmlFor="closure-confirmation-input">
                Type the statement above exactly to confirm *
              </label>
              <textarea
                id="closure-confirmation-input"
                required
                value={closeForm.confirmation_typed}
                onChange={(e) => updateCloseField('confirmation_typed', e.target.value)}
                rows={2}
                className={`${inputClass} bg-white`}
              />
            </div>

            {closeError && <p className="text-xs font-semibold text-red-700">{closeError}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseForm(false)}
                className="px-4 py-2 border border-[#E7DFC9] text-[#8A7A56] text-xs font-bold uppercase rounded-lg hover:bg-[#FBF8F1]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={closeSubmitting || closeForm.confirmation_typed !== MATTER_CLOSURE_CONFIRMATION_STATEMENT}
                className="px-5 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase rounded-lg shadow disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {closeSubmitting ? 'Closing…' : 'Confirm & Close Matter'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
