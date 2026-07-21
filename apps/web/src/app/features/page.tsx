import React from "react";
import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

const title = "Platform Features | NextCaseHQ";
const description =
  "Explore NextCaseHQ's modular zero-knowledge litigation workspace: end-to-end encrypted document handling, statutory compliance mapping, and an interactive draft sheet.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/features" },
  openGraph: {
    title,
    description,
    url: "/features",
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

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-serif selection:bg-[#111111] selection:text-[#FDFBF7]">
      <div className="flex-1 max-w-7xl mx-auto px-6 py-20 lg:py-32 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#FBF6EA] border border-[#E7DFC9]">
            <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
              <g stroke="#8A6D2F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 8 12 22h7l-2 10 11-15h-7l2-9z" />
              </g>
            </svg>
          </div>
          <Badge variant="accent" className="mb-4">Platform Features</Badge>
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">Litigation Operating System Features</h1>
          <p className="font-serif italic text-lg leading-relaxed text-[#111111]/70">
            Explore the modular zero-knowledge litigation workspace designed to empower modern counsel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          <Card className="p-8 space-y-3">
            <svg viewBox="0 0 40 40" className="h-7 w-7" fill="none">
              <g stroke="#8A6D2F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6l11 4v9c0 8-5 13-11 15-6-2-11-7-11-15v-9l11-4z" />
                <path d="M15.5 20l3 3 6-6" />
              </g>
            </svg>
            <h2 className="font-sans font-bold text-sm uppercase tracking-wider text-[#111111]">Zero-Knowledge Envelope</h2>
            <p className="text-sm text-[#111111]/70 leading-relaxed font-serif">
              End-to-end envelope cryptography and hardware-backed KMS keys shield counsel transcripts and exhibits.
            </p>
          </Card>
          <Card className="p-8 space-y-3">
            <svg viewBox="0 0 40 40" className="h-7 w-7" fill="none">
              <g stroke="#8A6D2F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 9v22" /><path d="M14.5 31h11" /><path d="M11 13h18" />
                <path d="M13 13l-2.5 6h5L13 13z" /><path d="M9.5 19a3.5 3.5 0 0 0 7 0" />
                <path d="M27 13l-2.5 6h5L27 13z" /><path d="M23.5 19a3.5 3.5 0 0 0 7 0" />
              </g>
              <circle cx="20" cy="9" r="1.8" fill="#8A6D2F" />
            </svg>
            <h2 className="font-sans font-bold text-sm uppercase tracking-wider text-[#111111]">Statutory Engines</h2>
            <p className="text-sm text-[#111111]/70 leading-relaxed font-serif">
              Instant, automated compliance mappings for BNS, BNSS, FRCP, CPR, and Negotiable Instruments (NI) Act timelines.
            </p>
          </Card>
          <Card className="p-8 space-y-3">
            <svg viewBox="0 0 40 40" className="h-7 w-7" fill="none">
              <g stroke="#8A6D2F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M27 8l5 5-16 16H11v-5L27 8z" />
                <path d="M23 12l5 5" />
              </g>
            </svg>
            <h2 className="font-sans font-bold text-sm uppercase tracking-wider text-[#111111]">Interactive Draft Sheet</h2>
            <p className="text-sm text-[#111111]/70 leading-relaxed font-serif">
              A premium WYSIWYG legal document engine with automated citation reference binding.
            </p>
          </Card>
        </div>

      </div>
      <Footer />
    </div>
  );
}
