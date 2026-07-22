"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import JsonLd from "@/components/seo/JsonLd";
import Logo from "@/components/Logo";

type ActionCard = {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
};

const ACTION_CARDS: ActionCard[] = [
  {
    title: "Case Diary",
    description: "Record what happened in court in under 30 seconds.",
    href: "/cases",
    icon: (
      <path
        d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5v13ZM4 19.5V6.5M9 8h7M9 12h7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Document Creation",
    description: "Draft pleadings and notices in a court-ready editor.",
    href: "/dashboard/draft-builder",
    icon: <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" strokeLinecap="round" strokeLinejoin="round" />,
  },
  {
    title: "Judgment Search",
    description: "Find the precedent that decides your matter.",
    href: "/search?type=document",
    icon: (
      <>
        <circle cx="10" cy="10" r="6" />
        <path d="m20 20-4.3-4.3" strokeLinecap="round" />
      </>
    ),
  },
  {
    title: "Matter Register",
    description: "See every matter's stage, hearing date, and what's pending.",
    href: "/dashboard/matters",
    icon: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
      </>
    ),
  },
];

export default function LandingPageContent() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0b1f17] px-[24px] py-[32px] font-sans text-[#f6f1e7] selection:bg-[#c6a253] selection:text-[#0b1f17] md:py-[40px]">
      {/* Structural JSON-LD schemas for search crawlers */}
      <JsonLd type="Organization" />
      <JsonLd type="WebSite" />
      <JsonLd type="SoftwareApplication" />

      {/* Premium background: a soft brass glow above the wordmark and a
          faint hairline grid, both masked to fade out toward the edges —
          the one deliberate flourish on an otherwise quiet, dark stage. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-x-0 -top-1/4 h-[600px]"
          style={{ background: "radial-gradient(ellipse 900px 500px at 50% 0%, rgba(198,162,83,0.16), transparent 60%)" }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-[500px]"
          style={{ background: "radial-gradient(ellipse 1200px 800px at 50% 100%, rgba(22,64,47,0.55), transparent 60%)" }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(198,162,83,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(198,162,83,0.6) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)",
            WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 30%, black, transparent)",
          }}
        />
      </div>

      <div className="relative flex w-full max-w-[880px] flex-col items-center gap-[28px] md:gap-[32px]">
        {/* Branding */}
        <div className="flex flex-col items-center gap-[12px] text-center">
          <Link href="/" className="flex items-center gap-[12px]">
            <Logo size={46} className="rounded-[13px]" />
            <span className="font-serif text-[34px] font-semibold tracking-tight text-[#f6f1e7]">
              NextCase
              <span className="ml-[8px] -translate-y-0.5 inline-flex items-baseline rounded-[5px] bg-[#e4c77e] px-1.5 py-0.5 align-middle font-mono text-[13px] font-bold tracking-[0.12em] text-[#0b1f17]">
                HQ
              </span>
            </span>
          </Link>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#b0a588]">
            AI-Powered Legal Workspace
          </p>
        </div>

        {/* Primary action — Universal Search */}
        <form onSubmit={handleSearchSubmit} className="flex w-full flex-col items-center gap-2.5" role="search">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[#e4c77e]">
            Universal Legal Search
          </span>
          <div className="flex w-full items-center gap-[12px] rounded-[18px] border border-[#c6a253]/60 bg-[#123528] py-[8px] pl-[22px] pr-2.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.65)] transition-colors focus-within:border-[#e4c77e]">
            <svg className="h-[20px] w-[20px] flex-none text-[#b0a588]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search cases, judgments, acts, advocates, citations…"
              aria-label="Universal legal search"
              className="min-w-0 flex-1 bg-transparent py-[8px] text-base text-[#f6f1e7] outline-none placeholder:text-[#7f8f83]"
            />
            <button
              type="submit"
              aria-label="Search"
              className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-xl bg-[#c6a253] text-[#0b1f17] transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#e4c77e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e4c77e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1f17] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <svg className="h-[16px] w-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </form>

        {/* Secondary action — eCourts Case Status */}
        <Link
          href="/ecourts-verification"
          className="group flex w-full items-center gap-[16px] rounded-[14px] border border-[#c6a253]/20 bg-[#c6a253]/[0.05] px-[18px] py-3.5 text-left transition-all duration-150 hover:border-[#c6a253]/40 hover:bg-[#c6a253]/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e4c77e]"
        >
          <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px] bg-[#c6a253]/15 text-[#e4c77e]">
            <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3Z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-semibold text-[#f6f1e7]">eCourts Case Status</span>
            <span className="block text-xs text-[#b0a588]">
              Check a case against the official eCourts record — manual, no credentials required.
            </span>
          </span>
          <svg
            className="h-[16px] w-[16px] flex-none text-[#7f8f83] transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        {/* Four equal action cards */}
        <div className="grid w-full grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {ACTION_CARDS.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className="flex flex-col gap-2.5 rounded-2xl border border-[#c6a253]/20 bg-[#123528] p-[20px] transition-all duration-200 hover:-translate-y-[3px] hover:border-[#c6a253]/40 hover:bg-[#16402f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e4c77e] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <svg className="h-[30px] w-[30px] text-[#e4c77e]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                {card.icon}
              </svg>
              <h3 className="font-serif text-[15.5px] font-semibold text-[#f6f1e7]">{card.title}</h3>
              <p className="text-xs leading-relaxed text-[#b0a588]">{card.description}</p>
            </Link>
          ))}
        </div>

        {/* Minimal footer. No social icons: NextCaseHQ has no established
            social accounts anywhere else in this codebase, and linking to
            guessed handles would be exactly the kind of invented
            functionality this build is required to avoid. Add them here
            once real accounts exist. */}
        <div className="mt-[8px] flex w-full flex-wrap items-center justify-between gap-[16px] border-t border-[#c6a253]/20 pt-[18px]">
          <div className="flex flex-wrap items-center gap-[16px] text-[11.5px] text-[#b0a588]">
            <Link href="/privacy" className="hover:text-[#f6f1e7]">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#f6f1e7]">Terms</Link>
            <Link href="/contact" className="hover:text-[#f6f1e7]">Contact</Link>
            <a href="mailto:counsel@nextcasehq.com" className="hover:text-[#f6f1e7]">counsel@nextcasehq.com</a>
          </div>
          <p className="text-[11.5px] text-[#b0a588]">© {new Date().getFullYear()} NextCaseHQ</p>
        </div>
      </div>
    </div>
  );
}
