'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import JsonLd from "@/components/seo/JsonLd";

export default function LandingPageContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    router.push(`/dashboard/search?q=${encodeURIComponent(trimmed)}&query=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div
      className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col justify-between font-sans selection:bg-indigo-600 selection:text-white overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/landing-bg.jpg')" }}
    >
      {/* Structural JSON-LD schemas for Search Crawlers */}
      <JsonLd type="WebSite" />
      <JsonLd type="SoftwareApplication" />

      {/* Spacer to push content down slightly */}
      <div className="flex-none h-8 md:h-16" />

      {/* Main Centerpiece Executive Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 max-w-4xl mx-auto w-full text-center py-4">

        {/* Law-inspired "N" logo container with premium micro-interactions */}
        <div className="mb-8 p-4 bg-white border border-neutral-100 rounded-2xl shadow-md inline-flex items-center justify-center hover:scale-[1.03] hover:border-indigo-100 hover:shadow-lg transition-all duration-300 ease-out cursor-pointer group">
          <svg
            className="w-12 h-12 text-[#111111] group-hover:text-indigo-600 transition-colors duration-300"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            {/* Courthouse-inspired vertical pillars forming the letter N */}
            <path d="M6 4v16M18 4v16M6 4l12 16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex flex-col ml-3 text-left">
            <span className="font-black text-sm tracking-tight text-[#111111]">
              NextCase<span className="text-indigo-600">HQ</span>
            </span>
            <span className="text-[9px] font-mono tracking-widest uppercase text-neutral-500 font-bold leading-none mt-0.5">
              Litigation Operating System
            </span>
          </div>
        </div>

        {/* Minimalist Heading with bold brand colors */}
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-[#111111] mb-6">
          NextCase<span className="text-indigo-600">HQ</span>
        </h1>

        {/* High-Contrast Accessible Description */}
        <p className="text-sm md:text-lg text-neutral-700 max-w-xl mx-auto mb-10 font-medium font-serif italic leading-relaxed">
          Secure, zero-knowledge operating system for modern litigation. Search cases, analyze evidence, and draft filings in unified context.
        </p>

        {/* Central Intelligent Search Bar with Premium Shadows (WCAG Compliant / Highly Interactive) */}
        <form
          onSubmit={handleSearchSubmit}
          className="w-full max-w-2xl bg-white border border-neutral-200/90 rounded-full p-2.5 shadow-2xl shadow-neutral-200/50 flex items-center gap-3 mb-10 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-600/10 transition-all duration-300"
        >
          <span className="pl-4 text-indigo-600 text-xl select-none" aria-hidden="true">🔍</span>
          <input
            type="text"
            placeholder="Search active cases, statutes, NI Act precedents..."
            className="flex-1 bg-transparent border-none outline-none text-[#111111] text-sm md:text-base font-semibold placeholder-neutral-400 py-3"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search cases, statutes, and precedents"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/20 text-white font-bold text-xs md:text-sm px-8 py-3 rounded-full transition-all duration-200 active:scale-[0.98] outline-none cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Quick links to login with subtle underlines and high contrast */}
        <div className="flex flex-wrap justify-center items-center gap-x-5 gap-y-2 text-xs md:text-sm font-semibold text-neutral-600 mb-8">
          <span className="text-neutral-500 font-extrabold uppercase tracking-widest text-[9px]">Quick Actions:</span>
          <Link href="/login" className="hover:text-indigo-600 hover:underline hover:scale-[1.01] transition-all duration-200">Access Active Chamber</Link>
          <span className="text-neutral-300 select-none">•</span>
          <Link href="/login" className="hover:text-indigo-600 hover:underline hover:scale-[1.01] transition-all duration-200">Ingest New File</Link>
          <span className="text-neutral-300 select-none">•</span>
          <Link href="/login" className="hover:text-indigo-600 hover:underline hover:scale-[1.01] transition-all duration-200">Audit Immutable Ledger</Link>
        </div>

        {/* Warm Colleague Welcome Note */}
        <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-500 select-none">
          SECURE CLIENT-SIDE PRE-ENCRYPTION // ZERO-KNOWLEDGE SHELL
        </p>

      </main>

      {/* Footer (Calm, Elegant, Spacious and Empty) */}
      <footer className="w-full h-16 px-8 md:px-16 border-t border-neutral-100 bg-white/20 backdrop-blur-xs flex items-center justify-between z-10 flex-none text-[9px] font-mono text-neutral-500 font-semibold tracking-wider">
        <span>© {new Date().getFullYear()} NEXTCASEHQ TECHNOLOGIES INC.</span>
        <span>INFINITE CONTEXT. ZERO KNOWLEDGE.</span>
      </footer>

    </div>
  );
}
