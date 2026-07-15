'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-serif selection:bg-[#111111] selection:text-[#FDFBF7]">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-20 lg:py-32 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="accent" className="mb-4">Developer & User Docs</Badge>
          <h1 className="text-4xl lg:text-7xl font-bold tracking-tight mb-6">Technical Integration Guides</h1>
          <p className="font-serif italic text-lg leading-relaxed text-[#111111]/70">Everything you need to configure CloudKMS key providers, map regional state models, and integrate edge webhooks.</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="p-8 space-y-4">
            <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-[#111111]">1. Secure Upload API</h3>
            <p className="text-xs font-mono text-[#111111]/50">ENDPOINT: POST /api/documents/upload</p>
            <p className="text-sm font-serif text-[#111111]/70 leading-relaxed">
              Accepts client-side encrypted document vectors alongside target practice tenant headers. Returns instant 202 status code after queuing asynchronous OCR, translations, and indexing sharding pipelines.
            </p>
          </Card>

          <Card className="p-8 space-y-4">
            <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-[#111111]">2. Edge Webhook Handling</h3>
            <p className="text-xs font-mono text-[#111111]/50">ENDPOINT: POST /api/webhooks</p>
            <p className="text-sm font-serif text-[#111111]/70 leading-relaxed">
              Handles case alerts, updates, and reminders dynamically from partner systems. Validates payloads using Zod schemas and processes India PII scrubbing filters before logging data to stdout.
            </p>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
