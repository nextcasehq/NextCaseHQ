'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans selection:bg-indigo-600 selection:text-white">

      {/* Central Search Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-24 max-w-4xl mx-auto w-full text-center">

        {/* Law-inspired "N" logo container with micro-interactions */}
        <div className="mb-10 p-5 bg-white border border-neutral-100 rounded-2xl shadow-sm inline-flex items-center justify-center hover:scale-[1.03] hover:border-indigo-100 hover:shadow-md transition-all duration-300 ease-out cursor-pointer group">
          <svg
            className="w-14 h-14 text-[#111111] group-hover:text-indigo-600 transition-colors duration-300"
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
      </header>

        {/* Minimalist Heading */}
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-[#111111] mb-6">
          NextCase<span className="text-indigo-600">HQ</span>
        </h1>

        <p className="text-sm md:text-lg text-neutral-500 max-w-xl mx-auto mb-12 font-medium font-serif italic leading-relaxed">
          Secure, zero-knowledge operating system for modern litigation. Search cases, analyze evidence, and draft filings in unified context.
        </p>

        {/* Central Intelligent Search Bar with Premium Shadows */}
        <div className="w-full max-w-2xl bg-white border border-neutral-200 rounded-2xl p-2.5 shadow-xl shadow-neutral-200/40 flex items-center gap-3 mb-14 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-600/5 transition-all duration-300">
          <span className="pl-4 text-neutral-400 text-xl select-none">🔍</span>
          <input
            type="text"
            placeholder="Search active cases, statutes, NI Act precedents..."
            className="flex-1 bg-transparent border-none outline-none text-[#111111] text-sm md:text-base font-semibold placeholder-neutral-400 py-3"
            disabled
          />
          <Link
            href="/login"
            className="bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/15 text-white font-bold text-xs md:text-sm px-8 py-3 rounded-xl transition-all duration-200 active:scale-[0.98]"
          >
            Sign In
          </Link>
        </div>
      </header>

        {/* Quick links to login with subtle underlines */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs md:text-sm font-semibold text-neutral-400">
          <span className="text-neutral-500 font-extrabold uppercase tracking-widest text-[10px]">Quick Actions:</span>
          <Link href="/login" className="text-neutral-600 hover:text-indigo-600 hover:underline transition-all duration-200">Access Active Chamber</Link>
          <span className="text-neutral-200 select-none">•</span>
          <Link href="/login" className="text-neutral-600 hover:text-indigo-600 hover:underline transition-all duration-200">Ingest New File</Link>
          <span className="text-neutral-200 select-none">•</span>
          <Link href="/login" className="text-neutral-600 hover:text-indigo-600 hover:underline transition-all duration-200">Audit Immutable Ledger</Link>
        </div>
      </section>

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
