'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BrandBackground from '@/components/BrandBackground';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!email.includes('@')) {
      setError('Please enter a valid enterprise email address.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError('Invalid email or password.');
        setIsLoading(false);
        return;
      }

      router.push('/organization');
    } catch {
      setError('Unable to reach the authentication service. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#FDFBF7] text-[#111111] flex flex-col justify-center items-center px-6 py-12 font-sans selection:bg-[#111111] selection:text-[#FDFBF7]">
      <BrandBackground />

      {/* Brand Header */}
      <div className="relative mb-8 text-center">
        <Link href="/" className="text-3xl font-black tracking-tight text-[#111111]">
          NextCase<span className="text-[#8A6D2F]">HQ</span>
        </Link>
        <p className="mt-2 text-sm text-[#111111]/50 font-serif italic">
          AI-First Operating System for Litigation
        </p>
      </div>

      {/* Main Login Card — centered, generous whitespace, soft premium
          shadow; compact controls and an arrow-style primary action rather
          than a heavy full-bleed button. */}
      <div className="relative w-full max-w-md bg-white border border-[#E7DFC9] rounded-2xl shadow-2xl shadow-[#8A6D2F]/10 p-10">
        <h2 className="text-center font-serif text-2xl font-black tracking-tight text-[#241E17]">
          Welcome back
        </h2>
        <p className="mt-1.5 text-center text-xs text-[#8A7A56]">
          Sign in to your secure chamber
        </p>

        {error && (
          <div className="mt-6 p-3 bg-red-500/10 border border-red-500/20 text-red-700 text-xs rounded-lg font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#111111]/60 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@firm.com"
              required
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#C6A253] disabled:opacity-50 transition-all font-sans text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#111111]/60 mb-2">
              Security Key / Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={isLoading}
              className="w-full px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#C6A253] disabled:opacity-50 transition-all font-sans text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-[#8A6D2F] text-white font-semibold text-sm rounded-xl shadow-md shadow-[#8A6D2F]/20 hover:bg-[#6F5624] hover:shadow-lg disabled:opacity-50 active:scale-[0.98] transition-all"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Authenticating...
              </>
            ) : (
              <>
                Sign In
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="relative mt-8 text-center">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8A7A56] hover:text-[#241E17] transition-colors">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M19 12H5M11 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Marketing Site
        </Link>
      </div>
    </div>
  );
}
