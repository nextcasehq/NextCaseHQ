import React from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { TriPaneChamber } from "@/components/TriPaneChamber";
import { MobileCourtMode } from "@/components/mobile/MobileCourtMode";

import Link from "next/link";

export default function Page() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center text-[#111111]">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-2">NextCaseHQ</h1>
        <p className="text-primary/60 font-serif italic">The Operating System of Litigation</p>
      </header>

      <main>
        <Link
          href="/login"
          className="bg-[#111111] text-[#FDFBF7] px-8 py-3 rounded-full font-medium hover:opacity-90 transition-opacity"
        >
          Enter Portal
        </Link>
      </main>

      <footer className="fixed bottom-8 text-[10px] text-primary/30 font-mono tracking-widest uppercase">
        v0.9.0-rc.1 // secure environment
      </footer>
    </div>
  );
}
