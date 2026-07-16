'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-serif selection:bg-[#111111] selection:text-[#FDFBF7]">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-20 lg:py-32 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="accent" className="mb-4">About NextCaseHQ</Badge>
          <h1 className="text-4xl lg:text-7xl font-bold tracking-tight mb-6">Our Mission and Constitutional Philosophy</h1>
          <p className="font-serif italic text-lg leading-relaxed text-[#111111]/70">We believe legal tech must be built on the absolute principles of strict client-side privacy, RLS tenant isolation, and regulatory conformity.</p>
        </div>

        <div className="max-w-3xl mx-auto space-y-8 font-serif leading-relaxed text-[#111111]/80">
          <p>
            NextCaseHQ was founded by a team of litigation specialists and cryptographers with a clear premise: generic SaaS is inadequate for enterprise-scale legal operations.
          </p>
          <p>
            By designing client-side Zero-Knowledge cryptographic envelopes and sharding transactional data based on dynamic session variables, we allow enterprise firms to leverage cutting-edge AI dialogue chambers without sacrificing regulatory alignment or client privilege.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
