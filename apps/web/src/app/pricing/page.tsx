'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function PricingPage() {
  const tiers = [
    {
      name: "Counsel",
      price: "$99/mo",
      description: "For independent practitioners managing single-jurisdiction litigation.",
      features: ["Single Tenant RLS Instance", "India PII Scrubbing Active", "3 Secure Workspaces", "Shared Design Tokens"]
    },
    {
      name: "Chamber",
      price: "$299/mo",
      description: "For mid-size practice chambers requiring advanced multi-pack regional polymorphism.",
      features: ["Multi-Tenant DB Shards", "3 Regional Court Packs", "Uncapped PDF Ingestion API", "OTel Observability Exports"]
    },
    {
      name: "Firm",
      price: "Custom",
      description: "For enterprise law firms managing global multi-jurisdiction litigation flows.",
      features: ["Chained Immutable Auditing", "CloudKMS Key Provider Integration", "Dedicated Workspace Node Shards", "24/7 Priority Support SLAs"]
    }
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-serif selection:bg-[#111111] selection:text-[#FDFBF7]">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-20 lg:py-32 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="accent" className="mb-4">Flexible Subscriptions</Badge>
          <h1 className="text-4xl lg:text-7xl font-bold tracking-tight mb-6">Transparent Compliance Pricing</h1>
          <p className="font-serif italic text-lg leading-relaxed text-[#111111]/70">Pick a deployment plan that matches your practice group scale and regional needs.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map((tier) => (
            <Card key={tier.name} className="p-8 flex flex-col justify-between h-full border border-[#111111]/10 rounded shadow-sm hover:border-[#111111]/30 transition-all">
              <div className="space-y-6">
                <h3 className="font-sans font-bold text-xs uppercase tracking-widest text-[#111111]/50">{tier.name}</h3>
                <div className="space-y-1">
                  <span className="text-4xl lg:text-5xl font-bold text-[#111111]">{tier.price}</span>
                </div>
                <p className="text-sm font-serif italic text-[#111111]/70 leading-relaxed">{tier.description}</p>

                <div className="border-t border-[#111111]/10 pt-6 space-y-4">
                  {tier.features.map((feat) => (
                    <div key={feat} className="flex items-center gap-3">
                      <span className="text-[#C5A059]">✔</span>
                      <span className="text-xs font-sans font-semibold uppercase tracking-wide text-[#111111]/80">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link href="/login" className="w-full mt-8 block">
                <Button variant={tier.name === "Chamber" ? "secondary" : "primary"} size="sm" className="w-full">
                  Subscribe
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
