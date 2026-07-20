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
      {/* Premium "modern advocate's office" scene — an original vector
          illustration (not a photo: zero licensing risk), built to the
          Product Owner's reference: glass wall + city skyline, dark wood
          shelving lined with law books under brass accent lighting, a
          marble accent panel, and a desk in the foreground. Layered under
          a warm/cool gradient mesh and a precision grid for a technology
          feel. Every layer here is well above the near-invisible opacities
          the first pass used — this reads immediately as a designed
          background, not a plain page. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FBF7EC] via-[#F3EAD3] to-[#E4EDEC]" />
        <div
          className="absolute -top-32 -left-24 h-[40rem] w-[40rem] rounded-full opacity-60 blur-[90px]"
          style={{ background: 'radial-gradient(circle, #D9B978 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -right-24 h-[38rem] w-[38rem] rounded-full opacity-50 blur-[90px]"
          style={{ background: 'radial-gradient(circle, #9FC2C2 0%, transparent 70%)' }}
        />
        {/* Precision grid — technology/confidence cue */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.08]" aria-hidden="true">
          <defs>
            <pattern id="hero-grid" width="44" height="44" patternUnits="userSpaceOnUse">
              <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#8A6D2F" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>
        {/* Modern advocate's-office illustration — an original vector scene
            (not a photo, so zero licensing risk), composed to the same
            brief as the reference: floor-to-ceiling glass with a city
            skyline on one side, dark wood-panelled shelving lined with law
            books under warm brass accent lighting and a marble accent
            panel on the other, a dark wood desk with a thin gold edge in
            the foreground. Kept to a moderate opacity and anchored to the
            bottom/sides so the search bar and Action Cards — sitting in
            solid white/cards in the clear centre — are never competed
            with. */}
        <svg
          viewBox="0 0 1440 560"
          preserveAspectRatio="xMidYMax slice"
          className="absolute inset-0 h-full w-full opacity-[0.38]"
        >
          <defs>
            <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EAF2F1" />
              <stop offset="100%" stopColor="#CFE1DE" />
            </linearGradient>
            <linearGradient id="hero-wood" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7A5A3A" />
              <stop offset="100%" stopColor="#4E3620" />
            </linearGradient>
            <linearGradient id="hero-marble" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F4F1EA" />
              <stop offset="100%" stopColor="#E2DDD0" />
            </linearGradient>
            <linearGradient id="hero-desk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5A4028" />
              <stop offset="100%" stopColor="#382415" />
            </linearGradient>
          </defs>

          {/* Left — floor-to-ceiling window onto a city skyline */}
          <g>
            <rect x="0" y="0" width="520" height="560" fill="url(#hero-sky)" />
            <g fill="#9FB3B0" opacity="0.7">
              <rect x="30" y="260" width="70" height="180" />
              <rect x="115" y="180" width="60" height="260" />
              <rect x="190" y="300" width="55" height="140" />
              <rect x="260" y="220" width="65" height="220" />
              <rect x="340" y="320" width="50" height="120" />
              <rect x="405" y="240" width="70" height="200" />
            </g>
            {/* window mullions */}
            <g stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="4">
              <line x1="175" y1="0" x2="175" y2="560" />
              <line x1="350" y1="0" x2="350" y2="560" />
              <line x1="0" y1="185" x2="520" y2="185" />
              <line x1="0" y1="370" x2="520" y2="370" />
            </g>
          </g>

          {/* Centre — marble accent panel */}
          <rect x="520" y="0" width="220" height="560" fill="url(#hero-marble)" />
          <g stroke="#C9C1AE" strokeWidth="1.5" opacity="0.5" fill="none">
            <path d="M540 40 Q 620 140 590 260 T 640 480" />
            <path d="M700 20 Q 660 180 720 320 T 690 540" />
          </g>

          {/* Right — dark wood-panelled shelving, law books, brass accent lighting */}
          <g>
            <rect x="740" y="0" width="700" height="560" fill="url(#hero-wood)" />
            <g stroke="#3A2814" strokeWidth="3">
              <line x1="920" y1="0" x2="920" y2="560" />
              <line x1="1100" y1="0" x2="1100" y2="560" />
              <line x1="1280" y1="0" x2="1280" y2="560" />
            </g>
            {/* Book spines, three shelf rows */}
            {[70, 210, 350].map((shelfY) => (
              <g key={shelfY}>
                {[760, 800, 835, 875, 960, 1000, 1040, 1120, 1160, 1200, 1300, 1340, 1380].map((x, i) => {
                  const colors = ['#6B2737', '#1F3D2B', '#1B2A4A', '#4A3221', '#5C2A2A'];
                  const w = 22 + (i % 3) * 6;
                  const h = 130 + (i % 4) * 8;
                  return (
                    <rect
                      key={x}
                      x={x}
                      y={shelfY + (150 - h)}
                      width={w}
                      height={h}
                      fill={colors[i % colors.length]}
                    />
                  );
                })}
                {/* brass under-shelf accent light */}
                <rect x="750" y={shelfY + 152} width="680" height="4" fill="#D9B978" opacity="0.85" />
              </g>
            ))}
          </g>

          {/* Foreground — desk with a thin gold edge, mostly faded by the
              white overlay beneath the Action Cards/CTAs */}
          <rect x="0" y="470" width="1440" height="90" fill="url(#hero-desk)" opacity="0.5" />
          <rect x="0" y="470" width="1440" height="5" fill="#D9B978" opacity="0.6" />
        </svg>
        {/* Strong fade so the desk illustration never sits directly behind
            the footnote text — the fade is tall enough to fully clear that
            text's line, not just soften an edge. */}
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-white via-white/80 to-transparent" />
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
