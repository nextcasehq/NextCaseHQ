import React from 'react';
import Link from 'next/link';

export default function AdminNotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FDFBF7] px-6 text-center">
      <div className="max-w-md">
        <h1 className="text-4xl font-black text-[#111111] mb-4">404 — Console Page Not Found</h1>
        <p className="text-sm text-neutral-500 mb-6 font-serif italic">The administration console sub-route you are seeking is unregistered.</p>
        <Link
          href="/admin"
          className="bg-[#111111] hover:bg-neutral-800 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-all"
        >
          Return to Console Dashboard
        </Link>
      </div>
    </div>
  );
}
