'use client';

import React from 'react';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FDFBF7] px-6 text-center font-sans">
      <div className="max-w-md">
        <p className="text-xs font-bold uppercase tracking-widest text-[#8A6D2F] mb-3">Something went wrong</p>
        <h1 className="text-3xl font-black text-[#111111] mb-4">We hit an unexpected error</h1>
        <p className="text-sm text-[#6F5624] mb-8">
          This has been logged. Try again, or come back in a moment.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="inline-block bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all cursor-pointer border-none outline-none"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
