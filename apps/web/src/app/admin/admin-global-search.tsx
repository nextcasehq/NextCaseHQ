'use client';

import React from 'react';
import Link from 'next/link';
import { getUsers } from '@/lib/admin/users';
import { getFirms } from '@/lib/admin/firms';
import { getPlans } from '@/lib/ai-credits/catalogue';
import { getFeatureFlags } from '@/lib/admin/feature-flags';
import { getAuditLog } from '@/lib/admin/audit-log';
import { getMatterOversightRows } from '@/lib/admin/matter-oversight';
import { getLedger, CURRENT_ACCOUNT_ID } from '@/lib/ai-credits/wallet-store';

interface SearchResult {
  id: string;
  label: string;
  category: string;
  href: string;
}

/** One global Admin search control. Never surfaces confidential document
 * contents — Matter results are titles/ids only (the same non-confidential
 * metadata the Matter Register Oversight page itself shows). */
export function AdminGlobalSearch() {
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const results: SearchResult[] = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: SearchResult[] = [];

    for (const u of getUsers()) {
      if (u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) {
        out.push({ id: u.id, label: `${u.name} (${u.email})`, category: 'User', href: '/admin/users' });
      }
    }
    for (const f of getFirms()) {
      if (f.name.toLowerCase().includes(q) || f.tenantRef.toLowerCase().includes(q) || f.id.toLowerCase().includes(q)) {
        out.push({ id: f.id, label: `${f.name} (${f.tenantRef})`, category: 'Firm / Tenant', href: '/admin/firms' });
      }
    }
    for (const p of getPlans()) {
      if (p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)) {
        out.push({ id: p.id, label: `${p.name} (${p.code})`, category: 'Plan', href: '/admin/commercialization/plans' });
      }
    }
    for (const flag of getFeatureFlags()) {
      if (flag.key.toLowerCase().includes(q) || flag.displayName.toLowerCase().includes(q)) {
        out.push({ id: flag.key, label: flag.displayName, category: 'Feature Flag', href: '/admin/feature-flags' });
      }
    }
    for (const m of getMatterOversightRows()) {
      if (m.title.toLowerCase().includes(q)) {
        out.push({ id: m.id, label: m.title, category: 'Matter Register', href: '/admin/matters' });
      }
    }
    for (const entry of getLedger(CURRENT_ACCOUNT_ID)) {
      if (entry.referenceId.toLowerCase().includes(q) || entry.id.toLowerCase().includes(q)) {
        out.push({ id: entry.id, label: `${entry.type} — ${entry.referenceId}`, category: 'Transaction', href: '/admin/commercialization/transactions' });
      }
    }
    for (const event of getAuditLog()) {
      if (event.id.toLowerCase().includes(q) || event.action.toLowerCase().includes(q)) {
        out.push({ id: event.id, label: `${event.action} — ${event.target}`, category: 'Audit Event', href: '/admin/audit' });
      }
    }
    return out.slice(0, 12);
  }, [query]);

  return (
    <div className="relative max-w-xl" ref={ref}>
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search users, firms, plans, matters, transactions, flags, audit events..."
        aria-label="Admin global search"
        className="w-full px-3 py-2 text-xs border border-[#E7DFC9] rounded-lg focus:outline-none focus:border-[#8A6D2F] bg-white"
      />
      {open && query.trim() !== '' && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E7DFC9] rounded-xl shadow-xl z-40 max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <p className="p-3 text-xs text-[#8A7A56]">No matches.</p>
          ) : (
            results.map((r) => (
              <Link
                key={`${r.category}-${r.id}`}
                href={r.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 border-b border-[#F4EEE0] last:border-0 hover:bg-[#FBF8F1] transition-colors"
              >
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#B0A588]">{r.category}</p>
                <p className="text-xs font-semibold text-[#3A3222] truncate">{r.label}</p>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
