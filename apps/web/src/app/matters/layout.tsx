'use client';

import React from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read_at: string | null;
  created_at: string;
}

/** Compact relative-time label ("5m ago", "2h ago", "3d ago") for the notification drawer. */
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
 * Matter Navigator sections — in-page anchors, not separate routes. The
 * final URL structure for splitting a Matter's sections into distinct
 * routes is an open question flagged in
 * docs/MATTER_WORKSPACE_DEPENDENCY_MAP.md §5 and is explicitly not decided
 * by Phase A (shell only); anchoring within the existing single-page
 * `/matters/[id]` preserves every section exactly where it is today.
 */
const MATTER_NAV_SECTIONS = [
  { label: 'Overview', anchor: 'matter-overview', icon: '\u{1F4CB}' },
  { label: 'Proceedings', anchor: 'matter-proceedings', icon: '⚖️' },
  { label: 'Timeline', anchor: 'matter-timeline', icon: '\u{1F553}' },
  { label: 'Documents', anchor: 'matter-documents', icon: '\u{1F4C4}' },
  { label: 'Evidence', anchor: 'matter-evidence', icon: '⛓️' },
  { label: 'Team', anchor: 'matter-team', icon: '\u{1F465}' },
];

export default function MattersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const matterId = typeof params?.id === 'string' ? params.id : null;
  const isWorkspaceRoute = pathname !== '/matters';

  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Off-canvas mechanism reused verbatim from dashboard/layout.tsx (UX-1,
  // PR #108) — same state-driven show/hide, Escape-to-close, and
  // route-change auto-close behavior, now also driving the Context Drawer.
  React.useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!isMobileNavOpen && !isDrawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setIsMobileNavOpen(false);
      setIsDrawerOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMobileNavOpen, isDrawerOpen]);

  React.useEffect(() => {
    let cancelled = false;
    fetch('/api/notifications')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      if (!res.ok) return;
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Best-effort — the drawer already shows the notification either way.
    }
  };

  // Reuses the existing, already-shipped Universal Search page
  // (`/search`, GET /api/search) exactly as `/matters/[id]/page.tsx`'s own
  // "Search this Matter" link already does — no new search logic is
  // introduced here, only a submission target for the larger Command
  // Center field the Product Owner specified.
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const params2 = new URLSearchParams({ q: searchQuery });
    if (matterId) params2.set('matter_id', matterId);
    router.push(`/search?${params2.toString()}`);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-[#241E17] font-sans selection:bg-[#8A6D2F] selection:text-white relative">
      {(isMobileNavOpen || isDrawerOpen) && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => {
            setIsMobileNavOpen(false);
            setIsDrawerOpen(false);
          }}
          aria-hidden="true"
        />
      )}

      {/* Matter Navigator — static and always visible at lg+; below lg it's
          an off-canvas panel, reusing UX-1's exact mechanism. Hidden
          entirely on the plain /matters list route, which has no single
          Matter to scope navigation to. */}
      {isWorkspaceRoute && (
        <aside
          id="matter-workspace-nav"
          className={`
            fixed lg:static inset-y-0 left-0 z-30 lg:z-20
            w-64 border-r border-[#F4EEE0] bg-white flex flex-col flex-none h-full
            transform transition-transform duration-200 ease-in-out lg:translate-x-0
            ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="h-16 px-6 border-b border-[#F4EEE0] flex items-center justify-between">
            <Link href="/dashboard" className="text-xl font-black tracking-tight text-[#241E17] flex items-center gap-1">
              <span>NextCase</span><span className="text-[#8A6D2F]">HQ</span>
            </Link>
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(false)}
              aria-label="Close matter navigation"
              className="lg:hidden p-1 text-[#726B58] hover:text-[#3A3222] transition-colors bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] rounded"
            >
              ✕
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <Link
              href="/matters"
              className="flex items-center gap-2 px-4 py-2 mb-4 rounded text-xs font-bold uppercase tracking-widest text-[#726B58] hover:text-[#8A6D2F] transition-colors"
            >
              ← All Matters
            </Link>
            {MATTER_NAV_SECTIONS.map((section) => (
              <a
                key={section.anchor}
                href={`#${section.anchor}`}
                onClick={() => setIsMobileNavOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold tracking-wide uppercase text-[#6F5624] hover:text-[#241E17] hover:bg-[#FBF8F1] transition-all"
              >
                <span className="text-lg">{section.icon}</span>
                {section.label}
              </a>
            ))}
          </nav>
        </aside>
      )}

      <div className="flex-1 flex flex-col overflow-hidden h-full">
        <header className="h-16 border-b border-[#F4EEE0] bg-white px-4 md:px-8 flex items-center justify-between z-10 flex-none gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-none">
            {isWorkspaceRoute && (
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(true)}
                aria-label="Open matter navigation"
                aria-expanded={isMobileNavOpen}
                aria-controls="matter-workspace-nav"
                className="lg:hidden flex-none p-2 -ml-2 text-[#6F5624] hover:text-[#241E17] transition-colors bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] rounded"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            {!isWorkspaceRoute && (
              <Link href="/dashboard" className="text-lg font-black tracking-tight text-[#241E17] flex items-center gap-1">
                <span>NextCase</span><span className="text-[#8A6D2F]">HQ</span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4 flex-none">
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-1.5 text-[#726B58] hover:text-[#3A3222] transition-colors cursor-pointer bg-transparent border-none outline-none"
              aria-label="View notifications"
            >
              <span className="text-lg">🔔</span>
              {unreadCount > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-[#8A6D2F] rounded-full"></span>}
            </button>

            {isWorkspaceRoute && (
              <button
                type="button"
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                aria-label="Toggle context drawer"
                aria-expanded={isDrawerOpen}
                aria-controls="matter-context-drawer"
                className="text-xs font-bold uppercase tracking-wider text-[#726B58] hover:text-[#3A3222] transition-colors cursor-pointer bg-transparent border-none outline-none px-3 py-1.5 border border-[#E7DFC9] rounded-lg"
              >
                {isDrawerOpen ? 'Close Context' : 'Context'}
              </button>
            )}

            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.clear();
                  localStorage.clear();
                  document.cookie = 'NEXTCASE_CURRENT_TENANT_ID_CONTEXT=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                  document.cookie = 'NEXTCASE_CURRENT_CASE_CONTEXT=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                  window.location.href = '/';
                }
              }}
              className="text-xs font-bold uppercase tracking-wider text-[#726B58] hover:text-[#3A3222] transition-colors cursor-pointer bg-transparent border-none outline-none"
            >
              Log Out
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-[#FDFBF7] h-[calc(100vh-64px)] w-full relative isolate">
          {isWorkspaceRoute && (
            <div className="max-w-4xl mx-auto px-6 pt-8">
              {/* Search Experience ("Command Center") — large, distraction-
                  free field per Product Owner direction. Submitting reuses
                  the existing, already-real /search page (GET /api/search)
                  verbatim; no new search logic is introduced. */}
              <form onSubmit={handleSearchSubmit} className="relative mb-6">
                <label htmlFor="matter-workspace-search" className="sr-only">
                  Search cases, Acts, Sections, judgments, or ask AI about your matter
                </label>
                <input
                  id="matter-workspace-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search cases, Acts, Sections, judgments, or ask AI about your matter…"
                  className="w-full pl-6 pr-14 py-5 bg-white border border-[#E7DFC9] rounded-2xl shadow-sm outline-none focus:border-[#8A6D2F] text-base placeholder:text-[#726B58]"
                />
                <button
                  type="submit"
                  aria-label="Submit search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 text-[#726B58] hover:text-[#8A6D2F] transition-colors bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] rounded-full"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </form>

              {/* Action Cards — fixed "New Matter" illustrative set for
                  Phase A (per docs/PHASE_A_IMPLEMENTATION_PLAN.md). No
                  workflow-stage detection or prioritization logic is
                  implemented here; that is Phase B or later. Each card
                  links to a real, existing destination, or is an honest
                  disabled state where no destination exists yet — matching
                  this page's own ComingSoonPanel convention rather than
                  fabricating a capability. */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {matterId && (
                  <Link
                    href={`/documents/new?matter_id=${matterId}`}
                    className="flex flex-col items-center gap-1.5 text-center px-3 py-4 bg-white border border-[#E7DFC9]/80 rounded-xl shadow-sm hover:border-[#8A6D2F] transition-all"
                  >
                    <span className="text-lg">📤</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C5340]">Upload Documents</span>
                  </Link>
                )}
                {matterId && (
                  <Link
                    href={`/search?matter_id=${matterId}&type=document,proceeding,court_note`}
                    className="flex flex-col items-center gap-1.5 text-center px-3 py-4 bg-white border border-[#E7DFC9]/80 rounded-xl shadow-sm hover:border-[#8A6D2F] transition-all"
                  >
                    <span className="text-lg">⚖️</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C5340]">Search Case Law</span>
                  </Link>
                )}
                <Link
                  href="/dashboard/ai-chamber"
                  className="flex flex-col items-center gap-1.5 text-center px-3 py-4 bg-white border border-[#E7DFC9]/80 rounded-xl shadow-sm hover:border-[#8A6D2F] transition-all"
                >
                  <span className="text-lg">✨</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#5C5340]">Ask AI</span>
                </Link>
                <div className="flex flex-col items-center gap-1.5 text-center px-3 py-4 bg-[#FBF8F1]/50 border border-dashed border-[#E7DFC9] rounded-xl opacity-60">
                  <span className="text-lg">👥</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F5624]">Add Parties</span>
                  <span className="text-[9px] text-[#726B58]">Coming soon</span>
                </div>
              </div>
            </div>
          )}

          {children}
        </main>

        {/* Notifications and Context drawers are deliberately siblings of
            <main>, not children of it: <main> carries `isolate` (an
            established convention here and in dashboard/layout.tsx), which
            traps any z-index inside its own stacking context. Nesting a
            z-30 drawer inside an isolated <main> while the z-20 backdrop
            lives outside it means the backdrop paints over the drawer
            regardless of z-index — found and fixed during Phase A's own
            Playwright verification. */}
        {isNotificationsOpen && (
          <div className="fixed top-16 right-0 h-[calc(100vh-64px)] w-80 bg-white border-l border-[#F4EEE0] shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-6 border-b border-[#F4EEE0] flex justify-between items-center bg-[#FBF8F1]/50">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#3A3222]">Timeline & Notifications</h3>
              <button
                onClick={() => setIsNotificationsOpen(false)}
                aria-label="Close notifications"
                className="text-xs font-bold text-[#726B58] hover:text-[#3A3222] cursor-pointer bg-transparent border-none outline-none"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 && (
                <div className="text-center py-10">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#FBF6EA] border border-[#E7DFC9]">
                    <span className="text-sm">🔔</span>
                  </div>
                  <p className="text-xs text-[#726B58]">No notifications yet.</p>
                </div>
              )}
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => !notif.read_at && markAsRead(notif.id)}
                  className={`w-full text-left p-4 bg-white border rounded-xl hover:border-[#F1E9D3] transition-all shadow-xs ${
                    notif.read_at ? 'border-[#F4EEE0] opacity-60' : 'border-[#E7DFC9]'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-mono font-bold text-[#8A6D2F] bg-[#FBF6EA] px-1.5 py-0.5 rounded">
                      {notif.type}
                    </span>
                    <span className="text-[9px] font-mono text-[#726B58]">{relativeTime(notif.created_at)}</span>
                  </div>
                  <p className="text-xs font-bold text-[#241E17] leading-relaxed font-sans">{notif.title}</p>
                  {notif.message && (
                    <p className="text-xs text-[#4A4130] leading-relaxed font-sans mt-0.5">{notif.message}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Context Drawer — collapsed by default, empty placeholder in
            Phase A. Citations/Related Cases/AI Sources/References wiring
            is Phase B (docs/MATTER_WORKSPACE_DEPENDENCY_MAP.md §8). */}
        {isWorkspaceRoute && isDrawerOpen && (
          <div
            id="matter-context-drawer"
            className="fixed top-16 right-0 h-[calc(100vh-64px)] w-80 bg-white border-l border-[#F4EEE0] shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200"
          >
            <div className="p-6 border-b border-[#F4EEE0] flex justify-between items-center bg-[#FBF8F1]/50">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#3A3222]">Context</h3>
              <button
                onClick={() => setIsDrawerOpen(false)}
                aria-label="Close context drawer"
                className="text-xs font-bold text-[#726B58] hover:text-[#3A3222] cursor-pointer bg-transparent border-none outline-none"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 text-center">
              <p className="text-xs font-semibold text-[#6F5624] mt-8">Citations, Related Cases, AI Sources, and References are not yet available.</p>
              <p className="text-[10px] text-[#726B58] mt-1">This panel is planned for a future milestone.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
