'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Matter {
  id: string;
  title: string;
  matter_number: string | null;
  status: string;
  client_name: string | null;
  updated_at: string;
}

/**
 * Lightweight launch/activity page (Phase A, Matter Workspace redesign).
 * `/dashboard` is no longer the primary working environment — that is now
 * `/matters/[id]`'s Matter Workspace. This page surfaces recent Matters
 * and a quick entry point into search, reusing the existing, real
 * GET /api/matters endpoint; TriPaneChamber is no longer mounted here
 * (still reachable, unchanged, at /dashboard/ai-chamber until Phase C).
 */
export default function DashboardLaunchPage() {
  const [matters, setMatters] = useState<Matter[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/matters')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setMatters(data.matters ?? []);
      })
      .catch(() => {
        if (!cancelled) setMatters([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const recentMatters = (matters ?? []).slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-[#111111]">Welcome back</h1>
        <p className="text-xs font-semibold text-[#B0A588] uppercase tracking-widest mt-1">
          Jump into a Matter, or start a new search.
        </p>
      </div>

      <form action="/search" className="flex gap-3">
        <input
          type="text"
          name="q"
          placeholder="Search cases, Acts, Sections, judgments…"
          className="flex-1 px-5 py-3 bg-white border border-[#E7DFC9] rounded-xl shadow-sm outline-none focus:border-[#8A6D2F] text-sm placeholder:text-[#B0A588]"
        />
        <button
          type="submit"
          className="px-6 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
        >
          Search
        </button>
      </form>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">Recent Matters</h2>
          <Link href="/matters" className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">
            View All Matters →
          </Link>
        </div>

        {matters === null ? (
          <div className="flex justify-center py-10">
            <span className="w-6 h-6 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
          </div>
        ) : recentMatters.length === 0 ? (
          <div className="text-center py-10 bg-[#FBF8F1]/50 border border-dashed border-[#E7DFC9] rounded-xl">
            <p className="text-xs font-semibold text-[#8A7A56]">No matters yet.</p>
            <Link href="/matters" className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline mt-2 inline-block">
              Create your first Matter →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentMatters.map((matter) => (
              <Link
                key={matter.id}
                href={`/matters/${matter.id}`}
                className="flex items-center justify-between p-4 bg-white border border-[#E7DFC9]/80 rounded-xl shadow-sm hover:border-[#8A6D2F] transition-all"
              >
                <div>
                  <p className="text-sm font-bold text-[#3A3222]">{matter.title}</p>
                  <p className="text-[10px] text-[#B0A588] font-bold uppercase tracking-wider">
                    {matter.matter_number || matter.id.slice(0, 8)}
                    {matter.client_name && <> · {matter.client_name}</>}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-[#8A6D2F] bg-[#FBF6EA] px-2.5 py-1 rounded uppercase tracking-wider">
                  {matter.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
