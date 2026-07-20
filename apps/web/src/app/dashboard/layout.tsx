'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

/**
 * Dashboard shell — top bar only (Search / AI Credits / Notifications /
 * Profile), full-width content below. The old left sidebar (AI Chamber,
 * Cases / Litigation, Search Engine, Compliance Audit, Evidence Register,
 * Draft Builder, System Settings as a persistent nav list) has been
 * removed: it was the old, fragmented dashboard IA the approved
 * restructuring replaces. Settings is still reachable from the Profile
 * menu; AI Chamber and Draft Builder remain real routes (they're
 * production Action Card destinations linked from the Matter Workspace
 * and the landing page — see matters/[id]/page.tsx and
 * components/landing/sections/HeroSection.tsx) but are no longer
 * shortcut-linked from this dashboard, since the new Quick Actions
 * (Draft a Document / Upload-Link a Document / Next Hearing & Stage)
 * are the dashboard's own entry points into that work now.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const profileRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isProfileOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isProfileOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    setIsMobileSearchOpen(false);
  };

  const handleLogOut = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      localStorage.clear();
      document.cookie = 'NEXTCASE_CURRENT_TENANT_ID_CONTEXT=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'NEXTCASE_CURRENT_CASE_CONTEXT=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      window.location.href = '/';
    }
  };

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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-[#241E17] font-sans selection:bg-[#8A6D2F] selection:text-white">
      {/* Top Header Row — brand, Search, Notifications, AI Credits, Profile */}
      <header className="h-16 border-b border-[#F4EEE0] bg-white px-4 md:px-8 flex items-center justify-between gap-3 z-10 flex-none relative">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Link href="/dashboard" className="flex-none text-lg font-black tracking-tight text-[#241E17] flex items-center gap-1">
            <span>NextCase</span><span className="text-[#8A6D2F]">HQ</span>
          </Link>

          {/* Search — the one dashboard search experience; the main
              content area does not duplicate this. */}
          <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center flex-1 max-w-sm bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg px-3 py-1.5 focus-within:border-[#8A6D2F] transition-colors">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#B0A588] flex-none" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search matters, case numbers, parties, courts, documents..."
              aria-label="Search"
              className="w-full bg-transparent border-none outline-none text-xs font-medium text-[#241E17] placeholder-[#B0A588] px-2 py-0.5"
            />
          </form>
          <button
            type="button"
            onClick={() => setIsMobileSearchOpen((v) => !v)}
            aria-label="Search"
            aria-expanded={isMobileSearchOpen}
            className="sm:hidden flex-none p-2 text-[#B0A588] hover:text-[#3A3222] transition-colors bg-transparent border-none outline-none"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex items-center gap-2 md:gap-4 flex-none">
          {/* AI Credits — a small account-status control, not a dashboard card. */}
          <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#E7DFC9] bg-[#FBF8F1]"
            title="Illustrative — AI credit metering is not yet connected to a production billing system."
          >
            <span aria-hidden="true" className="text-[11px]">✨</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-[#8A7A56]">AI Credits</span>
            <span className="text-xs font-black text-[#8A6D2F]">240</span>
            <Link href="/pricing" className="text-[9px] font-bold uppercase text-[#8A6D2F] hover:underline ml-0.5">
              Buy More
            </Link>
          </div>

          {/* Interactive Notification Bell */}
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

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen((v) => !v)}
              aria-label="Profile menu"
              aria-expanded={isProfileOpen}
              className="w-8 h-8 rounded-full bg-[#8A6D2F] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm cursor-pointer border-none outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] focus-visible:ring-offset-2"
            >
              NC
            </button>
            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#E7DFC9] rounded-xl shadow-xl z-40 py-1.5 animate-in slide-in-from-top-1 duration-150">
                <div className="px-4 py-2 border-b border-[#F4EEE0]">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#3A3222]">Counsel Session</p>
                  <p className="text-[9px] text-[#B0A588] font-mono">Bound Context: ACTIVE</p>
                </div>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="block px-4 py-2 text-xs font-semibold text-[#3A3222] hover:bg-[#FBF8F1] transition-colors"
                >
                  Settings
                </Link>
                <button
                  onClick={handleLogOut}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-[#3A3222] hover:bg-[#FBF8F1] transition-colors bg-transparent border-none outline-none cursor-pointer"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile search overlay — keeps the header itself uncluttered
            below sm, per "no horizontal overflow" / "no crowding". */}
        {isMobileSearchOpen && (
          <form
            onSubmit={handleSearchSubmit}
            className="sm:hidden absolute top-full left-0 right-0 bg-white border-b border-[#E7DFC9] shadow-md p-3 flex items-center gap-2 z-40"
          >
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search matters, case numbers, parties, courts, documents..."
              aria-label="Search"
              className="w-full bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#241E17] placeholder-[#B0A588] px-3 py-2"
            />
            <button type="submit" aria-label="Submit search" className="flex-none text-[#8A6D2F] bg-transparent border-none outline-none">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        )}
      </header>

      {/* Dynamic Route Content — full width, no sidebar */}
      <main className="flex-1 overflow-auto bg-white w-full relative isolate">
        <BrandBackground />
        {children}

        {/* Sliding Notifications Drawer */}
        {isNotificationsOpen && (
          <div className="absolute top-0 right-0 h-full w-80 bg-white border-l border-[#F4EEE0] shadow-2xl z-30 flex flex-col animate-in slide-in-from-right duration-200">
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
      </main>
    </div>
  );
}
