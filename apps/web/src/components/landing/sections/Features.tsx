import React from "react";

type Feature = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

const iconClass = "h-6 w-6";

const FEATURES: Feature[] = [
  {
    title: "Zero-Knowledge Envelope",
    description:
      "End-to-end envelope cryptography with hardware-backed KMS keys. Transcripts and exhibits are encrypted on-device before they ever reach our servers.",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Statutory Engines",
    description:
      "Automated compliance mappings and deadline tracking for BNS, BNSS, FRCP, CPR, and Negotiable Instruments Act timelines—updated for current reforms.",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3v3M5 6h14M6 6l-2 7a4 4 0 0 0 8 0L6 6zm12 0-2 7a4 4 0 0 0 8 0l-6-7zM8 21h8M12 6v15" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Interactive Draft Builder",
    description:
      "A premium WYSIWYG legal document engine with automated citation binding, so every pleading stays accurate and court-ready.",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 20h9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Evidence Analysis",
    description:
      "Ingest documents and exhibits, then surface the facts that matter with context-aware analysis across the entire case file.",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 3v5h5M9 13h6M9 17h4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Immutable Audit Ledger",
    description:
      "Every action is recorded to a tamper-evident ledger, giving you a defensible, chain-of-custody record for compliance and discovery.",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="4" y="10" width="16" height="10" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Unified Case Search",
    description:
      "One query spans active matters, statutes, and precedents—so counsel find the right authority in seconds, not hours.",
    icon: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="7" strokeLinecap="round" />
        <path d="m20 20-3-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-[#FDFBF7]">
      <div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-12 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-700">
            Capabilities
          </span>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-tight text-[#111111] md:text-4xl">
            Everything a litigation team needs, in one secure workspace
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-neutral-600">
            A modular operating system that unifies intake, analysis, drafting,
            and compliance—without ever compromising confidentiality.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article
              key={feature.title}
              className="group flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg hover:shadow-neutral-200/60"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                {feature.icon}
              </span>
              <h3 className="mt-5 text-lg font-bold tracking-tight text-[#111111]">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
