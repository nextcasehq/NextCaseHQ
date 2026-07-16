'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/Badge';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-serif selection:bg-[#111111] selection:text-[#FDFBF7]">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-20 lg:py-32 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="accent" className="mb-4">Compliance Privacy Policy</Badge>
          <h1 className="text-4xl lg:text-7xl font-bold tracking-tight mb-6">Zero-Knowledge Trust and Client Privilege</h1>
          <p className="font-serif italic text-lg leading-relaxed text-[#111111]/70">We safeguard litigation briefs, draft briefs, and case history telemetry at the client boundary.</p>
        </div>

        <div className="max-w-3xl mx-auto space-y-6 font-serif leading-relaxed text-[#111111]/80">
          <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-[#111111]">1. Local Encryption Only</h3>
          <p>NextCaseHQ has absolutely zero access to client encryption keys. All file envelopes undergo local WebCrypto encryption and are transmitted via sharded vectors with active session bounds.</p>
          <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-[#111111]">2. Passive Edge Scrubbing</h3>
          <p>Any telemetry processed through our edge routing handles are stripped of Indian Aadhaar and PAN numbers dynamically, guaranteeing public metrics logs remain clear of private litigation identifiers.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
