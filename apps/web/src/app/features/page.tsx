'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-serif selection:bg-[#111111] selection:text-[#FDFBF7]">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-20 lg:py-32 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="accent" className="mb-4">Compliance Platform Features</Badge>
          <h1 className="text-4xl lg:text-7xl font-bold tracking-tight mb-6">Built for Strict Litigation Controls</h1>
          <p className="font-serif italic text-lg leading-relaxed text-[#111111]/70">Explore our enterprise security, ingestion, and sharding capabilities designed specifically for high-stake legal operations.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="p-8 space-y-4">
            <span className="text-3xl block">🔑</span>
            <h3 className="font-sans font-bold text-sm uppercase tracking-wider">Zero-Knowledge Key Providers</h3>
            <p className="text-sm text-[#111111]/70 leading-relaxed">Integrated key distribution endpoints leveraging CloudKMSProvider circuits to protect client-side envelopes from raw server exposure.</p>
          </Card>

          <Card className="p-8 space-y-4">
            <span className="text-3xl block">📁</span>
            <h3 className="font-sans font-bold text-sm uppercase tracking-wider">High-Density PDF Ingestor</h3>
            <p className="text-sm text-[#111111]/70 leading-relaxed">Fast-ingestion streams verifying structure schemas, scrubbing Indian PII details at edge execution speeds, and returning instant HTTP 202 Accepted status.</p>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
