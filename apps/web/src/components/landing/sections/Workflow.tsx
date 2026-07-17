import React from "react";

const STEPS = [
  {
    step: "01",
    title: "Ingest",
    body: "Upload case files, exhibits, and transcripts. Everything is encrypted on-device and organized into a unified matter.",
  },
  {
    step: "02",
    title: "Analyze",
    body: "Search across the full record, map statutory obligations, and surface the evidence and precedents that matter.",
  },
  {
    step: "03",
    title: "Draft",
    body: "Compose court-ready filings with automated citation binding and compliance checks—then export with a full audit trail.",
  },
];

export default function Workflow() {
  return (
    <section className="bg-[#FBF8F1]">
      <div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-12 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#8A6D2F]">
            Workflow
          </span>
          <h2 className="mt-3 text-balance font-serif text-3xl font-black tracking-tight text-[#241E17] md:text-4xl">
            From intake to filing in one continuous flow
          </h2>
        </div>

        <ol className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((item) => (
            <li
              key={item.step}
              className="relative rounded-2xl border border-[#D9CDB2] bg-[#F4EEE0] p-8"
            >
              <span className="font-serif text-4xl font-black text-[#8A6D2F]/30">
                {item.step}
              </span>
              <h3 className="mt-4 font-serif text-xl font-bold tracking-tight text-[#241E17]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5C5340]">
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
