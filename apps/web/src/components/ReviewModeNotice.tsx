'use client';

import React from 'react';

/**
 * Shared copy for the two places NextCaseHQ tells a visitor something is
 * unavailable because of Product Review Mode: the full-page/section
 * auth gate (AuthOrReviewGate), and the inline write-action banner
 * (ReviewModeActionNotice). Centralized so the reason is always spelled
 * out — never a bare "Not Available" — and so every gate stays consistent
 * without copy-pasting text across pages.
 */

interface AuthOrReviewGateProps {
  /** Whether GET /api/beta-status confirmed Product Review Mode is active. */
  reviewModeActive: boolean;
  /** What can't be opened, e.g. "the Case Diary", "this case workspace". */
  what: string;
  /** Sign-in copy shown when review mode is NOT active (real auth wall). */
  authDescription: string;
  headingClassName?: string;
  bodyClassName?: string;
}

export function AuthOrReviewGate({
  reviewModeActive,
  what,
  authDescription,
  headingClassName = 'text-base font-bold text-[#4A4130] mt-3',
  bodyClassName = 'text-xs text-[#726B58] mt-1 max-w-sm mx-auto',
}: AuthOrReviewGateProps) {
  if (reviewModeActive) {
    return (
      <>
        <span className="text-3xl">👁️</span>
        <h3 className={headingClassName}>Preview Mode — Sign-In Unavailable</h3>
        <p className={bodyClassName}>
          {`You're viewing a public, unauthenticated preview of NextCaseHQ (Product Review Mode). Sign-in is disabled in this preview, so ${what} can't be opened here — it works normally once production accounts are activated.`}
        </p>
      </>
    );
  }
  return (
    <>
      <span className="text-3xl">🔒</span>
      <h3 className={headingClassName}>Authentication Required</h3>
      <p className={bodyClassName}>{authDescription}</p>
      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#8A6D2F]">
        Phone verification is required to save or access private work.
      </p>
    </>
  );
}

interface ReviewModeActionNoticeProps {
  /** The action that was blocked, e.g. "Saving matters", "Draft generation". */
  action: string;
  onDismiss: () => void;
  className?: string;
}

export function ReviewModeActionNotice({ action, onDismiss, className }: ReviewModeActionNoticeProps) {
  return (
    <div
      className={
        className ?? 'mb-4 p-4 bg-[#FBF6EA] border border-[#C6A253]/40 rounded-xl flex items-center justify-between gap-4 flex-wrap'
      }
    >
      <p className="text-xs font-semibold text-[#5C5340]">
        {`${action} is disabled in this public review preview — it works normally once production accounts are activated. Nothing was saved.`}
      </p>
      <button onClick={onDismiss} className="text-xs font-bold text-[#726B58] hover:text-[#6F5624]" aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
