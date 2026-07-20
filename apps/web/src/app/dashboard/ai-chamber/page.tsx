'use client';

import React, { useEffect, useState } from 'react';
import { TriPaneChamber } from '@/components/TriPaneChamber';

export default function AiChamberPage() {
  // Only ever set true by a successful, unauthenticated GET
  // /api/beta-status — a real, signed-in session always gets a 404 for
  // this path (it's only ever answered for the no-session Beta Preview
  // case), so this can't be spoofed into showing for a real tenant.
  const [betaPreview, setBetaPreview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/beta-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.enabled) setBetaPreview(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full h-full relative">
      {betaPreview && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 rounded-full border border-[#C6A253]/40 bg-[#FBF6EA] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#8A6D2F] shadow-sm">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C6A253]" aria-hidden="true" />
          Beta Preview — Ask AI available after beta
        </div>
      )}
      <TriPaneChamber />
    </div>
  );
}
