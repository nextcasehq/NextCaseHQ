'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-serif selection:bg-[#111111] selection:text-[#FDFBF7]">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-6 py-20 lg:py-32 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="accent" className="mb-4">Contact Counsel</Badge>
          <h1 className="text-4xl lg:text-7xl font-bold tracking-tight mb-6">Inquire with NextCaseHQ Experts</h1>
          <p className="font-serif italic text-lg leading-relaxed text-[#111111]/70">Schedule a dedicated secure sharded DB configuration audit with our integration leads.</p>
        </div>

        <div className="max-w-xl mx-auto bg-white border border-[#111111]/10 rounded shadow-sm p-8">
          {submitted ? (
            <div className="text-center space-y-4">
              <span className="text-4xl">✉</span>
              <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-[#111111]">Inquiry Received</h3>
              <p className="text-xs text-[#111111]/60 font-serif leading-relaxed">Thank you. An integration specialist will reach out to schedule your configuration audit shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input label="Enterprise Email" type="email" placeholder="name@firm.com" required />
              <Input label="Practice Chambers" placeholder="Delhi practice / US Federal" required />
              <Button type="submit" variant="primary" className="w-full">Submit Inquiry</Button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
