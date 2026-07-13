'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-serif selection:bg-[#111111] selection:text-[#FDFBF7]">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-20 lg:py-32 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="accent" className="mb-4">Litigation Practice Solutions</Badge>
          <h1 className="text-4xl lg:text-7xl font-bold tracking-tight mb-6">Regional Polymorphism Tailored to Your Case</h1>
          <p className="font-serif italic text-lg leading-relaxed text-[#111111]/70">Explore pre-configured compliance state-machines optimized for multiple active world court procedures.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-8 space-y-4">
            <span className="text-3xl block">🇮🇳</span>
            <h3 className="font-sans font-bold text-sm uppercase tracking-wider">India Practice Model</h3>
            <p className="text-xs text-[#111111]/50 font-mono">BNS & BNSS PROCEDURES</p>
            <p className="text-sm text-[#111111]/70 leading-relaxed">Integrated timeline state models mapping Indian criminal code constraints and automatic PAN/Aadhaar logging filters.</p>
          </Card>

          <Card className="p-8 space-y-4">
            <span className="text-3xl block">🇺🇸</span>
            <h3 className="font-sans font-bold text-sm uppercase tracking-wider">US Practice Model</h3>
            <p className="text-xs text-[#111111]/50 font-mono">FEDERAL CIVIL RULES (FRCP)</p>
            <p className="text-sm text-[#111111]/70 leading-relaxed">Pre-built schedules mapping Rule 26 disclosures, expert reports timeline restrictions, and pleading compliance metrics.</p>
          </Card>

          <Card className="p-8 space-y-4">
            <span className="text-3xl block">🇬🇧</span>
            <h3 className="font-sans font-bold text-sm uppercase tracking-wider">UK Practice Model</h3>
            <p className="text-xs text-[#111111]/50 font-mono">CPR CHANCERY DIVISION</p>
            <p className="text-sm text-[#111111]/70 leading-relaxed">Pleadings and evidence bundles structure conformant directly with modern UK High Court and Chancery timeline rules.</p>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
