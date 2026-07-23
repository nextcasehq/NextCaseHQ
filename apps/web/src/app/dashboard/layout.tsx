'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import BrandBackground from '@/components/BrandBackground';
import { AiCreditsTopBarControl } from '@/components/ai-credits/credits-popover';
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget';
import { PrimaryAppNavMobile } from '@/components/PrimaryAppNavMobile';

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
 * components/landing/LandingPageContent.tsx) but are no longer
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
  const pathname = usePathname();
  // The Document Creator is a dedicated drafting workspace, not a standard
  // dashboard page — this drives two things below: the top bar's search
  // (a matter/document lookup that navigates away to /search) doesn't
  // belong in a drafting workflow, and the bar itself renders shorter and
  // quieter so the editor gets the vertical space instead. Every other
  // page this shared layout serves keeps the search bar and the standard
  // header height exactly as-is.
  const isDocumentCreatorRoute = (pathname ?? '').startsWith('/dashboard/draft-builder');
  const hideSearch = isDocumentCreatorRoute;
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState(false);
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const profileRef = React.useRef<HTMLDivElement>(null);

  // Closes any mobile search overlay left open from a prior page — this
  // layout persists across client-side navigation within /dashboard/*, so
  // isMobileSearchOpen can otherwise still be true from before the advocate
  // navigated into the Document Creator.
  React.useEffect(() => {
    if (hideSearch) setIsMobileSearchOpen(false);
  }, [hideSearch]);

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

  // Top-bar search rule (Option B): this stays general matter/document
  // navigation to the real /search page — its own purpose since before this
  // milestone. The dashboard's own Legal Search workspace input is clearly
  // labelled "Search Judgments & Citations" so the two are never confused
  // for duplicate, identical search bars.
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    setIsMobileSearchOpen(false);
  };

  const handleLogOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Session cookie is short-lived even if this call fails; proceed
      // regardless — there is no dedicated login page to send them to, so
      // land back on the publicly-viewable dashboard launch page instead.
    }
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      localStorage.clear();
      document.cookie = 'NEXTCASE_CURRENT_TENANT_ID_CONTEXT=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'NEXTCASE_CURRENT_CASE_CONTEXT=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      window.location.href = '/dashboard';
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

  // Compact header sizing for the Document Creator only — a dedicated
  // drafting workspace should read closer to Google Docs/Notion/Word Web's
  // own quiet top bar than a standard dashboard page's. Explicit pixel
  // values throughout, not the numbered Tailwind spacing scale: this
  // repo's tailwind.config.ts doubles keys 1–16 (h-16 here is actually
  // 128px, w-8/h-8 is 64px, not their normal Tailwind sizes), so arbitrary
  // values are the only way to land on a genuinely small, exact height —
  // the standard header (h-16, w-8/h-8, etc.) is untouched below for
  // every other page.
  const headerHeightClass = isDocumentCreatorRoute ? 'h-[44px]' : 'h-16';
  const headerPaddingClass = isDocumentCreatorRoute ? 'px-3 md:px-4' : 'px-4 md:px-8';
  const logoTextClass = isDocumentCreatorRoute ? 'text-sm' : 'text-lg';
  const bellEmojiClass = isDocumentCreatorRoute ? 'text-sm' : 'text-lg';
  const avatarSizeClass = isDocumentCreatorRoute ? 'w-[28px] h-[28px] text-[9px]' : 'w-8 h-8 text-xs';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-[#241E17] font-sans selection:bg-[#8A6D2F] selection:text-white">
      {/* Top Header Row — brand, Search, Notifications, AI Credits, Profile */}
      <header className={`${headerHeightClass} border-b border-[#F4EEE0] bg-white ${headerPaddingClass} flex items-center justify-between gap-3 z-10 flex-none relative`}>
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <PrimaryAppNavMobile active={isDocumentCreatorRoute ? 'draft-builder' : undefined} />
          <Link href="/dashboard" className={`flex-none ${logoTextClass} font-black tracking-tight text-[#241E17] flex items-center gap-1`}>
            <span>NextCase</span><span className="text-[#8A6D2F]">HQ</span>
          </Link>

          {/* Search — the one dashboard search experience; the main
              content area does not duplicate this. Not rendered on the
              Document Creator (see hideSearch above). */}
          {!hideSearch && (
            <>
              <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center flex-1 max-w-sm bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg px-3 py-1.5 focus-within:border-[#8A6D2F] transition-colors">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#726B58] flex-none" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search matters, case numbers, parties, courts, documents..."
                  aria-label="Search"
                  className="w-full bg-transparent border-none outline-none text-xs font-medium text-[#241E17] placeholder-[#726B58] px-2 py-0.5"
                />
              </form>
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen((v) => !v)}
                aria-label="Search"
                aria-expanded={isMobileSearchOpen}
                className="sm:hidden flex-none p-2 text-[#726B58] hover:text-[#3A3222] transition-colors bg-transparent border-none outline-none"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
                </svg>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:gap-4 flex-none">
          {/* AI Credits — a small account-status control, not a dashboard card.
              Reads from the shared AI Credits commercialization store
              (see lib/ai-credits) — demonstration balance/plan/ledger data,
              editable from Admin → Commercialization, not yet a production
              billing system. */}
          <AiCreditsTopBarControl />

          <FeedbackWidget />

          {/* Interactive Notification Bell */}
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-1.5 text-[#726B58] hover:text-[#3A3222] transition-colors cursor-pointer bg-transparent border-none outline-none"
            aria-label="View notifications"
          >
            <span className={bellEmojiClass}>🔔</span>
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
              className={`${avatarSizeClass} rounded-full bg-[#8A6D2F] text-white flex items-center justify-center font-bold uppercase shadow-sm cursor-pointer border-none outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] focus-visible:ring-offset-2`}
            >
              NC
            </button>
            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#E7DFC9] rounded-xl shadow-xl z-40 py-1.5 animate-in slide-in-from-top-1 duration-150">
                <div className="px-4 py-2 border-b border-[#F4EEE0]">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#3A3222]">Counsel Session</p>
                  <p className="text-[9px] text-[#726B58] font-mono">Bound Context: ACTIVE</p>
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
        {!hideSearch && isMobileSearchOpen && (
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
              className="w-full bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#241E17] placeholder-[#726B58] px-3 py-2"
            />
            <button type="submit" aria-label="Submit search" className="flex-none text-[#8A6D2F] bg-transparent border-none outline-none">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        )}
      </header>

      {/* Dynamic Route Content — full width, no sidebar. No <main> here:
          the page's one <main> landmark comes from the root layout
          (app/layout.tsx), which already wraps every route's children in
          <main> — a second one here would nest two <main> landmarks,
          which is invalid HTML and confuses screen readers. */}
      <div className="flex-1 overflow-auto bg-white w-full relative isolate">
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
      </div>
    </div>
  );
}
