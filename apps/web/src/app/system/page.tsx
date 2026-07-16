import React from 'react';
import Link from 'next/link';

export default function SystemPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col items-center justify-center px-6 py-24 text-center font-sans">

      {/* Brand Identity Header */}
      <div className="mb-10 p-5 bg-white border border-neutral-100 rounded-2xl shadow-sm inline-flex items-center justify-center hover:scale-[1.03] hover:border-indigo-100 hover:shadow-md transition-all duration-300 ease-out cursor-pointer group">
        <svg
          className="w-14 h-14 text-[#111111]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M6 4v16M18 4v16M6 4l12 16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="max-w-md">
        <h1 className="text-3xl font-black text-[#111111] tracking-tight mb-3">System Directory Gate</h1>
        <p className="text-sm text-neutral-500 font-serif italic mb-10">NextCaseHQ Enterprise Operations Router</p>

        <Link
          href="/admin"
          className="bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg text-white font-bold text-sm px-8 py-3 rounded-xl transition-all inline-block"
        >
          Enter Platform Administration Console →
        </Link>
      </div>
    </div>
  );
}
