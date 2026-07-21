import React from "react";
import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const title = "Litigation Practice Solutions | NextCaseHQ";
const description =
  "Tailored NextCaseHQ solutions for practice groups, corporate legal teams, and solo practitioners, with jurisdictional compliance frameworks built in.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/solutions" },
  openGraph: {
    title,
    description,
    url: "/solutions",
    siteName: "NextCaseHQ",
    type: "website",
    locale: "en_US",
    images: [{ url: "/landing/product-preview.png", width: 1200, height: 900, alt: "NextCaseHQ product preview" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/landing/product-preview.png"],
  },
};

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-serif selection:bg-[#111111] selection:text-[#FDFBF7]">
      <main className="flex-1 max-w-7xl mx-auto px-6 py-20 lg:py-32 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#FBF6EA] border border-[#E7DFC9]">
            <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
              <g stroke="#8A6D2F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="20" cy="20" r="13" />
                <path d="M7 20h26" />
                <path d="M20 7c4 3.5 6 8 6 13s-2 9.5-6 13c-4-3.5-6-8-6-13s2-9.5 6-13z" />
              </g>
            </svg>
          </div>
          <Badge variant="accent" className="mb-4">Solutions</Badge>
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">Litigation Practice Solutions</h1>
          <p className="font-serif italic text-lg leading-relaxed text-[#111111]/70">
            Tailored jurisdictional compliance frameworks for premier chambers, advocates, and counsel teams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          <Card className="p-8 space-y-3">
            <svg viewBox="0 0 40 40" className="h-7 w-7" fill="none">
              <g stroke="#8A6D2F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="10" y="9" width="20" height="24" rx="1" />
                <path d="M15 15h3M22 15h3M15 21h3M22 21h3M15 27h3M22 27h3" />
              </g>
            </svg>
            <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-[#111111]">Practice Groups</h3>
            <p className="text-sm text-[#111111]/70 leading-relaxed font-serif">
              Enterprise tenant workspaces with secure workspace access control and cross-jurisdictional synchronization.
            </p>
          </Card>
          <Card className="p-8 space-y-3">
            <svg viewBox="0 0 40 40" className="h-7 w-7" fill="none">
              <g stroke="#8A6D2F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 7h11l6 6v20a1 1 0 0 1-1 1H13a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
                <path d="M24 7v6h6" />
                <path d="M15 21l3 3 7-7" />
              </g>
            </svg>
            <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-[#111111]">Corporate Legal</h3>
            <p className="text-sm text-[#111111]/70 leading-relaxed font-serif">
              Immutable compliance ledgers and stream-ingested file processing for complete oversight and audit transparency.
            </p>
          </Card>
          <Card className="p-8 space-y-3">
            <svg viewBox="0 0 40 40" className="h-7 w-7" fill="none">
              <g stroke="#8A6D2F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="20" cy="14" r="5" />
                <path d="M10 33c0-6 4.5-10 10-10s10 4 10 10" />
              </g>
            </svg>
            <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-[#111111]">Solo Practitioners</h3>
            <p className="text-sm text-[#111111]/70 leading-relaxed font-serif">
              A light, lightning-fast tactical layout with mobile Court Mode and offline transaction synchronization.
            </p>
          </Card>
        </div>

      </main>
      <Footer />
    </div>
  );
}
