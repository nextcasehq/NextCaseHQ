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
    router.push(
      `/dashboard/search?q=${encodeURIComponent(trimmed)}&query=${encodeURIComponent(trimmed)}`,
    );
  };

  return (
    <section className="relative overflow-hidden bg-[#0E241B]">
      {/* Law-library bookshelf background */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/landing/law-library-bg.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      />
      {/* Readability overlay — deep green espresso gradient */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0B1F17]/95 via-[#0E241B]/85 to-[#0E241B]/50"
      />

      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-6 py-16 md:px-12 lg:grid-cols-2 lg:gap-12 lg:py-24">
        {/* Left column: copy + search + CTAs */}
        <div className="flex flex-col items-start text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#C6A253]/40 bg-[#0B1F17]/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-[#E4C77E] shadow-sm backdrop-blur-sm">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C6A253]" aria-hidden="true" />
            Zero-Knowledge · End-to-End Encrypted
          </span>

          <h1 className="mt-6 text-balance font-serif text-4xl font-black leading-tight tracking-tight text-[#F6F1E7] md:text-6xl">
            The litigation operating system built for absolute confidentiality.
          </h1>

          <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-[#D9CBB2] md:text-lg">
            Search cases, analyze evidence, and draft compliant filings in one
            unified, client-side-encrypted workspace. Your data stays private by
            design—NextCaseHQ never holds the keys.
          </p>

          {/* Search — preserves existing /dashboard/search behavior */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-8 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-[#C6A253]/30 bg-[#F6F1E7] p-2 shadow-2xl shadow-black/40 transition-all duration-300 focus-within:border-[#C6A253] focus-within:ring-4 focus-within:ring-[#C6A253]/20"
            role="search"
          >
            <span className="pl-3 text-[#8A7A56]" aria-hidden="true">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" strokeLinecap="round" />
                <path d="m20 20-3-3" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cases, statutes, and NI Act precedents..."
              aria-label="Search cases, statutes, and precedents"
              className="min-w-0 flex-1 border-none bg-transparent py-2.5 text-sm font-medium text-[#241E17] outline-none placeholder:text-[#9C8C6C] md:text-base"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-[#8A6D2F] px-6 py-2.5 text-sm font-bold text-[#F6F1E7] transition-all duration-200 hover:bg-[#6F5624] hover:shadow-lg hover:shadow-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A253] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E241B] active:scale-[0.98]"
            >
              Search
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[#8A6D2F] px-6 py-3 text-sm font-semibold text-[#F6F1E7] transition-all duration-200 hover:bg-[#6F5624] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A253] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E241B] active:scale-[0.98]"
            >
              Access your chamber
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              href="/features"
              className="inline-flex items-center gap-2 rounded-xl border border-[#C6A253]/40 bg-[#0B1F17]/40 px-6 py-3 text-sm font-semibold text-[#F6F1E7] backdrop-blur-sm transition-all duration-200 hover:border-[#C6A253]/70 hover:bg-[#0B1F17]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A253] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E241B]"
            >
              Explore features
            </Link>
          </div>

          <p className="mt-6 text-[11px] font-mono font-bold uppercase tracking-widest text-[#B0A180]">
            Secure client-side pre-encryption // zero-knowledge shell
          </p>
        </div>

        {/* Right column: product preview */}
        <div className="relative">
          <div className="relative overflow-hidden rounded-2xl border border-[#C6A253]/30 bg-white shadow-2xl shadow-black/50">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-neutral-300" aria-hidden="true" />
              <span className="h-3 w-3 rounded-full bg-neutral-300" aria-hidden="true" />
              <span className="h-3 w-3 rounded-full bg-neutral-300" aria-hidden="true" />
              <span className="ml-3 truncate text-xs font-medium text-neutral-400">
                app.nextcasehq.com/dashboard
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/landing/product-preview.png"
              alt="NextCaseHQ dashboard preview showing case navigation, an evidence timeline, and an AI legal assistant summary panel"
              className="block h-auto w-full"
              width={1200}
              height={900}
            />
          </div>

          {/* Floating security badge */}
          <div className="absolute -bottom-4 -left-4 hidden items-center gap-3 rounded-xl border border-[#C6A253]/30 bg-[#F6F1E7] px-4 py-3 shadow-xl sm:flex">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#8A6D2F] text-[#F6F1E7]" aria-hidden="true">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z" strokeLinecap="round" strokeLinejoin="round" />
                <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="leading-tight">
              <p className="text-xs font-bold text-[#241E17]">Keys never leave the device</p>
              <p className="text-[11px] text-[#6F6248]">AES-256 envelope encryption</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
