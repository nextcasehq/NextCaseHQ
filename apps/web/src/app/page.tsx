'use client';

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function Page() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    router.push(`/dashboard/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Navbar rendered directly at the top of the Landing Page */}
      <Navbar />

      {/* 1. HERO SECTION */}
      <header className="relative overflow-hidden py-24 md:py-32 border-b border-neutral-200/60 bg-white">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-8 relative z-10">

          {/* Law-inspired "N" logo container */}
          <div className="mb-2 p-4 bg-[#FDFBF7] border border-neutral-100 rounded-2xl shadow-sm inline-flex items-center justify-center">
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

          {/* Strong Product Headline */}
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-[#111111] leading-tight">
            The Operating System <br />
            for Modern <span className="text-indigo-600">Litigation.</span>
          </h1>

          {/* Clear Value Proposition */}
          <p className="text-base md:text-lg text-neutral-500 max-w-2xl mx-auto font-medium leading-relaxed font-serif italic">
            Secure, zero-knowledge workspace for elite law firms and corporate legal teams.
            Connect dockets, index exhibits, and draft pleadings in a unified cognitive context.
          </p>

          {/* Central Intelligent Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="w-full max-w-2xl mx-auto bg-[#FDFBF7] border border-neutral-200 rounded-2xl p-2 shadow-lg shadow-neutral-100/30 flex items-center gap-2 mb-8 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-600/10 transition-all"
          >
            <span className="pl-3 text-neutral-400 text-lg">🔍</span>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(); }}
              placeholder="Search active dockets, statutes, NI Act precedents..."
              className="flex-1 bg-transparent border-none outline-none text-[#111111] text-sm md:text-base font-medium placeholder-neutral-400 py-2.5"
            />
            <button
              type="submit"
              className="bg-[#111111] hover:bg-neutral-800 text-white font-semibold text-xs md:text-sm px-6 py-2.5 rounded-xl transition-all"
            >
              Search
            </button>
          </form>

          {/* Primary and Secondary CTAs */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/login"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs md:text-sm font-bold uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-md transition-all"
            >
              Enter Active Chamber
            </Link>
            <Link
              href="/login"
              className="bg-white border border-neutral-200 hover:border-neutral-400 text-neutral-600 text-xs md:text-sm font-bold uppercase tracking-wider px-6 py-3.5 rounded-xl transition-all"
            >
              Request Enterprise Access
            </Link>
          </div>
        </div>
      </header>

      {/* 2. KEY FEATURES */}
      <section className="py-20 bg-[#FDFBF7] border-b border-neutral-200/60">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
              Capabilities
            </span>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#111111] mt-3">
              Built for the Rigor of Trial Practice
            </h2>
            <p className="text-xs text-neutral-400 uppercase tracking-wider font-bold mt-1">
              Every tool necessary to prepare, analyze, and win cases.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: 'Matter Management', desc: 'Secure, RLS-isolated registry to manage corporate clients, practice groups, and un-compromised conflict checks.', icon: '📂' },
              { title: 'Case Workspace', desc: 'A central command workspace for dockets, court stages, coram rulings tracking, and live courtroom notes.', icon: '⚖️' },
              { title: 'AI Trial Chamber', desc: 'A dedicated, secure RAG assistant that critiques arguments, drafts pleading outlines, and interrogates evidence.', icon: '⚡' },
              { title: 'Evidence Ledger', desc: 'Cryptographically signed evidence registrar calculating SHA-256 signatures to preserve absolute chain of custody.', icon: '⛓️' },
              { title: 'Chronos Timeline', desc: 'Interactive temporal mapping engine that plots event chronologies and automatically flags contradictory statement dates.', icon: '⏰' },
              { title: 'Knowledge Graph', desc: 'Map actor, expert witness, shareholder, and judge connections across cases to find hidden relational dockets.', icon: '🕸️' }
            ].map((feat, idx) => (
              <div key={idx} className="bg-white border border-neutral-200/60 rounded-xl p-6 shadow-sm hover:border-indigo-300 transition-all">
                <span className="text-2xl mb-4 block">{feat.icon}</span>
                <h3 className="font-bold text-sm text-[#111111] uppercase tracking-wide mb-2">{feat.title}</h3>
                <p className="text-xs text-neutral-500 leading-relaxed font-medium">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. WHY NEXTCASEHQ */}
      <section className="py-20 bg-white border-b border-neutral-200/60">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
              Sovereignty
            </span>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#111111]">
              Decoupled, Zero-Knowledge Security
            </h2>
            <p className="text-sm font-serif italic text-neutral-500 leading-relaxed">
              Litigation files are high-stakes intellectual property. NextCaseHQ does not trust external models, shared cloud backends, or unified indexing buckets.
            </p>
            <div className="space-y-3">
              {[
                'Strict PostgreSQL Row-Level Security (RLS) policies.',
                'Metadata sanitization and edge-optimized Indian PII scrubbers.',
                'Immutable transaction log files secured by HMAC-SHA256.',
                'Local-first offline database caches (IndexedDB).'
              ].map((point, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-indigo-600 font-bold">✓</span>
                  <span className="text-xs font-bold text-neutral-700 uppercase tracking-wide">{point}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#FDFBF7] border border-neutral-200 rounded-2xl p-8 space-y-6 shadow-md">
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-2">
              The Litigator’s Advantage
            </h3>
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-bold text-neutral-800">100% Focused</span>
                <p className="text-xs text-neutral-500 mt-0.5">We do not build generic timers or admin trackers; we build litigation weaponry.</p>
              </div>
              <div>
                <span className="block text-xs font-bold text-neutral-800">0% Hallucination Gate</span>
                <p className="text-xs text-neutral-500 mt-0.5">Citations are strictly bound to verified court registries and exhibits ledger.</p>
              </div>
              <div>
                <span className="block text-xs font-bold text-neutral-800">Cognitive Alignment</span>
                <p className="text-xs text-neutral-500 mt-0.5">Triple-panel layout ensures evidence, dialogue, and draft are always visible.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRODUCT PREVIEW */}
      <section className="py-20 bg-[#FDFBF7] border-b border-neutral-200/60 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
              Preview
            </span>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#111111] mt-3">
              The Three-Panel Trial War Room
            </h2>
          </div>

          {/* Premium styled HTML layout preview */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden max-w-5xl mx-auto">
            {/* Header Row */}
            <div className="h-10 border-b border-neutral-100 bg-neutral-50/50 px-4 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <span className="text-[10px] font-mono text-neutral-400 ml-4">nextcasehq-chamber-view // SECURE</span>
            </div>

            {/* Simulated Three Panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-100 h-96 text-left">
              {/* Panel 1 */}
              <div className="p-5 space-y-3 bg-neutral-50/20">
                <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest block">EXHIBITS LEDGER</span>
                <div className="p-3 bg-white border border-neutral-150 rounded-lg shadow-sm">
                  <span className="text-[9px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">EX-B</span>
                  <h4 className="font-bold text-xs text-neutral-800 mt-1">Section 138 Notice Receipt</h4>
                  <p className="text-[10px] text-neutral-400 font-mono mt-0.5">SHA: 4f46e5ba2b14...</p>
                </div>
              </div>

              {/* Panel 2 */}
              <div className="p-5 space-y-4">
                <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest block">AI CHAMBER DIALOGUE</span>
                <div className="space-y-3">
                  <div className="p-3 bg-neutral-50 rounded-xl text-[11px] font-serif leading-relaxed">
                    <span className="block text-[8px] font-mono text-neutral-400">COUNSEL</span>
                    Is the demand notice served within statutory limitation?
                  </div>
                  <div className="p-3 bg-white border border-neutral-100 rounded-xl text-[11px] font-serif leading-relaxed shadow-sm">
                    <span className="block text-[8px] font-mono text-indigo-600">ASSISTANT</span>
                    Yes, Exhibit B confirms service on 15-Jan, within 4 days of dishonour. Presumption under Sec 139 applies.
                  </div>
                </div>
              </div>

              {/* Panel 3 */}
              <div className="p-5 space-y-3 bg-neutral-50/20">
                <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest block">DRAFTING CANVAS</span>
                <div className="p-4 bg-white border border-neutral-150 rounded-xl h-full shadow-sm flex flex-col justify-between">
                  <div className="text-center pb-2 border-b border-neutral-100">
                    <h5 className="font-black text-[10px] text-neutral-800 uppercase tracking-widest">HIGH COURT OF DELHI</h5>
                  </div>
                  <p className="text-[10px] font-serif text-neutral-500 italic">Writ Petition Civil No. 132/2026...</p>
                  <span className="text-[8px] bg-indigo-50 text-indigo-700 font-bold rounded px-1.5 py-0.5 self-start">SIGNATURE ENFORCED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TRUST & ENTERPRISE ARCHITECTURE */}
      <section className="py-20 bg-white border-b border-neutral-200/60">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-12">
          <div className="max-w-2xl mx-auto">
            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-widest">
              Trust Profile
            </span>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#111111] mt-3">
              Certified Enterprise Governance
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {[
              { title: 'Zero-Knowledge', desc: 'No unencrypted client files are cached or transmitted. Credentials reside strictly behind client-side hashing vaults.', icon: '🛡️' },
              { title: 'RLS Contexts', desc: 'Database connections enforce hard Postgres Row-Level Security checks. Complete data separation guaranteed.', icon: '🔒' },
              { title: 'OTel Monitoring', desc: 'OpenTelemetry tracing monitors latency budgets, database queries, and edge extraction under 5ms.', icon: '📊' },
              { title: 'Active Sentinels', desc: 'Every commit is rigorously audited by 5 independent verification sentinels to guarantee zero regressions.', icon: '🤖' }
            ].map((box, idx) => (
              <div key={idx} className="p-5 border border-neutral-200 rounded-xl">
                <span className="text-xl block mb-2">{box.icon}</span>
                <h4 className="font-bold text-xs text-[#111111] uppercase tracking-wide mb-1">{box.title}</h4>
                <p className="text-[11px] text-neutral-500 leading-relaxed font-medium">{box.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FINAL CALL TO ACTION */}
      <section className="py-24 bg-[#FDFBF7] text-center space-y-6">
        <div className="max-w-3xl mx-auto px-6 space-y-6">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-[#111111]">
            Ready to Armed Your Firm?
          </h2>
          <p className="text-sm font-serif italic text-neutral-500 max-w-xl mx-auto leading-relaxed">
            Transition your practice from administrative software to an active litigation intelligence operating system.
          </p>
          <div className="pt-4">
            <Link
              href="/login"
              className="bg-[#111111] hover:bg-neutral-800 text-white font-bold text-xs md:text-sm uppercase tracking-wider px-8 py-4 rounded-xl transition-all shadow-md inline-block"
            >
              Sign In & Deploy Chamber
            </Link>
          </div>
        </div>
      </section>

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
