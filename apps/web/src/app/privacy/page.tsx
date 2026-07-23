import React from 'react';
import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/Badge';

const title = 'Privacy Policy | NextCaseHQ';
const description =
  "NextCaseHQ's privacy policy: how Matter, Proceeding, and document data is stored, isolated per tenant, and protected.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/privacy' },
  openGraph: {
    title,
    description,
    url: '/privacy',
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

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-serif selection:bg-[#111111] selection:text-[#FDFBF7]">
      <div className="flex-1 max-w-7xl mx-auto px-6 py-20 lg:py-32 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="accent" className="mb-4">Compliance Privacy Policy</Badge>
          <h1 className="text-4xl lg:text-7xl font-bold tracking-tight mb-6">Data Privacy and Client Privilege</h1>
          <p className="font-serif italic text-lg leading-relaxed text-[#111111]/70">How we store, isolate, and protect the Matter, Proceeding, and document data you enter into NextCaseHQ.</p>
        </div>

        <div className="max-w-3xl mx-auto space-y-6 font-serif leading-relaxed text-[#111111]/80">
          <h2 className="font-sans font-bold text-sm uppercase tracking-wider text-[#111111]">1. Tenant Isolation</h2>
          <p>Every firm using NextCaseHQ is a separate tenant. Matter, Proceeding, document, and Court Note data is scoped to your tenant by database-enforced row-level security, so it is never visible to another firm's users, regardless of application-level bugs.</p>
          <h2 className="font-sans font-bold text-sm uppercase tracking-wider text-[#111111]">2. Access Control</h2>
          <p>Access to your firm's data requires an authenticated session tied to your tenant. Administrative access within your firm is governed by the roles your firm assigns in the Admin panel.</p>
          <p className="text-sm text-[#111111]/60">This page describes the platform's technical data-isolation architecture. It is not a substitute for a complete legal privacy policy or terms of service, which should be reviewed with counsel before relying on it for compliance purposes.</p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
