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
      {/* Readability overlay — deep green espresso gradient. Kept light
          enough that the bookshelf photo actually reads as a background,
          not just a flat dark panel; text still holds contrast against the
          darker left-hand stop where the copy sits. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0B1F17]/80 via-[#0E241B]/55 to-[#0E241B]/25"
      />

      <div className="relative mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-6 px-6 py-8 md:px-12 lg:grid-cols-2 lg:gap-10 lg:py-10">
        {/* Left column: copy + search + CTAs. Sizing/spacing here is
            deliberately compact — the search bar must be visible in the
            first viewport frame on a 13" laptop without scrolling, so
            every element above it (badge/heading/paragraph) is kept as
            small as the design can reasonably take. */}
        <div className="flex flex-col items-start text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#C6A253]/40 bg-[#0B1F17]/60 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#E4C77E] shadow-sm backdrop-blur-sm">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C6A253]" aria-hidden="true" />
            Zero-Knowledge · End-to-End Encrypted
          </span>

          <h1 className="mt-3 text-balance font-serif text-2xl font-black leading-tight tracking-tight text-[#F6F1E7] md:text-4xl lg:text-[2.75rem]">
            The litigation operating system built for absolute confidentiality.
          </h1>

          <p className="mt-2 max-w-xl text-pretty text-sm leading-snug text-[#D9CBB2] md:text-base">
            Search cases, analyze evidence, and draft compliant filings in one
            unified, client-side-encrypted workspace. Your data stays private by
            design—NextCaseHQ never holds the keys.
          </p>

          {/* Search — preserves existing /dashboard/search behavior */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-4 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-[#C6A253]/30 bg-[#F6F1E7] p-1.5 shadow-lg shadow-black/15 transition-all duration-300 focus-within:border-[#C6A253] focus-within:ring-4 focus-within:ring-[#C6A253]/20"
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

          <div className="mt-4 flex flex-wrap items-center gap-3">
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

          <p className="mt-3 text-[11px] font-mono font-bold uppercase tracking-widest text-[#B0A180]">
            Secure client-side pre-encryption // zero-knowledge shell
          </p>
        </div>

        {/* Right column: product preview */}
        <div className="relative">
          <div className="relative overflow-hidden rounded-2xl border border-[#C6A253]/30 bg-white shadow-xl shadow-black/20">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-[#E7DFC9] bg-[#FBF6EA] px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-[#D9C48F]" aria-hidden="true" />
              <span className="h-3 w-3 rounded-full bg-[#D9C48F]" aria-hidden="true" />
              <span className="h-3 w-3 rounded-full bg-[#D9C48F]" aria-hidden="true" />
              <span className="ml-3 truncate text-xs font-medium text-[#8A7A56]">
                app.nextcasehq.com/dashboard
              </span>
            </div>

            {/* Hand-built dashboard preview (real markup, not a static
                screenshot) — kept in the same gold/cream/brown/ink palette
                as the rest of the marketing site rather than an
                off-brand mockup image. */}
            <div
              role="img"
              aria-label="NextCaseHQ dashboard preview showing case navigation, an evidence timeline, and an AI legal assistant summary panel"
              className="grid grid-cols-[160px_1fr_220px] gap-0 bg-[#FDFBF7] text-[#241E17]"
            >
              {/* Sidebar */}
              <div className="border-r border-[#E7DFC9] bg-[#FBF6EA] p-3">
                <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#8A6D2F]">
                  NextCaseHQ
                </p>
                {["Dashboard", "Cases", "Documents", "Evidence"].map((item, i) => (
                  <div
                    key={item}
                    className={`mb-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold ${
                      i === 1 ? "bg-[#8A6D2F] text-[#F6F1E7]" : "text-[#5C5340]"
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>

              {/* Main pane */}
              <div className="border-r border-[#E7DFC9] p-4">
                <p className="text-[13px] font-bold">Case: Sharma vs. Verma Textiles (24-CV-00118)</p>
                <div className="mt-1.5 flex gap-1.5">
                  <span className="rounded bg-[#F4EEE0] px-1.5 py-0.5 text-[9px] font-semibold text-[#5C5340]">
                    Judge M. Rao
                  </span>
                  <span className="rounded bg-[#F4EEE0] px-1.5 py-0.5 text-[9px] font-semibold text-[#5C5340]">
                    Court 12B
                  </span>
                  <span className="rounded bg-[#F1E9D3] px-1.5 py-0.5 text-[9px] font-semibold text-[#8A6D2F]">
                    Status: Discovery
                  </span>
                </div>

                <p className="mb-1.5 mt-4 text-[10px] font-bold uppercase tracking-wider text-[#8A7A56]">
                  Evidence Timeline
                </p>
                {[
                  ["May 16", "Filing", "Initial complaint filed with the registry"],
                  ["May 22", "Disclosure", "Initial disclosure of documents exchanged"],
                  ["Jun 5", "Deposition Notice", "Deposition notice served on CFO"],
                ].map(([date, title, desc]) => (
                  <div key={title} className="mb-2 flex gap-2 border-l-2 border-[#D9C48F] pl-2.5">
                    <div className="w-14 shrink-0 text-[9px] font-mono text-[#B0A588]">{date}</div>
                    <div>
                      <p className="text-[10.5px] font-bold">{title}</p>
                      <p className="text-[9.5px] leading-snug text-[#5C5340]">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* AI assistant pane */}
              <div className="bg-[#F6F1E7] p-3">
                <div className="mb-2 flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-[#8A6D2F] text-[9px] font-bold text-[#F6F1E7]">
                    AI
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#241E17]">
                    Legal Assistant
                  </p>
                </div>
                <p className="text-[9.5px] leading-snug text-[#5C5340]">
                  Key issue: alleged breach of the supply contract (Cl. 4.1). Defense
                  relies on a force majeure clause (Para 12).
                </p>
                <p className="mt-2 text-[9px] font-bold uppercase tracking-wider text-[#8A6D2F]">
                  Suggested next step
                </p>
                <p className="text-[9.5px] leading-snug text-[#5C5340]">
                  Review force majeure precedents before the Jun 5 deposition.
                </p>
              </div>
            </div>
          </div>

          {/* Floating security badge */}
          <div className="absolute -bottom-4 -left-4 hidden items-center gap-3 rounded-xl border border-[#C6A253]/30 bg-[#F6F1E7] px-4 py-3 shadow-md sm:flex">
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
