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
    <section className="bg-white">
      <div className="mx-auto w-full max-w-7xl px-6 py-16 md:px-12 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-700">
            Workflow
          </span>
          <h2 className="mt-3 text-balance text-3xl font-black tracking-tight text-[#111111] md:text-4xl">
            From intake to filing in one continuous flow
          </h2>
        </div>

        <ol className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((item) => (
            <li
              key={item.step}
              className="relative rounded-2xl border border-neutral-200 bg-[#FDFBF7] p-8"
            >
              <span className="font-mono text-4xl font-black text-indigo-600/20">
                {item.step}
              </span>
              <h3 className="mt-4 text-xl font-bold tracking-tight text-[#111111]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                {item.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
