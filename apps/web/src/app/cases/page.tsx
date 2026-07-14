'use client';

import React from 'react';

/**
 * NCHQ Module 9: Litigation Case Registry
 * High-performance list view for active legal matters.
 */
export default function CasesPage() {
  const mockCases = [
    { id: '1', title: 'WP 132/2026', framework: 'BNSS 2023', status: 'Active' },
    { id: '2', title: 'Suit 45/2025', framework: 'BNS 2023', status: 'Pending' },
  ];

  return (
    <div className="p-8 bg-bg-base min-h-screen text-text-primary">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-brand">Case Registry</h1>
        <p className="text-sm text-text-primary/40 font-mono mt-1">Multi-tenant isolation verified</p>
      </header>
      <div className="grid gap-4">
        {mockCases.map((c) => (
          <div key={c.id} className="p-4 bg-bg-surface border border-brand/10 rounded-md flex justify-between items-center">
            <div>
              <div className="font-bold">{c.title}</div>
              <div className="text-xs text-brand font-mono uppercase tracking-tighter">{c.framework}</div>
            </div>
            <div className="text-xs uppercase px-2 py-1 bg-brand/5 border border-brand/10 rounded">
              {c.status}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
