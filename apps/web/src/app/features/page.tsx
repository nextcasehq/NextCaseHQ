import React from "react";
import Link from "next/link";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans pt-16 selection:bg-indigo-600 selection:text-white">
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-20 max-w-4xl mx-auto w-full text-center">
        <div className="mb-8 p-4 bg-white border border-neutral-100 rounded-2xl shadow-sm inline-flex items-center justify-center text-indigo-600 text-3xl">
          ⚡
        </div>

        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#111111] mb-4">
          Litigation Operating System Features
        </h1>

        <p className="text-sm md:text-base text-neutral-500 max-w-md mx-auto mb-10 font-medium font-serif italic">
          Explore the modular zero-knowledge litigation workspace designed to empower modern counsel.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left mb-12">
          <div className="p-6 bg-white border border-neutral-200/60 rounded-2xl shadow-sm">
            <span className="text-lg mb-2 block">🔒</span>
            <h3 className="font-bold text-sm uppercase tracking-wider mb-2 text-[#111111]">Zero-Knowledge Envelope</h3>
            <p className="text-xs text-neutral-500 leading-relaxed font-serif">
              End-to-end envelope cryptography and hardware-backed KMS keys shield counsel transcripts and exhibits.
            </p>
          </div>
          <div className="p-6 bg-white border border-neutral-200/60 rounded-2xl shadow-sm">
            <span className="text-lg mb-2 block">⚖️</span>
            <h3 className="font-bold text-sm uppercase tracking-wider mb-2 text-[#111111]">Statutory Engines</h3>
            <p className="text-xs text-neutral-500 leading-relaxed font-serif">
              Instant, automated compliance mappings for BNS, BNSS, FRCP, CPR, and Negotiable Instruments (NI) Act timelines.
            </p>
          </div>
          <div className="p-6 bg-white border border-neutral-200/60 rounded-2xl shadow-sm">
            <span className="text-lg mb-2 block">✍️</span>
            <h3 className="font-bold text-sm uppercase tracking-wider mb-2 text-[#111111]">Interactive Draft Sheet</h3>
            <p className="text-xs text-neutral-500 leading-relaxed font-serif">
              A premium WYSIWYG legal document engine with automated citation reference binding.
            </p>
          </div>
        </div>

        <Link
          href="/login"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs md:text-sm px-6 py-2.5 rounded-xl transition-all"
        >
          Initialize Chamber Session
        </Link>
      </main>

      <footer className="border-t border-neutral-100 bg-white px-6 md:px-12 py-10 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[#111111]">
              NextCaseHQ<span className="text-indigo-600">.</span>
            </span>
          </div>
          <p className="text-xs text-neutral-400 font-medium">
            {"\u00A9"} {new Date().getFullYear()} NextCaseHQ. Zero-Knowledge. Infinite Context.
          </p>
          <div className="flex gap-6 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            <Link href="/login" className="hover:text-indigo-600 transition-colors">Privacy</Link>
            <Link href="/login" className="hover:text-indigo-600 transition-colors">Terms</Link>
            <Link href="/login" className="hover:text-indigo-600 transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
