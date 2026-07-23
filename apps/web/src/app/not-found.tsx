import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FDFBF7] px-6 text-center font-sans">
      <div className="max-w-md">
        <p className="text-xs font-bold uppercase tracking-widest text-[#8A6D2F] mb-3">404</p>
        <h1 className="text-3xl font-black text-[#111111] mb-4">This page doesn&apos;t exist</h1>
        <p className="text-sm text-[#6F5624] mb-8">
          The page you&apos;re looking for may have moved or the link may be out of date.
        </p>
        <Link
          href="/"
          className="inline-block bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all"
        >
          Go to NextCaseHQ
        </Link>
      </div>
    </div>
  );
}
