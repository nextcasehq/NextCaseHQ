import React from "react";

export default function ProductPreview() {
  return (
    <section className="bg-[#FDFBF7]">
      <div className="mx-auto w-full max-w-5xl px-6 py-16 md:px-12 lg:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#8A6D2F]">
            Inside the chamber
          </span>
          <h2 className="mt-3 text-balance font-serif text-3xl font-black tracking-tight text-[#241E17] md:text-4xl">
            One workspace for the full life of a matter
          </h2>
        </div>

        <div className="relative mt-12">
          <div className="relative overflow-hidden rounded-2xl border border-[#C6A253]/30 bg-white shadow-xl shadow-black/10">
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
              className="grid grid-cols-1 gap-0 bg-[#FDFBF7] text-[#241E17] sm:grid-cols-[160px_1fr_220px]"
            >
              {/* Sidebar */}
              <div className="hidden border-r border-[#E7DFC9] bg-[#FBF6EA] p-3 sm:block">
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
              <div className="border-r-0 p-4 sm:border-r sm:border-[#E7DFC9]">
                <p className="text-[13px] font-bold">Case: Sharma vs. Verma Textiles (24-CV-00118)</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
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
          <div className="absolute -bottom-4 left-4 hidden items-center gap-3 rounded-xl border border-[#C6A253]/30 bg-[#F6F1E7] px-4 py-3 shadow-md sm:flex">
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
