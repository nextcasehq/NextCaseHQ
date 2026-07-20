'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface DemoResultDetail {
  id: string;
  type: 'JUDGMENT' | 'ACT' | 'SECTION' | 'CITATION';
  title: string;
  snippet: string;
  body: string;
}

const TYPE_LABELS: Record<DemoResultDetail['type'], string> = {
  JUDGMENT: 'Judgment',
  ACT: 'Act',
  SECTION: 'Section',
  CITATION: 'Citation',
};

/**
 * Read-only detail page for a single Beta Preview demo search result
 * (Judgment / Act / Section / Citation). Backed entirely by GET
 * /api/search/demo/[id], which is served directly from middleware (see
 * lib/beta/demo-search-data.ts) — no real route, no database, no write
 * actions here at all. Not reachable unless Beta Preview is active and
 * the visitor has no session; a 404/failed fetch just means this specific
 * demo id doesn't exist, not a real error.
 */
export default function DemoSearchResultPage() {
  const params = useParams();
  const id = params.id as string;
  const [detail, setDetail] = useState<DemoResultDetail | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/search/demo/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setDetail(data?.result ?? null);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (detail === undefined) {
    return (
      <div className="flex justify-center py-16">
        <span className="w-8 h-8 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  if (detail === null) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-3xl">👁️</span>
        <h2 className="text-lg font-bold mt-2">Preview Not Available</h2>
        <p className="text-xs text-[#B0A588] mt-1 max-w-sm mx-auto">This demo result isn&apos;t available right now.</p>
        <Link href="/search" className="inline-block mt-4 text-xs font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">
          ← Back to Search
        </Link>
      </div>
    );
  }

  return (
    <article>
      <Link href="/search" className="text-xs font-bold uppercase tracking-wider text-[#B0A588] hover:text-[#8A6D2F] transition-colors">
        ← Back to Search
      </Link>

      <div className="flex items-center gap-2 flex-wrap mt-4 mb-2">
        <span className="text-[10px] font-bold text-[#8A6D2F] bg-[#FBF6EA] px-2 py-0.5 rounded uppercase tracking-wider">
          {TYPE_LABELS[detail.type]}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FBF6EA] text-[#8A6D2F] border border-[#C6A253]/40 uppercase tracking-wider">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C6A253]" aria-hidden="true" />
          Demo Data
        </span>
      </div>

      <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#111111] mb-4">{detail.title}</h1>
      <p className="text-sm text-[#3A3222] leading-relaxed whitespace-pre-line">{detail.body}</p>
    </article>
  );
}
