'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AdminGlobalSearch } from './admin-global-search';

interface NavItem {
  href: string;
  label: string;
}
interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { title: 'Overview', items: [{ href: '/admin', label: 'Dashboard' }] },
  {
    title: 'Accounts',
    items: [
      { href: '/admin/users', label: 'Users' },
      { href: '/admin/firms', label: 'Firms / Tenants' },
      { href: '/admin/roles', label: 'Roles & Access' },
    ],
  },
  {
    title: 'Commercialization',
    items: [
      { href: '/admin/commercialization/plans', label: 'Plans' },
      { href: '/admin/commercialization/ai-credit-costs', label: 'AI Credit Costs' },
      { href: '/admin/commercialization/balances', label: 'Credit Balances' },
      { href: '/admin/commercialization/transactions', label: 'Credit Transactions' },
      { href: '/admin/commercialization/promotions', label: 'Promotions & Trials' },
      { href: '/admin/commercialization/rules', label: 'Billing Rules' },
    ],
  },
  {
    title: 'Legal Operations',
    items: [
      { href: '/admin/matters', label: 'Matter Registers' },
      { href: '/admin/templates', label: 'Document Templates' },
      { href: '/admin/legal-search', label: 'Legal Search' },
      { href: '/admin/ecourts', label: 'eCourts' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { href: '/admin/notifications', label: 'Notifications' },
      { href: '/admin/integrations', label: 'Integrations' },
      { href: '/admin/feature-flags', label: 'Feature Flags' },
      { href: '/admin/settings', label: 'System Settings' },
    ],
  },
  {
    title: 'Governance',
    items: [
      { href: '/admin/security', label: 'Security' },
      { href: '/admin/audit', label: 'Audit Logs' },
      { href: '/admin/notices', label: 'Operational Notices' },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // Cookie is short-lived even if this call fails; proceed regardless.
    }
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] font-sans selection:bg-[#111111] selection:text-[#FDFBF7]">
      <div className="bg-[#111111] text-[#FDFBF7] border-b border-[#FDFBF7]/15 py-3 px-4 md:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setIsMobileNavOpen((v) => !v)}
            className="lg:hidden p-1.5 border border-[#FDFBF7]/20 rounded"
            aria-label="Toggle admin navigation"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="px-2 py-0.5 bg-[#8A6D2F] text-[10px] tracking-wider uppercase font-extrabold rounded text-white flex-none">
            ADMIN
          </div>
          <span className="text-xs font-mono tracking-widest uppercase truncate">NextCaseHQ — Platform Administration</span>
        </div>
        <div className="flex items-center gap-3 text-xs flex-none">
          <span className="hidden md:inline font-semibold text-[#B0A588]">
            Operator: <span className="text-[#FDFBF7] font-mono">Platform Admin</span>
          </span>
          <button
            onClick={handleLogout}
            className="px-2.5 py-1 rounded text-[10px] bg-red-600 text-white font-bold uppercase tracking-wider hover:bg-red-700 transition-all"
          >
            Lock Console
          </button>
        </div>
      </div>

      <div className="px-4 md:px-6 pt-4">
        <AdminGlobalSearch />
      </div>

      <div className="flex flex-col lg:flex-row">
        <aside
          className={`w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-[#111111]/10 bg-white flex-shrink-0 ${isMobileNavOpen ? 'block' : 'hidden lg:block'}`}
        >
          <nav className="p-4 space-y-5">
            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#B0A588] px-3 mb-1.5">{group.title}</p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileNavOpen(false)}
                        className={`block px-3 py-2 text-xs font-bold rounded transition-all ${active ? 'bg-[#8A6D2F] text-white' : 'hover:bg-[#8A6D2F]/10 text-[#8A7A56]'}`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
          <div className="p-4 border-t border-[#111111]/10">
            <Link href="/dashboard" className="w-full py-2.5 text-center block bg-[#111111] text-[#FDFBF7] text-xs font-bold uppercase tracking-widest rounded shadow hover:opacity-95 transition-all">
              ← Back to Workspace
            </Link>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-8 max-w-7xl overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
