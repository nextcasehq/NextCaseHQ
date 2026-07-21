'use client';

import React from 'react';
import { sanitizeReturnTo, RETURN_TO_FALLBACK } from '@/lib/auth/return-to';

type Step = 'phone' | 'otp';

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Phone OTP Authentication's single public entry point. Reached either
 * directly, or via proxy.ts redirecting an unauthenticated visitor from a
 * protected /dashboard route with ?returnTo=<original path> — verification
 * success sends them back there instead of always landing on /dashboard.
 */
export default function VerifyPhonePage() {
  const [step, setStep] = React.useState<Step>('phone');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [otp, setOtp] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);

  const phoneInputRef = React.useRef<HTMLInputElement>(null);
  const otpInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (step === 'phone') phoneInputRef.current?.focus();
    else otpInputRef.current?.focus();
  }, [step]);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const returnTo = React.useMemo(() => {
    if (typeof window === 'undefined') return RETURN_TO_FALLBACK;
    return sanitizeReturnTo(new URLSearchParams(window.location.search).get('returnTo'));
  }, []);

  const requestOtp = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message || 'Something went wrong. Please try again.');
        return;
      }
      setStep('otp');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otp }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.authenticated) {
        setError(data?.message || 'The verification code is invalid or has expired.');
        return;
      }
      // Full navigation (not client-side routing) so the server sees the
      // freshly-set session cookie on the very next request — proxy.ts's
      // gate on the destination route must re-run against a real request.
      window.location.href = returnTo;
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex items-center justify-center px-4 py-16 font-sans">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-lg font-black tracking-tight">
            NextCase<span className="text-[#8A6D2F]">HQ</span>
          </h1>
          <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-[#B0A588]">Verify Phone</p>
        </div>

        <div className="bg-white border border-[#E7DFC9] rounded-2xl p-6 shadow-sm space-y-4">
          {step === 'phone' ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!submitting) void requestOtp();
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="phoneNumber" className="block text-[10px] font-bold uppercase tracking-wider text-[#8A7A56] mb-1">
                  Phone Number
                </label>
                <input
                  ref={phoneInputRef}
                  id="phoneNumber"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  placeholder="+91 98XXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg text-sm outline-none focus:border-[#8A6D2F]"
                  required
                />
              </div>
              {error && (
                <p role="alert" className="text-xs font-semibold text-red-700">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting || !phoneNumber}
                className="w-full py-2.5 bg-[#111111] hover:bg-[#111111]/90 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-all"
              >
                {submitting ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!submitting) void verifyOtp();
              }}
              className="space-y-4"
            >
              <p className="text-xs text-[#5C5340]">
                Enter the 6-digit code sent to <span className="font-semibold">{phoneNumber}</span>.
              </p>
              <div>
                <label htmlFor="otp" className="block text-[10px] font-bold uppercase tracking-wider text-[#8A7A56] mb-1">
                  Verification Code
                </label>
                <input
                  ref={otpInputRef}
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-3 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg text-sm tracking-[0.3em] outline-none focus:border-[#8A6D2F]"
                  required
                />
              </div>
              {error && (
                <p role="alert" className="text-xs font-semibold text-red-700">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={submitting || otp.length !== 6}
                className="w-full py-2.5 bg-[#111111] hover:bg-[#111111]/90 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition-all"
              >
                {submitting ? 'Verifying...' : 'Verify Code'}
              </button>
              <div className="flex items-center justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                    setError(null);
                  }}
                  className="font-semibold text-[#8A6D2F] hover:underline"
                >
                  Change phone number
                </button>
                <button
                  type="button"
                  onClick={() => void requestOtp()}
                  disabled={cooldown > 0 || submitting}
                  className="font-semibold text-[#8A6D2F] hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
