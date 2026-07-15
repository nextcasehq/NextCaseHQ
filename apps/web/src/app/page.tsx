'use client';

import React from 'react';
import Link from 'next/link';

/**
 * NextCaseHQ: Premium Reimagined Static Landing Experience
 * Redesigned in full accordance with Product Design Authority guidelines:
 * - Single-viewport design (no-scroll)
 * - Generous whitespace and a warm, calm professional background
 * - Minimalist Apple/Linear/Notion-grade aesthetic
 * - Centerpiece elegant search bar with interactive CTA arrow
 * - Human-first, calm, and confident microcopy
 */
export default function Page() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  return (
    <div className="h-screen w-screen bg-[#FDFBF7] text-[#111111] font-sans flex flex-col justify-between overflow-hidden relative select-none selection:bg-indigo-600 selection:text-white">

      {/* Soft Ambient Radial Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_radial,_var(--tw-gradient-stops))] from-indigo-50/20 via-transparent to-transparent pointer-events-none z-0"></div>

      {/* 1. Header (Top Left Logo/Identity & Top Right Sign In) */}
      <header className="w-full h-24 px-8 md:px-16 flex items-center justify-between z-10 flex-none">
        <div className="flex items-center gap-3">
          <svg
            className="w-6 h-6 text-[#111111]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            {/* Courthouse-inspired vertical pillars forming the letter N */}
            <path d="M6 4v16M18 4v16M6 4l12 16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight text-[#111111]">
              NextCase<span className="text-indigo-600">HQ</span>
            </span>
            <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 font-semibold leading-none mt-0.5">
              Litigation Operating System
            </span>
          </div>
        </div>

        <div>
          <Link
            href={`${baseUrl}/login`}
            className="text-xs font-black uppercase tracking-wider text-neutral-500 hover:text-[#111111] border border-neutral-200 hover:border-[#111111] px-5 py-2.5 rounded-lg transition-all duration-200 active:scale-[0.98]"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* 2. Main Center Hero & Search Centerpiece */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 max-w-4xl mx-auto w-full text-center z-10 pb-16">

        {/* Human-First Memorandum Headline */}
        <div className="space-y-4 mb-10">
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#111111] leading-tight">
            Every case begins with a question.
          </h1>
          <p className="text-sm md:text-base text-neutral-500 max-w-lg mx-auto font-serif italic leading-relaxed">
            A minimalist workspace built for the way advocates actually work. Gather evidence, query precedents, and assemble pleadings with complete, secure context.
          </p>
        </div>

        {/* Centerpiece Intelligent Search Bar with Arrow CTA */}
        <div className="w-full max-w-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = '/login';
            }}
            className="w-full bg-white border border-neutral-200/80 rounded-full p-2.5 shadow-xl shadow-neutral-100/50 flex items-center gap-3 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-600/5 transition-all duration-300"
          >
            <span className="pl-4 text-neutral-400 text-lg select-none">🔍</span>
            <input
              type="text"
              placeholder="Search a matter, precedent, or statute..."
              className="flex-1 bg-transparent border-none outline-none text-[#111111] text-sm font-semibold placeholder-neutral-400 py-2"
            />
            <button
              type="submit"
              className="bg-[#111111] hover:bg-indigo-600 text-[#FDFBF7] p-2.5 rounded-full transition-all duration-300 flex items-center justify-center hover:shadow-lg hover:shadow-indigo-600/10 cursor-pointer active:scale-95 text-xs font-semibold"
              aria-label="Submit search query"
            >
              <span className="sr-only">Search</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </div>

        {/* Warm Colleague Welcome Note */}
        <p className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-neutral-400 mt-8 select-none">
          SECURE CLIENT-SIDE PRE-ENCRYPTION // ZERO-KNOWLEDGE SHELL
        </p>

      </main>

      {/* 3. Footer (Calm, Elegant, Spacious and Empty) */}
      <footer className="w-full h-20 px-8 md:px-16 border-t border-neutral-100 bg-white/20 backdrop-blur-xs flex items-center justify-between z-10 flex-none text-[10px] font-mono text-neutral-400 font-semibold tracking-wider">
        <span>© {new Date().getFullYear()} NEXTCASEHQ TECHNOLOGIES INC.</span>
        <span>INFINITE CONTEXT. ZERO KNOWLEDGE.</span>
      </footer>

    </div>
  );
}
