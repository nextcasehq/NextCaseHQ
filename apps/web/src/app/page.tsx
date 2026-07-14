import React from "react";
import Link from "next/link";

/**
 * NextCaseHQ: Premium Marketing Landing Page v1.0 (UI Constitution Standard)
 * Strict Adherence to Design Language:
 * - White-first background
 * - Black typography
 * - Single Indigo/Violet accent
 * - Minimalist, Premium, Clean, Spacious
 * - Apple × Linear × Notion quality
 */
export default function Page() {
  const features = [
    {
      title: "Zero-Knowledge Vault",
      description: "End-to-end encrypted workspaces securing sensitive litigation evidence, ensuring absolute multi-tenant isolation.",
      icon: "🛡️"
    },
    {
      title: "AI Litigation Engine",
      description: "Perform legal research, evidence analysis, and case timeline synthesis using context-aware dialogue streams.",
      icon: "⚡"
    },
    {
      title: "Direct Ingestion Pipeline",
      description: "High-performance file ingestion supporting encrypted binaries with instant validation and secure logging.",
      icon: "📥"
    }
  ];

  const footerLinks = [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Documentation", href: "/docs" },
    { label: "Support", href: "/support" },
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white text-neutral-900 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-24 md:py-36 max-w-5xl mx-auto text-center">
        {/* Release Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-100 bg-indigo-50/50 text-xs font-semibold text-indigo-700 tracking-wide uppercase mb-10">
          <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
          NextCaseHQ v1.0 • Built for Litigation
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight leading-[1.1] text-neutral-900 max-w-4xl mb-8 font-sans">
          The AI-First Operating System <br />
          <span className="text-indigo-600">for Modern Litigation</span>
        </h1>

        {/* Hero Description */}
        <p className="text-lg md:text-xl leading-relaxed text-neutral-500 max-w-2xl mb-12 font-medium">
          Secure multi-tenant workspaces, high-performance case search, automated document ingestion, and context-aware court workflows.
        </p>

        {/* Call to Actions (CTAs) targeting /login */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md mb-24">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-indigo-600 text-white font-semibold text-base text-center shadow-lg shadow-indigo-600/15 hover:bg-indigo-700 transition-all duration-200"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-xl border border-neutral-200 text-neutral-700 bg-white font-semibold text-base text-center hover:bg-neutral-50 hover:border-neutral-300 transition-all duration-200"
          >
            Book a Demo
          </Link>
        </div>

        {/* Interactive Features Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl text-left border-t border-neutral-100 pt-20">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="p-8 rounded-2xl border border-neutral-100 bg-white hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-600/[0.02] transition-all duration-300 flex flex-col h-full"
            >
              <div className="text-3xl mb-5 text-indigo-600">{feature.icon}</div>
              <h3 className="text-lg font-bold text-neutral-900 mb-3">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-neutral-500 font-medium flex-1">{feature.description}</p>
            </div>
          ))}
        </section>
      </main>

      {/* High-fidelity Brand Footer */}
      <footer className="border-t border-neutral-100 bg-neutral-50/50 px-6 lg:px-16 py-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Copyright Information */}
          <div className="flex flex-col gap-2 items-center md:items-start">
            <span className="font-bold text-base tracking-tight text-neutral-900">
              NextCaseHQ<span className="text-indigo-600">.</span>
            </span>
            <span className="text-xs text-neutral-400 font-medium">
              © {new Date().getFullYear()} NextCaseHQ. All rights reserved. Zero-Knowledge. Infinite Context.
            </span>
          </div>

          {/* Footer Links */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                href="/login" // Ensure all CTAs on landing page link to login per directive
                className="hover:text-indigo-600 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
