'use client';

import React from "react";
import Hero from "@/components/landing/Hero";

/**
 * NextCaseHQ: Premium Reimagined Static Landing Experience
 * Redesigned in full accordance with Product Design Authority guidelines:
 * - Single-viewport design (no-scroll)
 * - Generous whitespace and a warm, calm professional background
 * - Minimalist Apple/Linear/Notion-grade aesthetic
 * - Centerpiece elegant search bar with interactive CTA arrow
 * - Human-first, calm, and confident microcopy
 */
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
