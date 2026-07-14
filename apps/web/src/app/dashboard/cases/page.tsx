'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LitigationDb, Case } from '@/lib/db/litigation-db';

export default function CasesDashboardBridgePage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [tenantId, setTenantId] = useState('');

  useEffect(() => {
    setTenantId(LitigationDb.getTenantId());
    setCases(LitigationDb.getCases());
  }, []);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 font-sans text-[#111111] animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200/60 pb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-[#111111]">Active Litigation Portfolios</h1>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mt-1">
            Active Tenant Context: <span className="font-mono text-indigo-600">{tenantId.slice(0, 8)}...</span>
          </p>
        </div>
        <Link
          href="/cases"
          className="self-start md:self-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-lg transition-all shadow-sm"
        >
          + Create Case Workspace
        </Link>
      </div>

      {/* Grid listing */}
      {cases.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cases.map((c) => (
            <div
              key={c.id}
              className="p-6 border border-neutral-200/80 bg-white rounded-xl shadow-sm hover:border-indigo-400 hover:shadow transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                    {c.id}
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    c.status === 'HEARING' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                    c.status === 'DISPOSED' ? 'bg-green-50 text-green-700 border border-green-200' :
                    'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  }`}>
                    {c.status}
                  </span>
                </div>

                <h3 className="font-bold text-base text-[#111111] group-hover:text-indigo-600 transition-colors">{c.title}</h3>
                <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mt-1">{c.court}</p>
                <p className="text-xs text-neutral-500 font-medium leading-relaxed mt-2 line-clamp-2 italic font-serif">
                  "{c.notes || 'No active courtroom notes compiled.'}"
                </p>
              </div>

              <div className="border-t border-neutral-100 pt-4 mt-5 flex justify-between items-center">
                <div>
                  <span className="block text-[8px] font-bold text-neutral-400 uppercase tracking-widest">NEXT ACTION DATE</span>
                  <span className="text-xs font-mono font-bold text-neutral-700">{c.hearingDate || 'N/A'}</span>
                </div>
                <Link
                  href={`/cases/${c.id}`}
                  className="text-xs font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700"
                >
                  Manage Workspace →
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-dashed border-neutral-200 rounded-xl">
          <span className="text-3xl">⚖️</span>
          <h3 className="text-sm font-bold text-neutral-700 mt-3 uppercase tracking-wider">No Case Portfolios</h3>
          <p className="text-xs text-neutral-400 mt-1">Spawn a new case in the Cases Chamber to populate your dashboard.</p>
        </div>
      )}
    </div>
  );
}
