'use client';

import React from 'react';
import { TriPaneChamber } from '@/components/TriPaneChamber';

/**
 * NCHQ Module 9: Consolidated Advocate Dashboard
 * Prepared for active tenant routing and high-focus litigation workflows.
 */
export default function DashboardPage() {
  return (
    <div className="flex flex-col h-screen bg-bg-base text-text-primary">
      <header className="h-16 border-b border-brand/10 flex items-center px-8 bg-bg-surface">
        <h1 className="text-xl font-bold text-brand">NextCaseHQ Dashboard</h1>
        <div className="ml-auto text-xs text-text-primary/40 font-mono uppercase tracking-widest">
          Tenant Boundary: Verified
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        <TriPaneChamber />
      </div>
    </div>
  );
}
