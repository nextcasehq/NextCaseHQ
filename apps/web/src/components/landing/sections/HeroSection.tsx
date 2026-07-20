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
    <section className="relative overflow-hidden bg-white">
      {/* Real photo background — a genuine advocate's-office library
          shelf photo already in this repo (apps/web/public/landing/
          law-library-bg.png), color-graded from its original dark/moody
          grade into a brighter, warmer, premium tone (apps/web/public/
          landing/hero-office-band-soft.jpg): brightened, softened with a
          slight blur so individual spine labels read as warm texture
          rather than literal old typography, and lightly desaturated.
          A real photograph, not an illustration — zero licensing risk
          since it's already a repo-owned asset, just reprocessed. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/landing/hero-office-band-soft.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Readability scrim — a soft warm-white gradient so the badge,
            headline, search bar, and Action Cards stay highly legible
            over the photo at every breakpoint. Strongest at the very
            bottom so the footnote text never sits directly on the photo. */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/55 via-white/35 to-white/70" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white via-white/85 to-transparent" />
      </div>

      <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-6 pb-10 pt-8 text-center md:px-12 md:pt-10 lg:pt-12">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#C6A253]/40 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#6F5624] shadow-sm backdrop-blur-sm">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C6A253]" aria-hidden="true" />
          Zero-Knowledge · End-to-End Encrypted
        </span>

        <h1 className="mt-4 text-balance font-serif text-xl font-black leading-tight tracking-tight text-[#241E17] sm:text-2xl lg:text-3xl">
          Your Litigation Workspace. Intelligent. Unified. Trusted.
        </h1>

        {/* Search — the visual centrepiece, placed immediately after the
            headline so it (and the Action Cards below it) land inside the
            first viewport on standard laptop/desktop heights. Submits to
            the real GET /search (backed by GET /api/search), not a mock. */}
        <form
          onSubmit={handleSearchSubmit}
          className="mt-5 flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-[#E7DFC9] bg-white p-2 shadow-2xl shadow-[#8A6D2F]/15 transition-all duration-300 focus-within:border-[#C6A253] focus-within:ring-4 focus-within:ring-[#C6A253]/15"
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
            className="min-w-0 flex-1 border-none bg-transparent py-2.5 text-sm font-medium text-[#241E17] outline-none placeholder:text-[#9C8C6C] md:text-base"
          />
          <button
            type="submit"
            aria-label="Submit search"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#8A6D2F] text-white transition-all duration-200 hover:bg-[#6F5624] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A253] focus-visible:ring-offset-2 active:scale-[0.96]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>

        {/* Action Cards — compact workflow accelerators, immediately
            visible below search (never hidden/collapsed, never requiring a
            scroll on standard laptop/desktop heights). Every card links to
            functionality that already exists in the product; no new
            routes, no fabricated features. A wider column than the search
            bar lets all six fit in a single row at md+ instead of wrapping
            to a third row. */}
        <div className="mt-4 flex w-full max-w-3xl flex-wrap items-center justify-center gap-2">
          {actionCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="group inline-flex items-center gap-1.5 rounded-full border border-[#E7DFC9] bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-[#5C5340] shadow-sm backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C6A253]/50 hover:bg-white hover:text-[#241E17] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A253]"
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

        <p className="mt-5 max-w-xl text-pretty text-sm leading-snug text-[#5C5340]">
          Everything you need. Every case you care about. Search cases, analyze
          evidence, and draft compliant filings in one unified, client-side-encrypted
          workspace—NextCaseHQ never holds the keys.
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
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

        <p className="mt-5 text-[11px] font-mono font-bold uppercase tracking-widest text-[#B0A588]">
          Secure client-side pre-encryption // zero-knowledge shell
        </p>
      </div>
    </section>
  );
}
