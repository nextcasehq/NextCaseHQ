'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  const actionCards = [
    { label: 'Ask AI', href: '/dashboard/ai-chamber' },
    { label: 'Search Case Law', href: '/search' },
    { label: 'Upload Documents', href: '/documents/new' },
    { label: 'Draft Document', href: '/dashboard/draft-builder' },
    { label: 'Recent Matters', href: '/matters' },
    { label: 'Legal Research', href: '/search?type=document,court_note' },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#FDFBF7] via-[#F6F1E7] to-[#EAE0C4]">
      {/* Premium "modern glass office" abstraction — deliberately not a
          photo. A bright gradient wash (no dark library, no vintage
          archive), a soft cool-toned glass highlight, a faint precision
          grid (technology/confidence), and thin gold line-art suggesting a
          glass-and-steel skyline read as "modern legal practice" without
          competing with the UI sitting on top of it. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-24 right-[-10%] h-[32rem] w-[32rem] rounded-full opacity-40 blur-3xl"
          style={{ background: 'radial-gradient(circle, #DCE8E6 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-32 -left-24 h-[28rem] w-[28rem] rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, #C6A253 0%, transparent 70%)' }}
        />
        {/* Faint precision grid */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.05]" aria-hidden="true">
          <defs>
            <pattern id="hero-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#8A6D2F" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
        {/* Abstract glass-skyline line-art, low opacity, right-aligned so it
            never sits under the headline/search column */}
        <svg
          viewBox="0 0 400 300"
          className="absolute bottom-0 right-0 h-[70%] w-auto max-w-[45%] opacity-[0.12]"
          fill="none"
          preserveAspectRatio="xMaxYMax meet"
        >
          <g stroke="#8A6D2F" strokeWidth="1.2">
            <rect x="230" y="60" width="60" height="240" />
            <rect x="300" y="110" width="45" height="190" />
            <rect x="120" y="140" width="50" height="160" />
            <line x1="230" y1="90" x2="290" y2="90" />
            <line x1="230" y1="120" x2="290" y2="120" />
            <line x1="230" y1="150" x2="290" y2="150" />
            <line x1="230" y1="180" x2="290" y2="180" />
            <line x1="230" y1="210" x2="290" y2="210" />
            <line x1="230" y1="240" x2="290" y2="240" />
            <line x1="230" y1="270" x2="290" y2="270" />
          </g>
        </svg>
      </div>

      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-20 pt-16 text-center md:px-12 md:pb-24 md:pt-20 lg:pb-28 lg:pt-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#C6A253]/40 bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#6F5624] shadow-sm backdrop-blur-sm">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C6A253]" aria-hidden="true" />
          Zero-Knowledge · End-to-End Encrypted
        </span>

        <h1 className="mt-6 text-balance font-serif text-2xl font-black leading-tight tracking-tight text-[#241E17] md:text-4xl lg:text-[2.75rem]">
          Your Litigation Workspace. Intelligent. Unified. Trusted.
        </h1>

        <p className="mt-3 max-w-xl text-pretty text-sm leading-snug text-[#5C5340] md:text-base">
          Everything you need. Every case you care about. Search cases, analyze
          evidence, and draft compliant filings in one unified, client-side-encrypted
          workspace—NextCaseHQ never holds the keys.
        </p>

        {/* Search — the visual centrepiece. Submits to the real GET /search
            (backed by GET /api/search), not a mock. */}
        <form
          onSubmit={handleSearchSubmit}
          className="mt-8 flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-[#E7DFC9] bg-white p-2 shadow-2xl shadow-[#8A6D2F]/10 transition-all duration-300 focus-within:border-[#C6A253] focus-within:ring-4 focus-within:ring-[#C6A253]/15"
          role="search"
        >
          <span className="pl-3 text-[#8A7A56]" aria-hidden="true">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" strokeLinecap="round" />
              <path d="m20 20-3-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cases, Acts, Sections, judgments, legal questions or ask AI..."
            aria-label="Search cases, Acts, Sections, judgments, or ask AI"
            className="min-w-0 flex-1 border-none bg-transparent py-3 text-sm font-medium text-[#241E17] outline-none placeholder:text-[#9C8C6C] md:text-base"
          />
          <button
            type="submit"
            aria-label="Submit search"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8A6D2F] text-white transition-all duration-200 hover:bg-[#6F5624] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A253] focus-visible:ring-offset-2 active:scale-[0.96]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>

        {/* Action Cards — compact workflow accelerators, immediately
            visible below search (never hidden/collapsed). Every card links
            to functionality that already exists in the product; no new
            routes, no fabricated features. They stay visually secondary to
            the search bar via smaller scale, lighter weight, and a muted
            palette. */}
        <div className="mt-5 flex w-full max-w-2xl flex-wrap items-center justify-center gap-2">
          {actionCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="group inline-flex items-center gap-1.5 rounded-full border border-[#E7DFC9] bg-white/70 px-4 py-2 text-xs font-semibold text-[#5C5340] shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C6A253]/50 hover:bg-white hover:text-[#241E17] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A253]"
            >
              {card.label}
              <svg
                className="h-3 w-3 text-[#B0A588] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#8A6D2F]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-[#8A6D2F] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#8A6D2F]/20 transition-all duration-200 hover:bg-[#6F5624] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A253] focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            Access your chamber
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/features"
            className="inline-flex items-center gap-2 rounded-xl border border-[#E7DFC9] bg-white/60 px-5 py-2.5 text-sm font-semibold text-[#241E17] backdrop-blur-sm transition-all duration-200 hover:border-[#C6A253]/50 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A253] focus-visible:ring-offset-2"
          >
            Explore features
          </Link>
        </div>

        <p className="mt-6 text-[11px] font-mono font-bold uppercase tracking-widest text-[#B0A588]">
          Secure client-side pre-encryption // zero-knowledge shell
        </p>
      </div>
    </section>
  );
}
