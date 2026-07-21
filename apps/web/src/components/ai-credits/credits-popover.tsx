'use client';

import React from 'react';
import Link from 'next/link';
import { getBalance, CURRENT_ACCOUNT_ID } from '@/lib/ai-credits/wallet-store';
import { getPlans, DEMO_CONFIGURATION_NOTICE } from '@/lib/ai-credits/catalogue';
import type { CreditBalance } from '@/lib/ai-credits/types';

/** Small top-bar account-status control — never a large dashboard widget.
 * Clicking it opens a compact popover with balance, usage summary,
 * current plan, and a link to the full AI Credits & Usage page. */
export function AiCreditsTopBarControl() {
  const [open, setOpen] = React.useState(false);
  const [balance, setBalance] = React.useState<CreditBalance | null>(null);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setBalance(getBalance(CURRENT_ACCOUNT_ID));
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  if (!balance) {
    return (
      <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E7DFC9] bg-[#FBF8F1]">
        <span aria-hidden="true" className="text-[11px]">✨</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#8A7A56]">AI Credits</span>
      </div>
    );
  }

  const plan = getPlans().find((p) => p.code === balance.planCode);
  const available = Math.max(0, balance.availableCredits - balance.reservedCredits);

  return (
    <div className="relative hidden md:block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E7DFC9] bg-[#FBF8F1] hover:bg-[#F4EEE0] transition-all"
        title="AI Credits — click for balance and usage"
      >
        <span aria-hidden="true" className="text-[11px]">✨</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#8A7A56]">AI Credits</span>
        <span className="text-xs font-black text-[#8A6D2F]">{available}</span>
      </button>

      {open && (
        <div role="dialog" className="absolute right-0 top-full mt-2 w-72 bg-white border border-[#E7DFC9] rounded-xl shadow-xl z-40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">Current Balance</span>
            <span className="text-lg font-black text-[#8A6D2F]">{available}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <p className="font-bold uppercase tracking-wider text-[#B0A588]">Current Plan</p>
              <p className="text-[#3A3222] font-semibold">{plan?.name || balance.planCode}</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-[#B0A588]">Used This Period</p>
              <p className="text-[#3A3222] font-semibold">{balance.usedCreditsThisPeriod}</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-[#B0A588]">Included Monthly</p>
              <p className="text-[#3A3222] font-semibold">{balance.monthlyIncludedCredits}</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-[#B0A588]">Promotional + Purchased</p>
              <p className="text-[#3A3222] font-semibold">{balance.promotionalCredits + balance.purchasedCredits}</p>
            </div>
          </div>
          <p className="text-[9px] text-[#B0A588] pt-2 border-t border-[#F4EEE0]">{DEMO_CONFIGURATION_NOTICE}</p>
          <Link href="/dashboard/credits" onClick={() => setOpen(false)} className="block text-center px-3 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-[#8A6D2F] text-white hover:bg-[#6F5624] transition-all">
            AI Credits &amp; Usage →
          </Link>
        </div>
      )}
    </div>
  );
}

/** Calm, dismissible-per-threshold low-balance notice. Shown at most once
 * per crossed threshold per browser session (sessionStorage-tracked), not
 * repeated on every screen. */
export function LowBalanceBanner() {
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const balance = getBalance(CURRENT_ACCOUNT_ID);
    const totalIncluded = balance.monthlyIncludedCredits || 1;
    const remainingRatio = Math.max(0, balance.availableCredits - balance.reservedCredits) / totalIncluded;

    let thresholdKey: string | null = null;
    let text: string | null = null;
    if (balance.availableCredits <= 0) {
      thresholdKey = 'zero';
      text = 'You have no AI Credits remaining. Manual Matter Register work is unaffected.';
    } else if (remainingRatio <= 0.1) {
      thresholdKey = '10';
      text = 'AI Credits are running low (10% remaining). Manual Matter Register work is unaffected.';
    } else if (remainingRatio <= 0.25) {
      thresholdKey = '25';
      text = 'AI Credits are below 25% for this period. Manual Matter Register work is unaffected.';
    }

    if (thresholdKey && text && typeof window !== 'undefined') {
      const seenKey = `nchq-ai-credits-low-balance-seen-${thresholdKey}`;
      if (!window.sessionStorage.getItem(seenKey)) {
        window.sessionStorage.setItem(seenKey, '1');
        setMessage(text);
      }
    }
  }, []);

  if (!message) return null;

  return (
    <div className="p-3 bg-[#FBF6EA] border border-[#C6A253]/40 rounded-xl flex items-center justify-between gap-4 flex-wrap">
      <p className="text-xs font-semibold text-[#5C5340]">{message}</p>
      <button onClick={() => setMessage(null)} className="text-xs font-bold text-[#B0A588] hover:text-[#8A7A56]" aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
