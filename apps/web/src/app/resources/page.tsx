import React from 'react';
import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

const title = 'Resources | NextCaseHQ';
const description =
  'NextCaseHQ compliance handbooks, whitepapers, and operational reports on regulatory change and zero-knowledge litigation practice.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/resources' },
  openGraph: {
    title,
    description,
    url: '/resources',
    siteName: 'NextCaseHQ',
    type: 'website',
    locale: 'en_US',
    images: [{ url: '/landing/product-preview.png', width: 1200, height: 900, alt: 'NextCaseHQ product preview' }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/landing/product-preview.png'],
  },
};

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-serif selection:bg-[#111111] selection:text-[#FDFBF7]">
      <div className="flex-1 max-w-7xl mx-auto px-6 py-20 lg:py-32 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="accent" className="mb-4">Compliance Resources</Badge>
          <h1 className="text-4xl lg:text-7xl font-bold tracking-tight mb-6">Expert Legal Tech Publications</h1>
          <p className="font-serif italic text-lg leading-relaxed text-[#111111]/70">Access our comprehensive handbooks, whitepapers, and operational reports detailing modern regulatory changes.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="p-8 space-y-4">
            <span className="text-xs font-mono font-bold text-[#6C5831] uppercase">Compliance Guide</span>
            <h2 className="font-sans font-bold text-sm uppercase tracking-wider">The BNS/BNSS Integration Playbook</h2>
            <p className="text-sm text-[#111111]/70 leading-relaxed font-serif">A complete diagnostic analysis of procedural timeline mapping and digital evidentiary requirements under the new Indian criminal procedures code.</p>
          </Card>

          <Card className="p-8 space-y-4">
            <span className="text-xs font-mono font-bold text-[#6C5831] uppercase">Whitepaper</span>
            <h2 className="font-sans font-bold text-sm uppercase tracking-wider">Zero-Knowledge Envelopes for Litigation</h2>
            <p className="text-sm text-[#111111]/70 leading-relaxed font-serif">An in-depth cryptographic audit explaining client-side Key Distribution and AES-GCM 256-bit isolation patterns.</p>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
