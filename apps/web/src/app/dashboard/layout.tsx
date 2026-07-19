'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import BrandBackground from '@/components/BrandBackground';

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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

  // Close the off-canvas nav on route change (below md) — matches
  // TriPaneChamber's own mobile-panel-switch behavior of not leaving a
  // now-irrelevant mobile surface open after navigating.
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

  const sidebarItems = [
    { label: 'AI Chamber', href: '/dashboard/ai-chamber', icon: '⚡' },
    { label: 'Cases / Litigation', href: '/dashboard/cases', icon: '📁' },
    { label: 'Search Engine', href: '/dashboard/search', icon: '🔍' },
    { label: 'Compliance Audit', href: '/dashboard/audit', icon: '🛡️' },
    { label: 'Evidence Register', href: '/dashboard/evidence', icon: '⛓️' },
    { label: 'Draft Builder', href: '/dashboard/draft-builder', icon: '✍️' },
    { label: 'System Settings', href: '/dashboard/settings', icon: '⚙️' },
  ];

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
      {/* Backdrop — mobile/tablet only, shown while the off-canvas nav is open */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setIsMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* High-density Left Sidebar — static and always visible at md+ (desktop
          behavior unchanged); below md it's an off-canvas panel toggled by
          the header's hamburger button, reusing the same
          state-driven show/hide-by-breakpoint technique TriPaneChamber's
          panels already use internally. */}
      <aside
        id="dashboard-mobile-nav"
        className={`
          fixed md:static inset-y-0 left-0 z-30 md:z-20
          w-64 border-r border-[#F4EEE0] bg-white flex flex-col flex-none h-full
          transform transition-transform duration-200 ease-in-out md:translate-x-0
          ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Sidebar Header */}
        <div className="h-16 px-6 border-b border-[#F4EEE0] flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-black tracking-tight text-[#241E17] flex items-center gap-1">
            <span>NextCase</span><span className="text-[#8A6D2F]">HQ</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono border border-[#E7DFC9] text-[#6F5624] rounded px-1.5 py-0.5 uppercase bg-[#FBF8F1]">
              HQ // PRO
            </span>
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(false)}
              aria-label="Close navigation menu"
              className="md:hidden p-1 text-[#726B58] hover:text-[#3A3222] transition-colors bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] rounded"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded text-sm font-semibold tracking-wide uppercase transition-all
                  ${isActive
                    ? 'bg-[#8A6D2F] text-white shadow-sm shadow-[#8A6D2F]/10'
                    : 'text-[#6F5624] hover:text-[#241E17] hover:bg-[#FBF8F1]'
                  }
                `}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#F4EEE0] bg-[#FBF8F1]/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#8A6D2F] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
              NC
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#3A3222]">Counsel Session</p>
              <p className="text-[10px] text-[#726B58] font-mono">Bound Context: ACTIVE</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {/* Top Header Row */}
        <header className="h-16 border-b border-[#F4EEE0] bg-white px-4 md:px-8 flex items-center justify-between z-10 flex-none">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={isMobileNavOpen}
              aria-controls="dashboard-mobile-nav"
              className="md:hidden flex-none p-2 -ml-2 text-[#6F5624] hover:text-[#241E17] transition-colors bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] rounded"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse flex-none"></span>
            <span className="text-xs uppercase tracking-widest font-black text-[#726B58] truncate">
              PostgreSQL Session RLS Active
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* Interactive Notification Bell */}
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-1.5 text-[#726B58] hover:text-[#3A3222] transition-colors cursor-pointer bg-transparent border-none outline-none"
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
              className="text-xs font-bold uppercase tracking-wider text-[#726B58] hover:text-[#3A3222] transition-colors cursor-pointer bg-transparent border-none outline-none"
            >
              Log Out
            </button>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-auto bg-white h-[calc(100vh-64px)] w-full relative isolate">
          <BrandBackground />
          {children}

          {/* Sliding Notifications Drawer */}
          {isNotificationsOpen && (
            <div className="absolute top-0 right-0 h-full w-80 bg-white border-l border-[#F4EEE0] shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
              <div className="p-6 border-b border-[#F4EEE0] flex justify-between items-center bg-[#FBF8F1]/50">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#3A3222]">Timeline & Notifications</h3>
                <button
                  onClick={() => setIsNotificationsOpen(false)}
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
              <div className="p-4 border-t border-[#F4EEE0] bg-[#FBF8F1]/30 text-center">
                <p className="text-[10px] text-[#726B58] font-mono">NEXTCASE SECURITY TIMELINE</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
