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
          NextCase<span className="text-[#111111]/60">HQ</span>
        </Link>
        <p className="mt-2 text-sm text-[#111111]/50 font-serif italic">
          AI-First Operating System for Litigation
        </p>
      </div>

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-white border border-[#C6A253]/30 rounded-xl shadow-lg shadow-black/5 p-8">
        <h2 className="text-xl font-bold uppercase tracking-wider text-center mb-6">
          Enterprise Sign In
        </h2>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-700 text-xs rounded mb-4 font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
              className="w-full px-4 py-3 bg-[#111111]/5 border border-[#111111]/10 rounded outline-none focus:border-[#C6A253] disabled:opacity-50 transition-all font-sans text-sm"
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
              className="w-full px-4 py-3 bg-[#111111]/5 border border-[#111111]/10 rounded outline-none focus:border-[#C6A253] disabled:opacity-50 transition-all font-sans text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-[#8A6D2F] text-[#F6F1E7] font-semibold tracking-wider uppercase text-sm rounded shadow hover:bg-[#6F5624] disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-[#F6F1E7] border-t-transparent rounded-full animate-spin"></span>
                Authenticating...
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>

      <div className="relative mt-8 text-center">
        <Link href="/" className="text-xs uppercase tracking-wider font-bold text-[#111111]/50 hover:text-[#111111] transition-colors">
          ← Back to Marketing Site
        </Link>
      </div>
    </div>
  );
}
