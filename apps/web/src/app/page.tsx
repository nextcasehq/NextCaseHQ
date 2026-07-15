'use client';

import React from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Accordion } from "@/components/ui/Accordion";

export default function RebuiltHomePage() {
  const partners = ["Delhi High Court", "Supreme Court of India", "FRCP Advisors", "CPR UK Practice", "AED Law Office"];

  const features = [
    {
      title: "Zero-Knowledge Crypto",
      description: "AES-GCM 256-bit client-side envelopes secure your sensitive litigation drafts with absolutely zero external dependencies.",
      icon: "🛡️"
    },
    {
      title: "Active Multi-Tenancy",
      description: "PostgreSQL Row-Level Security (RLS) contexts dynamically bound inside your sessions to enforce cryptographic tenancy boundaries.",
      icon: "⛓️"
    },
    {
      title: "Edge PII Scrubbers",
      description: "Scrub PAN cards and Aadhaar identifications at the edge runtime before logs, metrics, or DB layers are hit.",
      icon: "🧼"
    },
    {
      title: "Litigation State Machines",
      description: "India (BNS & BNSS), US (FRCP), and UK (CPR) sequential configurations with native currency tokens and timeline rules.",
      icon: "⚡"
    }
  ];

  const pricingTiers = [
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

  const faqs = [
    {
      id: "faq-1",
      title: "How does the Zero-Knowledge crypto work?",
      content: "All file envelopes are processed locally using the Browser Web Crypto API before being transmitted, ensuring NextCaseHQ servers never hold your private litigation keys."
    },
    {
      id: "faq-2",
      title: "Is the Indian BNS & BNSS procedural model fully supported?",
      content: "Yes, our regional Country Packs incorporate polymorphic state-machines mapping native criminal and civil timeline constraints seamlessly."
    },
    {
      id: "faq-3",
      title: "Does it conform to strict PostgreSQL multi-tenant isolation rules?",
      content: "Absolutely. All transactions set LOCAL session session active variables prior to execution, preventing any data cross-talk."
    }
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-serif selection:bg-[#111111] selection:text-[#FDFBF7]">
      {/* 1. Navbar */}
      <Navbar />

      {/* 2. Hero Section */}
      <header className="relative flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 lg:pt-36 lg:pb-24 max-w-7xl mx-auto">
        <Badge variant="accent" className="mb-8 animate-pulse">
          NextCaseHQ Sentinel v2.0 Active
        </Badge>
        <h1 className="text-5xl lg:text-8xl font-black tracking-tight leading-[1.05] max-w-5xl mb-8 font-serif">
          The Operating System for Enterprise Litigation
        </h1>
        <p className="text-xl lg:text-2xl font-serif leading-relaxed text-[#111111]/70 max-w-3xl mb-12 italic">
          Empowering enterprise legal teams with zero-knowledge encrypted workspaces, real-time edge telemetry, dynamic document ingestion, and compliance state-machines.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md">
          <Link href="/login" className="w-full sm:w-auto">
            <Button variant="primary" size="lg" className="w-full">
              Get Started
            </Button>
          </Link>
          <Link href="/contact" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full">
              Book a Demo
            </Button>
          </Link>
        </div>
      </header>

      {/* 3. Trusted By */}
      <section className="border-y border-[#111111]/10 bg-[#111111]/5 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs font-sans uppercase font-bold tracking-widest text-[#111111]/40 mb-8">
            Empowering Modern Practice Groups Globally
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 lg:gap-20">
            {partners.map((partner) => (
              <span key={partner} className="font-sans font-bold text-sm tracking-wide text-[#111111]/50 hover:text-[#111111] transition-colors">
                {partner}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 4. AI Workflow Animation */}
      <section className="py-20 lg:py-32 max-w-7xl mx-auto px-6 w-full">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <Badge variant="primary" className="mb-4">Live Core Pipeline</Badge>
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-6">AI-First Ingestion Workflow</h2>
          <p className="font-serif italic text-base text-[#111111]/70">
            Watch documents undergo local encryption, edge PII scrubbing, and real-time state machine categorization.
          </p>
        </div>

        <div className="border border-[#111111]/10 bg-white rounded shadow-sm p-8 max-w-4xl mx-auto relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
            {/* Step 1 */}
            <div className="text-center space-y-3 md:w-1/4">
              <div className="w-12 h-12 rounded bg-[#111111] text-[#FDFBF7] flex items-center justify-center mx-auto text-lg font-mono font-bold">1</div>
              <h3 className="font-sans font-bold text-sm uppercase tracking-wider">Local Upload</h3>
              <p className="text-xs font-serif text-[#111111]/60">Client-side WebCrypto encryption envelope generated.</p>
            </div>

            <div className="hidden md:block flex-1 h-0.5 bg-dashed border-t border-[#111111]/20 animate-pulse"></div>

            {/* Step 2 */}
            <div className="text-center space-y-3 md:w-1/4">
              <div className="w-12 h-12 rounded bg-[#C5A059] text-[#111111] flex items-center justify-center mx-auto text-lg font-mono font-bold">2</div>
              <h3 className="font-sans font-bold text-sm uppercase tracking-wider">Edge Scrubbing</h3>
              <p className="text-xs font-serif text-[#111111]/60">India Aadhaar/PAN details filtered and logged.</p>
            </div>

            <div className="hidden md:block flex-1 h-0.5 bg-dashed border-t border-[#111111]/20 animate-pulse"></div>

            {/* Step 3 */}
            <div className="text-center space-y-3 md:w-1/4">
              <div className="w-12 h-12 rounded bg-[#10B981] text-[#FDFBF7] flex items-center justify-center mx-auto text-lg font-mono font-bold">3</div>
              <h3 className="font-sans font-bold text-sm uppercase tracking-wider">Vector Shard</h3>
              <p className="text-xs font-serif text-[#111111]/60">Bound RLS schema context and sharded DB load.</p>
            </div>
          </div>
          {/* Subtle background wave animation */}
          <div className="absolute inset-0 bg-[#C5A059]/5 opacity-30 animate-pulse"></div>
        </div>
      </section>

      {/* 5. Product Features */}
      <section className="bg-white border-y border-[#111111]/10 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 max-w-3xl mx-auto">
            <Badge variant="accent" className="mb-4">Features Matrix</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-6">Designed for Strict Compliance</h2>
            <p className="font-serif italic text-base text-[#111111]/70">
              The only legal tech operating system adhering perfectly to local and regional court compliance guidelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feat) => (
              <Card key={feat.title} className="p-8">
                <span className="text-4xl block mb-6">{feat.icon}</span>
                <h3 className="font-sans font-bold text-sm uppercase tracking-wider mb-4 text-[#111111]">
                  {feat.title}
                </h3>
                <p className="text-sm font-serif text-[#111111]/70 leading-relaxed">
                  {feat.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Product Demo / Static Preview */}
      <section className="py-20 lg:py-32 max-w-7xl mx-auto px-6 w-full">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <Badge variant="primary" className="mb-4">Canvas Preview</Badge>
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-6">The High-Density Tri-Pane Chamber</h2>
          <p className="font-serif italic text-base text-[#111111]/70">
            Review citations, dialog with state-machine AI, and draft briefs side-by-side with no screen switching.
          </p>
        </div>

        <div className="border border-[#111111]/10 rounded shadow-sm overflow-hidden bg-white">
          <div className="h-12 bg-[#111111]/5 border-b border-[#111111]/10 px-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-400"></span>
              <span className="w-3 h-3 rounded-full bg-green-400"></span>
            </div>
            <span className="text-xs font-mono text-[#111111]/40">workspace://delhi-chamber-04</span>
            <div className="w-16"></div>
          </div>
          <div className="p-4 bg-[#FDFBF7]">
            <div className="bg-white border border-[#111111]/10 rounded h-96 flex items-center justify-center p-8 text-center">
              <div className="space-y-4 max-w-md">
                <p className="text-[#C5A059] text-5xl">⚡</p>
                <h3 className="font-sans font-bold text-sm uppercase tracking-wider">Enterprise Sandbox Workspace Active</h3>
                <p className="text-xs text-[#111111]/60 font-serif leading-relaxed">
                  Sign in or initialize your organization session workspace context to trigger full multi-pane operations.
                </p>
                <Link href="/login">
                  <Button variant="primary" size="sm" className="mt-4">Sign In Now</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Security Section */}
      <section className="bg-[#111111] text-[#FDFBF7] py-20 lg:py-32 w-full border-y border-[#111111]/20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <Badge variant="accent" className="bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/20">Military-Grade Audit Trail</Badge>
            <h2 className="text-4xl lg:text-6xl font-bold tracking-tight leading-tight">Chained Auditing Ledger</h2>
            <p className="font-serif italic text-lg text-[#FDFBF7]/80 leading-relaxed">
              Every system state-machine transition, user login, and file upload is logged securely and chained cryptographically using HMAC-SHA256 signature chains.
            </p>
            <div className="space-y-4 font-mono text-xs text-[#FDFBF7]/60">
              <p>✔ SHA-256 Chained Hash Signatures</p>
              <p>✔ No Server-side Private Keys</p>
              <p>✔ Active PostgreSQL RLS Guards Enabled</p>
            </div>
          </div>
          <div className="p-8 border border-[#FDFBF7]/10 bg-[#FDFBF7]/5 rounded relative overflow-hidden">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#C5A059] mb-4">Immutable Audit Spec</h3>
            <pre className="text-xs font-mono text-[#FDFBF7]/70 space-y-1 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {`{\n  "index": 4328,\n  "action": "UPLOAD_BRIEF",\n  "tenant_id": "11111111-1111-1111...",\n  "hash": "8a72bf421e90...",\n  "prev_signature": "0f81bc246...",\n  "signature": "c5a059d9c2..."\n}`}
            </pre>
            <div className="absolute top-4 right-4 w-4 h-4 rounded-full bg-[#10B981] animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* 8. Testimonials */}
      <section className="py-20 lg:py-32 max-w-7xl mx-auto px-6 w-full">
        <div className="text-center mb-20 max-w-3xl mx-auto">
          <Badge variant="primary" className="mb-4">Endorsements</Badge>
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-6">Trusted by Legal Innovators</h2>
          <p className="font-serif italic text-base text-[#111111]/70">
            Hear from managing counsels, court coordinators, and firm compliance leaders.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="p-8 space-y-6">
            <p className="text-sm font-serif text-[#111111]/80 leading-relaxed italic">
              "We migrated all active criminal defense draft workflows onto NextCaseHQ. The regional India Pack made compiling procedural timelines under BNS absolute clockwork."
            </p>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#111111] text-[#FDFBF7] flex items-center justify-center font-bold text-xs">RK</span>
              <div>
                <h4 className="font-sans font-bold text-xs uppercase tracking-wider">Rajesh Kumar</h4>
                <p className="text-[10px] font-sans text-[#111111]/50 uppercase tracking-widest">Managing Counsel, Delhi Practice</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 space-y-6">
            <p className="text-sm font-serif text-[#111111]/80 leading-relaxed italic">
              "The Zero-Knowledge encryption layer guarantees client privilege remains complete. Our IT auditors passed it in hours—there is no duplicate logical exposure."
            </p>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#C5A059] text-[#111111] flex items-center justify-center font-bold text-xs">SC</span>
              <div>
                <h4 className="font-sans font-bold text-xs uppercase tracking-wider">Sarah Connor</h4>
                <p className="text-[10px] font-sans text-[#111111]/50 uppercase tracking-widest">Security Lead, US Fed Advisory</p>
              </div>
            </div>
          </Card>

          <Card className="p-8 space-y-6">
            <p className="text-sm font-serif text-[#111111]/80 leading-relaxed italic">
              "The Tri-Pane UI maintains visual workspace integrity flawlessly. No overlapping panels or collapsing containers—it is the cleanest interface we have used."
            </p>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-[#10B981] text-[#FDFBF7] flex items-center justify-center font-bold text-xs">AM</span>
              <div>
                <h4 className="font-sans font-bold text-xs uppercase tracking-wider">Alistair McCoist</h4>
                <p className="text-[10px] font-sans text-[#111111]/50 uppercase tracking-widest">High Court Clerk, UK Chambers</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 9. Pricing Preview */}
      <section className="bg-white border-y border-[#111111]/10 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20 max-w-3xl mx-auto">
            <Badge variant="accent" className="mb-4">Flexible Subscriptions</Badge>
            <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-6">Transparent Compliance Pricing</h2>
            <p className="font-serif italic text-base text-[#111111]/70">
              Pick a deployment plan that matches your practice group scale and regional needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.map((tier) => (
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
        </div>
      </section>

      {/* 10. FAQ Section */}
      <section className="py-20 lg:py-32 max-w-4xl mx-auto px-6 w-full">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <Badge variant="primary" className="mb-4">FAQ Guide</Badge>
          <h2 className="text-3xl lg:text-5xl font-bold tracking-tight mb-6">Platform Clarifications</h2>
          <p className="font-serif italic text-base text-[#111111]/70">
            Frequently asked deployment, cryptographic, and multi-tenant queries.
          </p>
        </div>

        <Accordion items={faqs} />
      </section>

      {/* 11. Call To Action (CTA) */}
      <section className="bg-[#111111] text-[#FDFBF7] py-20 lg:py-32 border-y border-[#111111]/20 w-full text-center">
        <div className="max-w-4xl mx-auto px-6 space-y-8">
          <Badge variant="accent" className="bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/20">Initiate Workspace Session</Badge>
          <h2 className="text-4xl lg:text-7xl font-bold tracking-tight leading-tight">Ready to Deploy NextCaseHQ?</h2>
          <p className="font-serif italic text-lg lg:text-xl text-[#FDFBF7]/80 max-w-2xl mx-auto leading-relaxed">
            Initialize your practice sharded database container and bind secure cryptographic session tokens today.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full">Initialize Session</Button>
            </Link>
            <Link href="/contact" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full border-white text-[#FDFBF7] hover:bg-white/10">Contact Counsel</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 12. Footer */}
      <Footer />
    </div>
  );
}
