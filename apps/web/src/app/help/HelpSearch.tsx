'use client';

import React from 'react';
import Link from 'next/link';
import type { HelpSearchEntry } from '@/lib/help/content';

export function HelpSearch({ entries }: { entries: HelpSearchEntry[] }) {
  const [query, setQuery] = React.useState('');

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return entries
      .filter((e) => e.heading.toLowerCase().includes(q) || e.excerpt.toLowerCase().includes(q))
      .slice(0, 20);
  }, [entries, query]);

  return (
    <div>
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the knowledge base…"
          aria-label="Search the Help Centre"
          className="w-full px-5 py-4 bg-white border border-[#E7DFC9] rounded-xl outline-none focus:border-[#8A6D2F] text-sm font-medium shadow-sm"
        />
      </div>
      {query.trim() && (
        <div className="mt-3 space-y-2">
          {results.length === 0 ? (
            <p className="text-xs text-[#8A7A56] px-1">No results for &quot;{query}&quot;.</p>
          ) : (
            results.map((r, i) => (
              <Link
                key={`${r.slug}-${i}`}
                href={`/help/${r.slug}`}
                className="block bg-white border border-[#E7DFC9]/80 rounded-lg p-4 hover:border-[#8A6D2F] transition-all"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] mb-1">
                  {r.title} — {r.heading}
                </p>
                <p className="text-xs text-[#6F5624] line-clamp-2">{r.excerpt}</p>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
