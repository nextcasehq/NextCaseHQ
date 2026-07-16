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
    { label: 'AI Chamber', href: '/ai-chamber', icon: '⚡' },
    { label: 'Cases / Litigation', href: '/cases', icon: '📁' },
    { label: 'Search Engine', href: '/search', icon: '🔍' },
    { label: 'Compliance Audit', href: '/audit', icon: '🛡️' },
    { label: 'Evidence Register', href: '/evidence', icon: '⛓️' },
    { label: 'Draft Builder', href: '/draft-builder', icon: '✍️' },
    { label: 'System Settings', href: '/settings', icon: '⚙️' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FDFBF7] text-[#111111] font-sans selection:bg-[#111111] selection:text-[#FDFBF7]">
      {/* High-density Left Sidebar */}
      <aside className="w-64 border-r border-[#111111]/10 bg-white flex flex-col z-20 flex-none h-full">
        {/* Sidebar Header */}
        <div className="h-16 px-6 border-b border-[#111111]/10 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-black tracking-tight text-[#111111]">
            NextCase<span className="text-[#111111]/60">HQ</span>
          </Link>
          <span className="text-[10px] font-mono border border-[#111111]/20 rounded px-1.5 py-0.5 uppercase bg-[#111111]/5">
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
                    ? 'bg-[#111111] text-[#FDFBF7]'
                    : 'text-[#111111]/60 hover:text-[#111111] hover:bg-[#111111]/5'
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
        <div className="p-4 border-t border-[#111111]/10 bg-[#111111]/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#111111] text-[#FDFBF7] flex items-center justify-center font-bold text-xs uppercase">
              NC
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#111111]">Counsel Session</p>
              <p className="text-[10px] text-[#111111]/50 font-mono">Bound Context: ACTIVE</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden h-full">
        {/* Top Header Row */}
        <header className="h-16 border-b border-[#111111]/10 bg-white px-8 flex items-center justify-between z-10 flex-none">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs uppercase tracking-widest font-black text-[#111111]/60">
              PostgreSQL Session RLS Active
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs font-bold uppercase tracking-wider text-[#111111]/60 hover:text-[#111111] transition-colors"
            >
              Log Out
            </Link>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-auto bg-[#FDFBF7] h-[calc(100vh-64px)] w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
