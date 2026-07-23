'use client';

import React from 'react';
import Link from 'next/link';
import { FeedbackWidget } from '@/components/feedback/FeedbackWidget';
import { PrimaryAppNav } from '@/components/PrimaryAppNav';
import { PrimaryAppNavMobile } from '@/components/PrimaryAppNavMobile';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read_at: string | null;
  created_at: string;
}

/** Compact relative-time label ("5m ago", "2h ago", "3d ago") — same as matters/layout.tsx. */
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
 * The Case Diary's own authenticated shell — previously this module had no
 * layout.tsx at all and silently fell back to the root layout's public
 * marketing Navbar (Matters/Cases/Features/Solutions/Pricing), the one
 * major authenticated area of the app that hadn't been given its own
 * shell. Mirrors matters/layout.tsx's top-bar shape (logo, primary
 * cross-module nav, notifications, log out) rather than importing it —
 * same reasoning as that file's own precedent: the two shells' sidebar
 * needs differ enough (Case Diary has no per-Proceeding Navigator) that a
 * shared abstraction beyond PrimaryAppNav itself is unwarranted here.
 */
export default function CasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);

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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-[#241E17] font-sans selection:bg-[#8A6D2F] selection:text-white relative">
      <header className="h-16 border-b border-[#F4EEE0] bg-white px-4 md:px-8 flex items-center justify-between z-10 flex-none">
        <div className="flex items-center gap-3 min-w-0">
          <PrimaryAppNavMobile active="cases" />
          <Link href="/dashboard" className="text-lg font-black tracking-tight text-[#241E17] flex items-center gap-1 flex-none">
            <span>NextCase</span><span className="text-[#8A6D2F]">HQ</span>
          </Link>
          <PrimaryAppNav active="cases" />
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <FeedbackWidget />

          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-1.5 text-[#B0A588] hover:text-[#3A3222] transition-colors cursor-pointer bg-transparent border-none outline-none"
            aria-label="View notifications"
          >
            <span className="text-lg">🔔</span>
            {unreadCount > 0 && <span className="absolute top-0 right-0 w-2 h-2 bg-[#8A6D2F] rounded-full"></span>}
          </button>

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
            className="text-xs font-bold uppercase tracking-wider text-[#B0A588] hover:text-[#3A3222] transition-colors cursor-pointer bg-transparent border-none outline-none"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Dynamic Route Content — no <main> here: the page's one <main>
          landmark comes from the root layout (app/layout.tsx). */}
      <div className="flex-1 overflow-auto bg-[#FDFBF7] h-[calc(100vh-64px)] w-full relative isolate">
        {children}
      </div>

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
                {notif.message && <p className="text-xs text-[#4A4130] leading-relaxed font-sans mt-0.5">{notif.message}</p>}
              </button>
            ))}
          </div>
          <div className="p-4 border-t border-[#F4EEE0] bg-[#FBF8F1]/30 text-center">
            <p className="text-[10px] text-[#B0A588] font-mono">NEXTCASE SECURITY TIMELINE</p>
          </div>
        </div>
      )}
    </div>
  );
}
