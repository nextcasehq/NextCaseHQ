import React from "react";
import Link from "next/link";

const STATS = [
  { value: "256-bit", label: "AES envelope encryption" },
  { value: "Zero", label: "Knowledge held by servers" },
  { value: "100%", label: "Actions on an audit ledger" },
];

export default function CtaBand() {
  return (
    <section className="bg-[#FDFBF7]">
      <div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-12 lg:py-24">
        {/* Stats */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-neutral-200 bg-white p-8 text-center"
            >
              <p className="text-4xl font-black tracking-tight text-[#111111]">
                {stat.value}
              </p>
              <p className="mt-2 text-sm font-medium text-neutral-500">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-indigo-500/30 bg-indigo-600 px-8 py-14 text-center shadow-xl shadow-indigo-600/20 md:px-16">
          <h2 className="mx-auto max-w-2xl text-balance text-3xl font-black tracking-tight text-white md:text-4xl">
            Bring your practice into a zero-knowledge future
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-indigo-100">
            Open your secure chamber and start working with complete context and
            complete confidentiality.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-indigo-700 transition-all duration-200 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600 active:scale-[0.98]"
            >
              Access your chamber
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-indigo-600"
            >
              View pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
