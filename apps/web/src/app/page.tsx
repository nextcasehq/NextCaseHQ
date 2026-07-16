import React from "react";
import type { Metadata } from "next";
import LandingPageContent from "@/components/landing/LandingPageContent";

export const metadata: Metadata = {
  title: "Secure, Zero-Knowledge Litigation Operating System | NextCaseHQ",
  description: "Secure, zero-knowledge operating system for modern litigation. Search cases, analyze evidence, and draft filings with complete context.",
  alternates: {
    canonical: "https://nextcasehq.com",
  },
  openGraph: {
    title: "Secure, Zero-Knowledge Litigation Operating System | NextCaseHQ",
    description: "Secure, zero-knowledge operating system for modern litigation. Search cases, analyze evidence, and draft filings with complete context.",
    url: "https://nextcasehq.com",
    siteName: "NextCaseHQ",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Secure, Zero-Knowledge Litigation Operating System | NextCaseHQ",
    description: "Secure, zero-knowledge operating system for modern litigation. Search cases, analyze evidence, and draft filings with complete context.",
  },
};

export default function Page() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans selection:bg-indigo-600 selection:text-white">

      {/* Central Search Hero Section */}
      <Hero />

      {/* 3. Footer (Calm, Elegant, Spacious and Empty) */}
      <footer className="w-full h-20 px-8 md:px-16 border-t border-neutral-100 bg-white/20 backdrop-blur-xs flex items-center justify-between z-10 flex-none text-[10px] font-mono text-neutral-400 font-semibold tracking-wider">
        <span>© {new Date().getFullYear()} NEXTCASEHQ TECHNOLOGIES INC.</span>
        <span>INFINITE CONTEXT. ZERO KNOWLEDGE.</span>
      </footer>

    </div>
  );
}
