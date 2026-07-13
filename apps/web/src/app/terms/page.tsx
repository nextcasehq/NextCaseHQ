'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/Badge';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-serif selection:bg-[#111111] selection:text-[#FDFBF7]">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-20 lg:py-32 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="accent" className="mb-4">Compliance Terms of Service</Badge>
          <h1 className="text-4xl lg:text-7xl font-bold tracking-tight mb-6">Constitutional Usage Guidelines</h1>
          <p className="font-serif italic text-lg leading-relaxed text-[#111111]/70">Explore the legal rights, requirements, and compliance parameters for sharded tenant sessions.</p>
        </div>

        <div className="max-w-3xl mx-auto space-y-6 font-serif leading-relaxed text-[#111111]/80">
          <p>By initializing a NextCaseHQ practice tenant container or session and uploading encrypted file vectors, you agree to comply with our strict multi-tenant boundary isolation requirements.</p>
          <p>Any attempt to intentionally bypass session bindings, trigger cross-tenant data leaks, or manipulate immutable log HMACS is considered a direct constitutional violation, resulting in immediate container lockdown.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
