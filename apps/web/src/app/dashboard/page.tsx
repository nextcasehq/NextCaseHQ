'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import EmptyState from '@/components/EmptyState';

interface RecentMatter {
  id: string;
  title: string;
  matter_number: string | null;
  status: string;
  client_name: string | null;
  updated_at: string;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  created_at: string;
}

/** Compact relative-time label ("5m ago", "2h ago", "3d ago") — same as the shell's notification drawer. */
function relativeTime(isoTimestamp: string): string {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Dashboard launch page (Product Direction: the Matter Workspace under
 * /matters/[id] is now the primary working environment — the dashboard is
 * only the launch page). Replaces the previous default TriPaneChamber
 * mount; TriPaneChamber itself is untouched and still reachable directly at
 * /dashboard/ai-chamber. Reuses only existing production endpoints — no new
 * API surface.
 */
export default function DashboardPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState('');
  const [recentMatters, setRecentMatters] = React.useState<RecentMatter[] | null>(null);
  const [activity, setActivity] = React.useState<NotificationItem[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/matters?limit=5')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setRecentMatters(data.matters);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/notifications?limit=5')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setActivity(data.notifications);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 md:py-16 space-y-12">
      {/* Quick Search — the command centre entry point when no Matter is
          open yet; matter-scoped search lives on the Matter Workspace
          itself once one is. */}
      <div className="text-center space-y-6">
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-[#111111]">
          Welcome back
        </h1>
        <form onSubmit={handleSearch} className="relative flex items-center max-w-2xl mx-auto bg-white border border-[#E7DFC9] rounded-xl shadow-sm focus-within:border-[#8A6D2F] transition-all">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases, Acts, Sections, judgments, or ask AI..."
            className="w-full bg-transparent border-none outline-none text-[#111111] text-sm md:text-base font-medium placeholder-[#B0A588] px-5 py-4 md:py-5"
          />
          <button
            type="submit"
            aria-label="Search"
            className="flex-none pr-4 md:pr-5 text-[#8A6D2F] hover:text-[#6F5624] bg-transparent border-none outline-none cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Recent Matters */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">Recent Matters</h2>
            <Link href="/matters" className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">
              View All →
            </Link>
          </div>
          {recentMatters === null ? (
            <div className="flex justify-center py-10">
              <span className="w-6 h-6 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
            </div>
          ) : recentMatters.length === 0 ? (
            <EmptyState
              icon={
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#8A6D2F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                </svg>
              }
              title="No Matters Yet"
              description="Create your first Matter to start working."
              action={
                <Link
                  href="/matters"
                  className="inline-block bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-all uppercase tracking-wider"
                >
                  New Matter
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {recentMatters.map((matter) => (
                <Link
                  key={matter.id}
                  href={`/matters/${matter.id}`}
                  className="block bg-white border border-[#E7DFC9]/80 rounded-xl p-4 shadow-sm hover:border-[#E7DFC9] hover:shadow transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-sm text-[#111111] truncate">{matter.title}</p>
                    <span className={`flex-none text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      matter.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border border-green-200' :
                      matter.status === 'ON_HOLD' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                      matter.status === 'CLOSED' ? 'bg-[#F4EEE0] text-[#5C5340] border border-[#E7DFC9]' :
                      'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                      {matter.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#B0A588] font-bold uppercase tracking-wider mt-1">
                    {matter.client_name || 'Not yet linked'}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity — reuses the same /api/notifications endpoint the
            shell's notification bell already calls. */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-4">Recent Activity</h2>
          {activity === null ? (
            <div className="flex justify-center py-10">
              <span className="w-6 h-6 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
            </div>
          ) : activity.length === 0 ? (
            <div className="text-center py-10 bg-white border border-[#E7DFC9]/80 rounded-xl">
              <p className="text-xs font-semibold text-[#8A7A56]">No recent activity.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.map((notif) => (
                <div key={notif.id} className="bg-white border border-[#E7DFC9]/80 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-mono font-bold text-[#8A6D2F] bg-[#FBF6EA] px-1.5 py-0.5 rounded">
                      {notif.type}
                    </span>
                    <span className="text-[9px] font-mono text-[#B0A588]">{relativeTime(notif.created_at)}</span>
                  </div>
                  <p className="text-xs font-bold text-[#241E17] leading-relaxed">{notif.title}</p>
                  {notif.message && (
                    <p className="text-xs text-[#4A4130] leading-relaxed mt-0.5">{notif.message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
