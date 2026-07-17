import React from "react";

const STATUTES = ["BNS", "BNSS", "FRCP", "CPR", "NI Act", "IT Act"];

export default function TrustBar() {
  return (
    <section className="border-b border-[#D9CDB2] bg-[#FBF8F1]">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 px-6 py-10 md:px-12">
        <p className="text-center text-[11px] font-bold uppercase tracking-widest text-[#8A7A56]">
          Mapped to the statutes modern counsel work with every day
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
          {STATUTES.map((statute) => (
            <span
              key={statute}
              className="rounded-full border border-[#D9CDB2] bg-[#F4EEE0] px-4 py-2 text-sm font-bold tracking-tight text-[#3A3222]"
            >
              {statute}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
