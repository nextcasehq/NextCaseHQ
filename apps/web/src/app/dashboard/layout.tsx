'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const sidebarItems = [
    { label: 'AI Chamber', href: '/dashboard/ai-chamber', icon: '⚡' },
    { label: 'Cases / Litigation', href: '/dashboard/cases', icon: '📁' },
    { label: 'Search Engine', href: '/dashboard/search', icon: '🔍' },
    { label: 'Compliance Audit', href: '/dashboard/audit', icon: '🛡️' },
    { label: 'Evidence Register', href: '/dashboard/evidence', icon: '⛓️' },
    { label: 'Draft Builder', href: '/dashboard/draft-builder', icon: '✍️' },
    { label: 'System Settings', href: '/dashboard/settings', icon: '⚙️' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-neutral-900 font-sans selection:bg-indigo-600 selection:text-white">
      {/* High-density Left Sidebar */}
      <aside className="w-64 border-r border-neutral-100 bg-white flex flex-col z-20 flex-none h-full">
        {/* Sidebar Header */}
        <div className="h-16 px-6 border-b border-neutral-100 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-black tracking-tight text-neutral-900 flex items-center gap-1">
            <span>NextCase</span><span className="text-indigo-600">HQ</span>
          </Link>
          <span className="text-[10px] font-mono border border-neutral-200 text-neutral-500 rounded px-1.5 py-0.5 uppercase bg-neutral-50">
            HQ // PRO
          </span>
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
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
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
        <div className="p-4 border-t border-neutral-100 bg-neutral-50/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
              NC
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-800">Counsel Session</p>
              <p className="text-[10px] text-neutral-400 font-mono">Bound Context: ACTIVE</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {/* Top Header Row */}
        <header className="h-16 border-b border-neutral-100 bg-white px-8 flex items-center justify-between z-10 flex-none">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs uppercase tracking-widest font-black text-neutral-400">
              PostgreSQL Session RLS Active
            </span>
          </div>

          <div className="flex items-center gap-4">
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
              className="text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-800 transition-colors cursor-pointer bg-transparent border-none outline-none"
            >
              Log Out
            </button>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-auto bg-white h-[calc(100vh-64px)] w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
