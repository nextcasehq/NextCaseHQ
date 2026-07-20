'use client';

import React from 'react';
import Link from 'next/link';
import type { AiActionKey } from '@/lib/ai-credits/types';
import { getAiAction, getSystemRules } from '@/lib/ai-credits/catalogue';
import { checkCanCharge, reserveCredits, debitForAction, releaseReservation, CURRENT_ACCOUNT_ID } from '@/lib/ai-credits/wallet-store';

function genRequestRef(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

type FlowPhase =
  | { phase: 'idle' }
  | { phase: 'confirm'; actionKey: AiActionKey; actionName: string; cost: number; matterId: string | null; reason: string }
  | { phase: 'insufficient'; actionName: string; cost: number }
  | { phase: 'blocked'; message: string };

/**
 * Implements the full Safe AI Usage Flow (identify -> enabled -> plan ->
 * cost -> balance -> show cost -> confirm -> reserve -> simulated execute
 * -> debit-on-success/release-on-failure -> exactly one ledger entry) as
 * one reusable hook. AI execution is simulated — the caller supplies a
 * `simulate` function that resolves true/false; nothing here ever calls a
 * real AI provider. A fresh request-reference id is minted per attempt so
 * retrying a distinct click never reuses another attempt's charge, and
 * confirming twice on the same confirm-dialog instance is guarded by the
 * dialog closing after the first click.
 */
export function useChargeableAiAction() {
  const [state, setState] = React.useState<FlowPhase>({ phase: 'idle' });
  const [notice, setNotice] = React.useState<string | null>(null);

  const start = React.useCallback((actionKey: AiActionKey, matterId: string | null, reason: string) => {
    const check = checkCanCharge(actionKey, CURRENT_ACCOUNT_ID);
    if (!check.allowed) {
      if (check.reason === 'insufficient_balance') {
        setState({ phase: 'insufficient', actionName: check.actionName || actionKey, cost: check.cost || 0 });
      } else {
        setState({ phase: 'blocked', message: check.reason || 'This AI action is not available.' });
      }
      return;
    }
    const action = getAiAction(actionKey);
    const rules = getSystemRules();
    const needsConfirmation = !action || action.requireConfirmationAlways || check.cost! > rules.lowCostConfirmationCeiling;
    if (needsConfirmation) {
      setState({ phase: 'confirm', actionKey, actionName: check.actionName || actionKey, cost: check.cost || 0, matterId, reason });
    } else {
      void runAction(actionKey, matterId, check.cost || 0, reason, true);
    }
  }, []);

  async function runAction(actionKey: AiActionKey, matterId: string | null, cost: number, reason: string, simulateSuccess: boolean) {
    const referenceId = genRequestRef();
    reserveCredits(actionKey, cost, CURRENT_ACCOUNT_ID);
    setState({ phase: 'idle' });
    // Simulated AI execution — no real provider call. A short delay stands
    // in for the work; simulateSuccess models the outcome for this
    // milestone (a real implementation would await the actual provider
    // response here instead).
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (simulateSuccess) {
      debitForAction({ actionKey, matterId, referenceId, cost, reason, accountId: CURRENT_ACCOUNT_ID });
      setNotice(`Used ${cost} AI Credits — action completed (prototype only — simulated execution, not a real AI call).`);
    } else {
      releaseReservation({ actionKey, referenceId, cost, reason: 'Simulated AI action failed — no credits were charged.', accountId: CURRENT_ACCOUNT_ID });
      setNotice('The simulated AI action failed — no AI Credits were charged.');
    }
  }

  const confirmAndRun = React.useCallback((simulateSuccess: boolean) => {
    if (state.phase !== 'confirm') return;
    const { actionKey, matterId, cost, reason } = state;
    void runAction(actionKey, matterId, cost, reason, simulateSuccess);
  }, [state]);

  const cancel = React.useCallback(() => {
    // A cancel at the confirm step happens before any reservation exists,
    // so it is a true no-op — nothing to release, nothing to charge.
    setState({ phase: 'idle' });
  }, []);

  const dismissNotice = React.useCallback(() => setNotice(null), []);
  const dismissBlocked = React.useCallback(() => setState({ phase: 'idle' }), []);

  return { state, notice, start, confirmAndRun, cancel, dismissNotice, dismissBlocked };
}

export function ConfirmChargeModal({
  actionName,
  cost,
  onConfirm,
  onCancel,
}: {
  actionName: string;
  cost: number;
  onConfirm: (simulateSuccess: boolean) => void;
  onCancel: () => void;
}) {
  const [simulateSuccess, setSimulateSuccess] = React.useState(true);
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wide text-[#111111]">{actionName}</h3>
        <p className="text-xs text-[#3A3222] font-semibold">
          This AI action will use {cost} AI Credits.
        </p>
        <p className="text-[10px] text-[#8A7A56]">
          Prototype execution is simulated — choose an outcome to validate the charge flow.
        </p>
        <div className="flex gap-3 text-[11px] font-semibold text-[#3A3222]">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="sim-outcome" checked={simulateSuccess} onChange={() => setSimulateSuccess(true)} />
            Simulate success
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="sim-outcome" checked={!simulateSuccess} onChange={() => setSimulateSuccess(false)} />
            Simulate failure
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all">
            Cancel
          </button>
          <button onClick={() => onConfirm(simulateSuccess)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624] transition-all">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export function InsufficientCreditsModal({ actionName, cost, onClose }: { actionName: string; cost: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wide text-[#111111]">Insufficient AI Credits</h3>
        <p className="text-xs text-[#3A3222] font-semibold">You do not have enough AI Credits for this action.</p>
        <p className="text-[10px] text-[#8A7A56]">
          {actionName} requires {cost} AI Credits. Manual drafting and ordinary Matter Register work remain fully available.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Link href="/pricing" className="text-center px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624] transition-all">
            View Plans
          </Link>
          <Link href="/dashboard/credits" className="text-center px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all">
            Buy Credits
          </Link>
          <button onClick={onClose} className="text-[11px] font-bold uppercase tracking-wider text-[#B0A588] hover:text-[#8A7A56]">
            Continue Manually
          </button>
        </div>
      </div>
    </div>
  );
}

export function BlockedActionNotice({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wide text-[#111111]">AI Action Unavailable</h3>
        <p className="text-xs text-[#3A3222] font-semibold">{message}</p>
        <button onClick={onClose} className="w-full px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624] transition-all">
          Close
        </button>
      </div>
    </div>
  );
}

/**
 * A single AI action entry point wired to the full Safe AI Usage Flow.
 * Every real "Ask AI"-style button in the product (Matter Register tabs,
 * Draft Builder) renders one of these instead of calling a chargeable
 * action directly — the confirm/insufficient/blocked modals and the
 * reserve/debit/release bookkeeping all live in one place. Manual,
 * non-AI work on the same page is never gated by this component.
 */
export function AiAssistButton({
  actionKey,
  matterId,
  label,
  reason,
}: {
  actionKey: AiActionKey;
  matterId: string | null;
  label?: string;
  reason?: string;
}) {
  const { state, notice, start, confirmAndRun, cancel, dismissNotice, dismissBlocked } = useChargeableAiAction();
  const action = getAiAction(actionKey);
  const displayLabel = label || action?.displayName || actionKey;

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <button
        onClick={() => start(actionKey, matterId, reason || `${displayLabel} for this Matter Register.`)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1] bg-white transition-all"
      >
        <span aria-hidden="true">✨</span> {displayLabel}
      </button>

      {state.phase === 'confirm' && (
        <ConfirmChargeModal actionName={state.actionName} cost={state.cost} onConfirm={confirmAndRun} onCancel={cancel} />
      )}
      {state.phase === 'insufficient' && (
        <InsufficientCreditsModal actionName={state.actionName} cost={state.cost} onClose={dismissBlocked} />
      )}
      {state.phase === 'blocked' && <BlockedActionNotice message={state.message} onClose={dismissBlocked} />}

      {notice && (
        <div className="max-w-xs p-2 bg-[#FBF6EA] border border-[#C6A253]/40 rounded-lg flex items-start justify-between gap-2">
          <p className="text-[10px] font-semibold text-[#5C5340]">{notice}</p>
          <button onClick={dismissNotice} className="text-[10px] font-bold text-[#B0A588] hover:text-[#8A7A56]" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

/** A compact "AI Assist" section card grouping a few related AiAssistButtons
 * for one Matter Register tab. Manual alternatives on the surrounding tab
 * remain available regardless of AI Credit balance — this panel only ever
 * gates the AI-assisted shortcut, never the underlying manual work. */
export function AiAssistPanel({
  title = 'AI Assist',
  matterId,
  actions,
}: {
  title?: string;
  matterId: string | null;
  actions: Array<{ actionKey: AiActionKey; label?: string }>;
}) {
  return (
    <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-5 space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">{title}</h3>
      <div className="flex flex-wrap gap-3">
        {actions.map(({ actionKey, label }) => (
          <AiAssistButton key={actionKey} actionKey={actionKey} matterId={matterId} label={label} />
        ))}
      </div>
    </div>
  );
}
