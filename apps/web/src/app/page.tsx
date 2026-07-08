import React from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { TriPaneChamber } from "@/components/TriPaneChamber";

export default function Page() {
  return (
    <div className="min-h-screen bg-bg-base">
      <header className="h-16 border-b border-brand/10 flex items-center px-8 bg-surface">
        <h1 className="text-xl font-bold text-brand">NextCaseHQ</h1>
        <div className="ml-auto text-xs text-primary/40 font-mono">
          PHASE 1 KERNEL // AI CHAMBER ACTIVE
        </div>
      </header>

      <TriPaneChamber />
      <CommandPalette />
    </div>
  );
}
