import React from "react";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/Badge";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-serif selection:bg-[#111111] selection:text-[#FDFBF7]">
      <main className="flex-1 max-w-7xl mx-auto px-6 py-20 lg:py-32 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#FBF6EA] border border-[#E7DFC9]">
            <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
              <g stroke="#8A6D2F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="11" width="28" height="18" rx="3" />
                <path d="M6 17h28" />
                <path d="M11 24h8" />
              </g>
            </svg>
          </div>
          <Badge variant="accent" className="mb-4">Pricing</Badge>
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">Transparent Professional Tier Plan</h1>
          <p className="font-serif italic text-lg leading-relaxed text-[#111111]/70">
            Fully scale and bind your cryptographic litigation workspaces with our single premium tier.
          </p>
        </div>

        <div className="max-w-md w-full bg-white border border-[#C6A253]/20 rounded-2xl p-8 shadow-sm mx-auto mb-12">
          <div className="flex justify-between items-center mb-6 border-b border-[#111111]/10 pb-4">
            <div>
              <h3 className="font-sans font-extrabold text-lg text-[#111111]">Counsel Pro</h3>
              <p className="text-xs text-[#111111]/50 font-semibold font-mono mt-0.5">UNLIMITED WORKSPACES</p>
            </div>
            <div className="text-right">
              <span className="font-sans text-3xl font-black text-[#111111]">$49</span>
              <span className="text-xs text-[#111111]/50 font-semibold">/mo</span>
            </div>
          </div>

          <ul className="space-y-3.5 mb-8 text-xs text-[#111111]/70 font-semibold font-mono">
            <li className="flex items-center gap-2">
              <span className="text-[#8A6D2F]">&#10003;</span> 3 Unified Secure Practice Tenants
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#8A6D2F]">&#10003;</span> Infinite Context Search Shell &amp; Ingestion
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#8A6D2F]">&#10003;</span> Automated BNS/BNSS Statutory Mapping
            </li>
            <li className="flex items-center gap-2">
              <span className="text-[#8A6D2F]">&#10003;</span> Full KMS Circuit-Breaker Access
            </li>
          </ul>

          <Link
            href="/login"
            className="block text-center w-full bg-[#8A6D2F] hover:bg-[#6F5624] text-[#F6F1E7] font-sans font-bold text-xs py-3.5 rounded-xl transition-all"
          >
            Start Professional Plan
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
