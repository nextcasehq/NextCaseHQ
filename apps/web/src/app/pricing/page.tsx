import React from "react";
import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans pt-16 selection:bg-indigo-600 selection:text-white">
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-20 max-w-4xl mx-auto w-full text-center">
        <div className="mb-8 p-4 bg-white border border-neutral-100 rounded-2xl shadow-sm inline-flex items-center justify-center text-indigo-600 text-3xl">
          💳
        </div>

        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#111111] mb-4">
          Transparent Professional Tier Plan
        </h1>

        <p className="text-sm md:text-base text-neutral-500 max-w-md mx-auto mb-10 font-medium font-serif italic">
          Fully scale and bind your cryptographic litigation workspaces with our single premium tier.
        </p>

        <div className="max-w-md w-full bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm text-left mx-auto mb-12">
          <div className="flex justify-between items-center mb-6 border-b border-neutral-100 pb-4">
            <div>
              <h3 className="font-extrabold text-lg text-[#111111]">Counsel Pro</h3>
              <p className="text-xs text-neutral-400 font-semibold font-mono mt-0.5">UNLIMITED WORKSPACES</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-[#111111]">$49</span>
              <span className="text-xs text-neutral-400 font-semibold">/mo</span>
            </div>
          </div>

          <ul className="space-y-3.5 mb-8 text-xs text-neutral-600 font-semibold font-mono">
            <li className="flex items-center gap-2">
              <span className="text-indigo-600">✓</span> 3 Unified Secure Practice Tenants
            </li>
            <li className="flex items-center gap-2">
              <span className="text-indigo-600">✓</span> Infinite Context Search Shell & Ingestion
            </li>
            <li className="flex items-center gap-2">
              <span className="text-indigo-600">✓</span> Automated BNS/BNSS Statutory Mapping
            </li>
            <li className="flex items-center gap-2">
              <span className="text-indigo-600">✓</span> Full KMS Circuit-Breaker Access
            </li>
          </ul>

          <Link
            href="/login"
            className="block text-center w-full bg-[#111111] hover:bg-neutral-800 text-white font-bold text-xs py-3 rounded-xl transition-all"
          >
            Start Professional Plan
          </Link>
        </div>
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
