'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget';
import { PrimaryAppNav } from '@/components/PrimaryAppNav';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read_at: string | null;
  created_at: string;
}

/** Compact relative-time label ("5m ago", "2h ago", "3d ago") — same as dashboard/layout.tsx. */
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

const NAVIGATOR_SECTIONS = [
  { label: 'Overview', href: '#overview' },
  { label: 'Litigation Journey', href: '#journey' },
  { label: 'Matter Health', href: '#health' },
  { label: 'Proceedings', href: '#proceedings' },
  { label: 'Timeline', href: '#timeline' },
  { label: 'Documents', href: '#documents' },
  { label: 'Team', href: '#team' },
];

export default function MattersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);
  const [isContextDrawerOpen, setIsContextDrawerOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  // A specific Matter is open (i.e. we're on /matters/[id], not the /matters
  // list) exactly when the path has a second segment — the Matter Navigator
  // only makes sense scoped to one Matter.
  const segments = pathname.split('/').filter(Boolean);
  const activeMatterId = segments[0] === 'matters' && segments.length > 1 ? segments[1] : null;

  // Close the off-canvas nav on route change (below lg) — same behavior as
  // UX-1's dashboard shell.
  React.useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!isMobileNavOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileNavOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMobileNavOpen]);

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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-[#241E17] font-sans selection:bg-[#8A6D2F] selection:text-white relative">
      {/* Backdrop — below lg only, shown while the off-canvas Matter Navigator is open */}
      {isMobileNavOpen && activeMatterId && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setIsMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Matter Navigator — static and visible at lg+ once a Matter is open;
          below lg it's an off-canvas panel toggled by the Top Bar's hamburger
          button. Absent entirely on the /matters list (no Matter to scope it
          to). Reuses the exact off-canvas mechanism from dashboard/layout.tsx
          (isMobileNavOpen state, Escape handler, translate-x transform,
          backdrop) rather than importing it, since the two shells' nav
          content differs enough that a shared abstraction is a Phase A
          non-goal. */}
      {activeMatterId && (
        <aside
          id="matter-navigator"
          className={`
            fixed lg:static inset-y-0 left-0 z-30 lg:z-20
            w-60 border-r border-[#F4EEE0] bg-white flex flex-col flex-none h-full
            transform transition-transform duration-200 ease-in-out lg:translate-x-0
            ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="h-16 px-6 border-b border-[#F4EEE0] flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-widest text-[#B0A588]">Matter</span>
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(false)}
              aria-label="Close Matter Navigator"
              className="lg:hidden p-1 text-[#B0A588] hover:text-[#3A3222] transition-colors bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] rounded"
            >
              ✕
            </button>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {NAVIGATOR_SECTIONS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileNavOpen(false)}
                className="block px-4 py-2.5 rounded text-sm font-semibold tracking-wide text-[#8A7A56] hover:text-[#241E17] hover:bg-[#FBF8F1] transition-all"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="p-4 border-t border-[#F4EEE0]">
            <Link
              href="/matters"
              className="text-[10px] font-bold uppercase tracking-wider text-[#B0A588] hover:text-[#8A6D2F] transition-colors"
            >
              ← All Matters
            </Link>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden h-full relative">
        {/* Top Bar */}
        <header className="h-16 border-b border-[#F4EEE0] bg-white px-4 md:px-8 flex items-center justify-between z-10 flex-none">
          <div className="flex items-center gap-3 min-w-0">
            {activeMatterId && (
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(true)}
                aria-label="Open Matter Navigator"
                aria-expanded={isMobileNavOpen}
                aria-controls="matter-navigator"
                className="lg:hidden flex-none p-2 -ml-2 text-[#8A7A56] hover:text-[#241E17] transition-colors bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] rounded"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <Link href="/dashboard" className="text-lg font-black tracking-tight text-[#241E17] flex items-center gap-1 flex-none">
              <span>NextCase</span><span className="text-[#8A6D2F]">HQ</span>
            </Link>
            <PrimaryAppNav active="matters" />
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            {activeMatterId && (
              <button
                type="button"
                onClick={() => setIsContextDrawerOpen(!isContextDrawerOpen)}
                aria-label="Toggle context drawer"
                aria-expanded={isContextDrawerOpen}
                className="hidden sm:inline-flex relative p-1.5 text-[#B0A588] hover:text-[#3A3222] transition-colors cursor-pointer bg-transparent border-none outline-none"
              >
                <span className="text-lg">📎</span>
              </button>
            )}

            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-1.5 text-[#B0A588] hover:text-[#3A3222] transition-colors cursor-pointer bg-transparent border-none outline-none"
              aria-label="View notifications"
            >
              <span className="text-lg">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-[#8A6D2F] rounded-full"></span>
              )}
            </button>

            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  sessionStorage.clear();
                  localStorage.clear();
                  document.cookie = "NEXTCASE_CURRENT_TENANT_ID_CONTEXT=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                  document.cookie = "NEXTCASE_CURRENT_CASE_CONTEXT=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                  window.location.href = '/';
                }
              }}
              className="text-xs font-bold uppercase tracking-wider text-[#B0A588] hover:text-[#3A3222] transition-colors cursor-pointer bg-transparent border-none outline-none"
            >
              Log Out
            </button>
          </div>
        </header>

        {/* Dynamic Route Content — no <main> here: the page's one <main>
            landmark comes from the root layout (app/layout.tsx), which
            already wraps every route's children in <main>. */}
        <div className="flex-1 overflow-auto bg-[#FDFBF7] h-[calc(100vh-64px)] w-full relative isolate">
          {children}
        </div>

        {/* Sliding Notifications Drawer — a true sibling of the content
            area above, not nested inside its `isolate` stacking context.
            Nesting it there previously trapped the drawer's z-30 beneath
            the fixed Matter Navigator/backdrop (both z-20/z-30, outside
            that isolate) whenever the off-canvas nav opened on top of an
            already-open drawer, covering its own close button. z-40 here
            keeps it unambiguously above both regardless of open order;
            top-16/bottom-0 (in place of top-0/h-full) account for it now
            sitting alongside the header rather than only below it. */}
        {isNotificationsOpen && (
          <div className="absolute top-16 right-0 bottom-0 w-80 bg-white border-l border-[#F4EEE0] shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-6 border-b border-[#F4EEE0] flex justify-between items-center bg-[#FBF8F1]/50">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#3A3222]">Timeline & Notifications</h3>
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="text-xs font-bold text-[#B0A588] hover:text-[#3A3222] cursor-pointer bg-transparent border-none outline-none"
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
                  <p className="text-xs text-[#B0A588]">No notifications yet.</p>
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
                    <span className="text-[9px] font-mono text-[#B0A588]">{relativeTime(notif.created_at)}</span>
                  </div>
                  <p className="text-xs font-bold text-[#241E17] leading-relaxed font-sans">{notif.title}</p>
                  {notif.message && (
                    <p className="text-xs text-[#4A4130] leading-relaxed font-sans mt-0.5">{notif.message}</p>
                  )}
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-[#F4EEE0] bg-[#FBF8F1]/30 text-center">
              <p className="text-[10px] text-[#B0A588] font-mono">NEXTCASE SECURITY TIMELINE</p>
            </div>
          </div>
        )}

        {/* Context Drawer — collapsed by default, empty in Phase A.
            Citations/AI assistance/Related Cases wiring is Phase B.
            Same sibling-of-content-area placement as the notifications
            drawer above, and for the same reason. */}
        {activeMatterId && isContextDrawerOpen && (
          <div className="absolute top-16 right-0 bottom-0 w-80 bg-white border-l border-[#F4EEE0] shadow-2xl z-40 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-6 border-b border-[#F4EEE0] flex justify-between items-center bg-[#FBF8F1]/50">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#3A3222]">Context</h3>
              <button
                onClick={() => setIsContextDrawerOpen(false)}
                className="text-xs font-bold text-[#B0A588] hover:text-[#3A3222] cursor-pointer bg-transparent border-none outline-none"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="text-center py-10 bg-[#FBF8F1]/50 border border-dashed border-[#E7DFC9] rounded-xl">
                <p className="text-xs font-semibold text-[#8A7A56]">Not yet available.</p>
                <p className="text-[10px] text-[#B0A588] mt-1 max-w-xs mx-auto">
                  Citations, AI assistance, and related cases for this Matter are planned for a future milestone.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      <FeedbackWidget />
    </div>
  );
}
