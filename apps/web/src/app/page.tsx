import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

/**
 * NextCaseHQ: Premium Approved Landing Page v1.0
 * Strict Adherence to UI Constitution:
 * - White-first background with Warm Ivory (#FDFBF7)
 * - Obsidian Charcoal (#111111) text and headings
 * - Single Indigo/Violet accent
 * - Law-inspired "N" logo
 * - Central intelligent search bar
 * - Minimal navigation and absolute brand consistency
 */
export default function Page() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Navbar rendered directly at the top of the Landing Page */}
      <Navbar />

      {/* Central Search Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-20 max-w-4xl mx-auto w-full text-center">

        {/* Law-inspired "N" logo container */}
        <div className="mb-8 p-4 bg-white border border-neutral-100 rounded-2xl shadow-sm inline-flex items-center justify-center">
          <svg
            className="w-14 h-14 text-[#111111]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            {/* Courthouse pillars forming N */}
            <path d="M6 4v16M18 4v16M6 4l12 16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Minimalist Heading */}
        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#111111] mb-4">
          NextCase<span className="text-indigo-600">HQ</span>
        </h1>

        <p className="text-sm md:text-base text-neutral-500 max-w-md mx-auto mb-10 font-medium">
          Secure, zero-knowledge operating system for modern litigation. Search cases, analyze evidence, and draft filings in unified context.
        </p>

        {/* Central Intelligent Search Bar */}
        <div className="w-full max-w-2xl bg-white border border-neutral-200 rounded-2xl p-2 shadow-lg shadow-neutral-100/50 flex items-center gap-2 mb-12 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-600/10 transition-all">
          <span className="pl-3 text-neutral-400 text-lg">🔍</span>
          <input
            type="text"
            placeholder="Search active cases, statutes, NI Act precedents..."
            className="flex-1 bg-transparent border-none outline-none text-[#111111] text-sm md:text-base font-medium placeholder-neutral-400 py-2.5"
            disabled
          />
          <Link
            href="/login"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs md:text-sm px-6 py-2.5 rounded-xl transition-all"
          >
            Search
          </Link>
        </div>

        {/* Quick links to login */}
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs md:text-sm font-semibold text-neutral-400">
          <span className="text-neutral-500 font-bold uppercase tracking-wider">Quick Actions:</span>
          <Link href="/login" className="text-neutral-600 hover:text-indigo-600 transition-colors">Access Active Chamber</Link>
          <span className="text-neutral-200">•</span>
          <Link href="/login" className="text-neutral-600 hover:text-indigo-600 transition-colors">Ingest New File</Link>
          <span className="text-neutral-200">•</span>
          <Link href="/login" className="text-neutral-600 hover:text-indigo-600 transition-colors">Audit Immutable Ledger</Link>
        </div>

      </main>

      {/* Spacious Premium Footer */}
      <footer className="border-t border-neutral-100 bg-white px-6 md:px-12 py-10 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-[#111111]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M6 4v16M18 4v16M6 4l12 16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-bold text-sm text-[#111111]">
              NextCaseHQ<span className="text-indigo-600">.</span>
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-medium">
            © {new Date().getFullYear()} NextCaseHQ. Zero-Knowledge. Infinite Context.
          </p>
          <div className="flex gap-6 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            <Link href="/login" className="hover:text-indigo-600 transition-colors">Privacy</Link>
            <Link href="/login" className="hover:text-indigo-600 transition-colors">Terms</Link>
            <Link href="/login" className="hover:text-indigo-600 transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
