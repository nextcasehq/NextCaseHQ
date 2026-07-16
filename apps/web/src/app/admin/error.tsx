'use client';

import React from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FDFBF7] px-6 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-black text-[#111111] mb-4">System Console Fault</h1>
        <p className="text-sm text-neutral-500 mb-6 font-serif italic">{error.message || 'An unexpected fault occurred.'}</p>
        <button
          onClick={reset}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-all"
        >
          Recover System
        </button>
      </div>
    </div>
  );
}
