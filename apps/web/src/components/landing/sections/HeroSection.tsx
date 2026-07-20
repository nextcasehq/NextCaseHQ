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
    { label: '⚡ Ask AI', href: '/dashboard/ai-chamber' },
    { label: '🔍 Search Case Law', href: '/search' },
    { label: '📤 Upload Documents', href: '/documents/new' },
    { label: '✍️ Draft Document', href: '/dashboard/draft-builder' },
    { label: '📁 Open Recent Matters', href: '/matters' },
  ];

  return (
    <section className="relative overflow-hidden bg-[#0E241B]">
      {/* Law-office bookshelf photo — a clean band cropped from the
          reference image (bookshelf, courthouse etching, brass lamp,
          Lady Justice statuette), with none of the source mockup's own
          baked-in wordmark/search bar/copy. It reads as an atmospheric
          banner that dissolves into the brand-dark field the real
          content sits on, so nothing ever renders text-on-text. */}
      <div className="relative h-[220px] w-full sm:h-[280px] md:h-[340px] lg:h-[400px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/landing/hero-bookshelf-band.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0B1F17]/25 via-[#0E241B]/70 to-[#0E241B]"
        />
      </div>

      <div className="relative mx-auto -mt-10 flex w-full max-w-3xl flex-col items-center px-6 pb-16 text-center md:px-12 md:pb-20 lg:-mt-16 lg:pb-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#C6A253]/40 bg-[#0B1F17]/60 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#E4C77E] shadow-sm backdrop-blur-sm">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C6A253]" aria-hidden="true" />
          Zero-Knowledge · End-to-End Encrypted
        </span>

        {/* Search — submits to the real production search (GET /search,
            backed by GET /api/search), not the mock dashboard/search page. */}
        <form
          onSubmit={handleSearchSubmit}
          className="mt-6 flex w-full max-w-2xl items-center gap-2 rounded-2xl border border-[#C6A253]/30 bg-[#F6F1E7] p-1.5 shadow-xl shadow-black/25 transition-all duration-300 focus-within:border-[#C6A253] focus-within:ring-4 focus-within:ring-[#C6A253]/20"
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
            placeholder="Search cases, Acts, Sections, judgments, legal questions, or ask AI..."
            aria-label="Search cases, Acts, Sections, judgments, or ask AI"
            className="min-w-0 flex-1 border-none bg-transparent py-2.5 text-sm font-medium text-[#241E17] outline-none placeholder:text-[#9C8C6C] md:text-base"
          />
          <button
            type="submit"
            aria-label="Submit search"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#C6A253] text-[#241E17] transition-all duration-200 hover:bg-[#E4C77E] hover:shadow-lg hover:shadow-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A253] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E241B] active:scale-[0.98]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>

        {/* Action Cards — compact workflow accelerators, not a second nav
            (Matters/Cases/Features stay the Navbar's job). Every card links
            to functionality that already exists in the product; none of
            these are new routes or fabricated features. They recede below
            the search bar rather than competing with it for attention. */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {actionCards.map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="rounded-lg border border-[#C6A253]/30 bg-[#0B1F17]/40 px-3.5 py-1.5 text-xs font-semibold text-[#D9CBB2] backdrop-blur-sm transition-all duration-200 hover:border-[#C6A253]/60 hover:bg-[#0B1F17]/70 hover:text-[#F6F1E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A253] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E241B]"
            >
              {card.label}
            </Link>
          ))}
        </div>

        <h1 className="mt-8 text-balance font-serif text-2xl font-black leading-tight tracking-tight text-[#F6F1E7] md:text-4xl lg:text-[2.75rem]">
          Your Litigation Workspace. Intelligent. Unified. Trusted.
        </h1>

        <div className="mt-4 flex items-center gap-3 text-[#C6A253]" aria-hidden="true">
          <span className="h-px w-10 bg-[#C6A253]/50" />
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 21h12M8 21V9M16 21V9M4 9l8-5 8 5M6 9h12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="h-px w-10 bg-[#C6A253]/50" />
        </div>

        <p className="mt-4 max-w-xl text-pretty text-sm leading-snug text-[#D9CBB2] md:text-base">
          Everything you need. Every case you care about. Search cases, analyze
          evidence, and draft compliant filings in one unified, client-side-encrypted
          workspace—NextCaseHQ never holds the keys.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-[#8A6D2F] px-6 py-2.5 text-sm font-semibold text-[#F6F1E7] transition-all duration-200 hover:bg-[#6F5624] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A253] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E241B] active:scale-[0.98]"
          >
            Access your chamber
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/features"
            className="inline-flex items-center gap-2 rounded-xl border border-[#C6A253]/40 bg-[#0B1F17]/40 px-6 py-2.5 text-sm font-semibold text-[#F6F1E7] backdrop-blur-sm transition-all duration-200 hover:border-[#C6A253]/70 hover:bg-[#0B1F17]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A253] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E241B]"
          >
            Explore features
          </Link>
        </div>

        <p className="mt-6 text-[11px] font-mono font-bold uppercase tracking-widest text-[#B0A180]">
          Secure client-side pre-encryption // zero-knowledge shell
        </p>
      </div>
    </section>
  );
}
