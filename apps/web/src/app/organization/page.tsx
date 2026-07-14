'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OrganizationPage() {
  const router = useRouter();
  const [selectedTenant, setSelectedTenant] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const mockTenants = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'India Practice Group (BNS & BNSS Compliance)', jurisdiction: 'IN' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'US Federal Litigation (FRCP Compliance)', jurisdiction: 'US' },
    { id: '33333333-3333-3333-3333-333333333333', name: 'UK High Court Practice (CPR Compliance)', jurisdiction: 'UK' },
  ];

  const handleSelectTenant = (tenantId: string) => {
    setSelectedTenant(tenantId);
    setIsTransitioning(true);

    // Commit target token string into sessionStorage & cookie representation
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('NEXTCASE_CURRENT_TENANT_ID_CONTEXT', tenantId);
      document.cookie = `NEXTCASE_CURRENT_TENANT_ID_CONTEXT=${tenantId}; path=/; max-age=86400; SameSite=Strict`;
    }

    // Simulate database session binding context and skeleton loading handoff
    setTimeout(() => {
      router.push('/dashboard');
    }, 1000);
  };

  if (isTransitioning) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col justify-center items-center px-6 font-sans">
        <div className="w-full max-w-lg space-y-6 animate-pulse">
          {/* Handoff Header Skeleton */}
          <div className="h-4 bg-[#111111]/10 rounded w-1/3 mx-auto"></div>
          <div className="h-8 bg-[#111111]/10 rounded w-2/3 mx-auto"></div>

          {/* Dashboard Frame Skeleton Loaders */}
          <div className="border border-[#111111]/10 rounded p-6 bg-white space-y-4">
            <div className="h-6 bg-[#111111]/10 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-[#111111]/10 rounded w-full"></div>
              <div className="h-4 bg-[#111111]/10 rounded w-5/6"></div>
              <div className="h-4 bg-[#111111]/10 rounded w-2/3"></div>
            </div>
          </div>
          <p className="text-center text-xs tracking-wider uppercase font-bold text-[#111111]/40">
            Binding secure multi-tenant PostgreSQL session context...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col justify-center items-center px-6 py-12 font-sans selection:bg-[#111111] selection:text-[#FDFBF7]">
      <div className="w-full max-w-xl text-center mb-8">
        <h1 className="text-2xl font-bold uppercase tracking-widest text-[#111111]/40 mb-2">
          Identity Workspace Gateway
        </h1>
        <p className="text-sm font-serif italic text-[#111111]/70">
          Select an authorized practice tenant to bind your secure cryptographic litigation context.
        </p>
      </div>

      <div className="w-full max-w-xl bg-white border border-[#111111]/10 rounded shadow-sm p-8 space-y-4">
        {mockTenants.map((tenant) => (
          <button
            key={tenant.id}
            onClick={() => handleSelectTenant(tenant.id)}
            className="w-full text-left p-6 border border-[#111111]/10 rounded hover:border-[#111111] hover:bg-[#111111]/5 transition-all flex justify-between items-center group active:scale-[0.99]"
          >
            <div>
              <span className="text-xs font-bold font-mono text-[#111111]/40 uppercase tracking-widest block mb-1">
                Tenant: {tenant.id.slice(0, 8)} // {tenant.jurisdiction} Pack
              </span>
              <span className="font-bold text-base text-[#111111] group-hover:text-brand">
                {tenant.name}
              </span>
            </div>
            <div className="px-3 py-1.5 border border-[#111111]/10 rounded text-xs uppercase font-bold tracking-wider font-mono">
              Initialize
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
