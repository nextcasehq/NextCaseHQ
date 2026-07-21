'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Hero() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <main className="flex-1 flex flex-col justify-center items-center px-6 py-20 max-w-4xl mx-auto w-full text-center font-sans">

      {/* Law-inspired "N" logo container with sleek executive interactions */}
      <div
        onClick={() => router.push("/")}
        className="mb-10 p-6 bg-white border border-neutral-100 rounded-2xl shadow-sm inline-flex items-center justify-center hover:scale-[1.03] hover:border-indigo-100 hover:shadow-md active:scale-[0.98] transition-all duration-300 ease-out cursor-pointer group"
      >
        <svg
          className="w-14 h-14 text-[#111111] group-hover:text-indigo-600 transition-colors duration-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          aria-hidden="true"
        >
          {/* Courthouse-inspired vertical pillars forming the letter N */}
          <path d="M6 4v16M18 4v16M6 4l12 16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div className="flex flex-col ml-3 text-left">
          <span className="font-extrabold text-lg tracking-tight text-[#111111]">
            NextCase<span className="text-indigo-600">HQ</span>
          </span>
          <span className="text-[10px] font-mono tracking-widest uppercase text-neutral-500 font-bold leading-none mt-0.5">
            Litigation Operating System
          </span>
        </div>
      </div>

      {/* Minimalist Premium Heading with strict visual hierarchy */}
      <h1 className="text-4xl md:text-6xl font-black tracking-tight text-[#111111] mb-6 leading-tight">
        Zero-Knowledge <span className="text-indigo-600">Litigation</span> Shell
      </h1>

      <p className="text-sm md:text-lg text-neutral-600 max-w-2xl mx-auto mb-12 font-medium font-serif italic leading-relaxed">
        High-density workspace architecture engineered for the 2023 Indian Legal Reforms. Query precedents, analyze evidence, and compile compliant pleadings in absolute secure context.
      </p>

      {/* Central Intelligent Search Bar with Premium Shadows & Strict Accessibility */}
      <form
        onSubmit={handleSearchSubmit}
        className="w-full max-w-2xl bg-white border border-neutral-200 rounded-2xl p-2.5 shadow-xl shadow-neutral-200/40 flex items-center gap-3 mb-12 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-600/5 transition-all duration-300"
      >
        <span className="pl-4 text-neutral-500 text-xl select-none" aria-hidden="true">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search active cases, statutes, NI Act precedents..."
          aria-label="Search active cases, statutes, NI Act precedents..."
          className="flex-1 bg-transparent border-none outline-none text-[#111111] text-sm md:text-base font-semibold placeholder-neutral-400 py-3"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-600/15 text-white font-bold text-xs md:text-sm px-8 py-3 rounded-xl transition-all duration-200 active:scale-[0.98] cursor-pointer"
        >
          Search
        </button>
      </form>

      {/* Quick links to login with subtle underlines and high-contrast labels */}
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs md:text-sm font-semibold text-neutral-500">
        <span className="text-neutral-600 font-extrabold uppercase tracking-widest text-[10px]">Quick Actions:</span>
        <Link href="/dashboard" className="text-neutral-600 hover:text-indigo-600 hover:underline transition-all duration-200">Access Active Chamber</Link>
        <span className="text-neutral-300 select-none" aria-hidden="true">•</span>
        <Link href="/documents/new" className="text-neutral-600 hover:text-indigo-600 hover:underline transition-all duration-200">Ingest New File</Link>
        <span className="text-neutral-300 select-none" aria-hidden="true">•</span>
        <Link href="/dashboard/matters" className="text-neutral-600 hover:text-indigo-600 hover:underline transition-all duration-200">Audit Immutable Ledger</Link>
      </div>

    </main>
  );
}
