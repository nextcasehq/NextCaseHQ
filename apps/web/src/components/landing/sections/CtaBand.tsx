import React from "react";
import Link from "next/link";

const STATS = [
  { value: "256-bit", label: "AES envelope encryption" },
  { value: "Zero", label: "Knowledge held by servers" },
  { value: "100%", label: "Actions on an audit ledger" },
];

export default function CtaBand() {
  return (
    <section className="bg-[#F4EEE0]">
      <div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-12 lg:py-24">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#D9CDB2] bg-[#FBF8F1] p-8 text-center"
            >
              <p className="font-serif text-4xl font-black tracking-tight text-[#241E17]">
                {stat.value}
              </p>
              <p className="mt-2 text-sm font-medium text-[#6F5624]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-[#C6A253]/30 bg-[#0E241B] px-8 py-14 text-center shadow-xl shadow-[#0E241B]/25 md:px-16">
          <h2 className="mx-auto max-w-2xl text-balance font-serif text-3xl font-black tracking-tight text-white md:text-4xl">
            Bring your practice into a zero-knowledge future
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-[#CFC3A8]">
            Open your secure chamber and start working with complete context and
            complete confidentiality.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-[#C6A253] px-6 py-3 text-sm font-bold text-[#241E17] transition-all duration-200 hover:bg-[#E4C77E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E4C77E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E241B] active:scale-[0.98]"
            >
              Access your chamber
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-[#C6A253]/50 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-[#C6A253]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E4C77E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E241B]"
            >
              View pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
