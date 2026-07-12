import React from "react";
import Link from "next/link";

/**
 * NextCaseHQ: Premium Marketing Landing Page (Milestone 5.1)
 * Adheres strictly to the project design tokens (Warm Ivory #FDFBF7, Obsidian Charcoal #111111)
 */
export default function Page() {
  const navLinks = [
    { label: "Features", href: "/features" },
    { label: "Solutions", href: "/solutions" },
    { label: "Resources", href: "/resources" },
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  const footerLinks = [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Documentation", href: "/docs" },
    { label: "Support", href: "/support" },
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-serif selection:bg-[#111111] selection:text-[#FDFBF7]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#FDFBF7]/80 border-b border-[#111111]/10 px-6 lg:px-16 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl font-black tracking-tight text-[#111111] font-sans">
            NextCase<span className="text-[#111111]/60">HQ</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-sans tracking-wide uppercase font-semibold text-[#111111]/80">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="hover:text-[#111111] transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-[#111111] hover:after:w-full after:transition-all"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Top Navigation CTA */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-6 py-2.5 rounded border border-[#111111] text-sm font-semibold font-sans uppercase hover:bg-[#111111] hover:text-[#FDFBF7] transition-all"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center px-6 py-20 lg:py-32 max-w-7xl mx-auto text-center">
        {/* Release Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#111111]/10 bg-[#111111]/5 text-xs font-mono tracking-wider uppercase mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-[#111111] animate-pulse"></span>
          Phase 5: Product Experience Walkthrough Active
        </div>

        {/* Hero Title */}
        <h1 className="text-5xl lg:text-8xl font-black tracking-tight leading-[1.1] max-w-5xl mb-8 font-serif">
          The AI-First Operating System for Litigation
        </h1>

        {/* Hero Description */}
        <p className="text-xl lg:text-2xl font-serif leading-relaxed text-[#111111]/70 max-w-3xl mb-12 italic">
          Empowering modern legal teams with zero-knowledge encrypted workspaces, real-time telemetry, automated document ingestion, and context-aware court workflows.
        </p>

        {/* Call to Actions (CTAs) */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 rounded bg-[#111111] text-[#FDFBF7] font-semibold text-lg font-sans uppercase text-center shadow-lg hover:bg-[#111111]/90 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Get Started
          </Link>
          <Link
            href="/contact"
            className="w-full sm:w-auto px-8 py-4 rounded border border-[#111111] text-[#111111] font-semibold text-lg font-sans uppercase text-center hover:bg-[#111111]/5 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Book a Demo
          </Link>
        </div>
      </main>

      {/* High-fidelity Brand Footer */}
      <footer className="border-t border-[#111111]/10 bg-[#111111]/5 px-6 lg:px-16 py-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Copyright Information */}
          <div className="flex flex-col gap-2 items-center md:items-start">
            <span className="font-sans font-bold text-lg tracking-tight text-[#111111]">
              NextCaseHQ
            </span>
            <span className="text-xs font-sans text-[#111111]/60">
              © {new Date().getFullYear()} NextCaseHQ. All rights reserved. Zero-Knowledge. Infinite Context.
            </span>
          </div>

          {/* Footer Links */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-xs font-sans uppercase font-bold text-[#111111]/70">
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="hover:text-[#111111] transition-colors"
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
