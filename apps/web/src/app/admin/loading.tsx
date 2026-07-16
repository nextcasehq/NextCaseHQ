import React from 'react';

export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FDFBF7]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold text-neutral-500 font-serif italic">Loading Admin System Console...</p>
      </div>
    </div>
  );
}
