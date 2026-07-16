import React from "react";
import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans pt-16 selection:bg-indigo-600 selection:text-white">
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-20 max-w-4xl mx-auto w-full text-center">
        <div className="mb-8 p-4 bg-white border border-neutral-100 rounded-2xl shadow-sm inline-flex items-center justify-center text-indigo-600 text-3xl">
          ✉️
        </div>

        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[#111111] mb-4">
          Connect With Counsel
        </h1>

        <p className="text-sm md:text-base text-neutral-500 max-w-md mx-auto mb-10 font-medium font-serif italic">
          Initiate direct secured communications with the NextCaseHQ engineering and compliance group.
        </p>

        <div className="max-w-md w-full bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm text-left mx-auto mb-12 space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Office Location</label>
            <p className="text-sm font-semibold text-neutral-800">New Delhi // Mumbai // Bengaluru // NY</p>
          </div>
          <div className="border-t border-neutral-100 pt-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Secure Messaging Key</label>
            <p className="text-xs font-mono bg-neutral-50 p-2.5 rounded border border-neutral-100 break-all text-neutral-600">
              nchq_sec_dh_pk_583920194839201a0b3829d84c1920
            </p>
          </div>
          <div className="border-t border-neutral-100 pt-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">Corporate Support Email</label>
            <p className="text-sm font-semibold text-indigo-600">counsel@nextcasehq.com</p>
          </div>
        </div>

        <Link
          href="/login"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs md:text-sm px-6 py-2.5 rounded-xl transition-all"
        >
          Sign In to Support Center
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
