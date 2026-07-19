import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/Badge";

const title = "Our Mission | NextCaseHQ";
const description =
  "NextCaseHQ's mission: give modern advocates and counsel the world's most secure, high-focus, zero-knowledge litigation operating system.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  openGraph: {
    title,
    description,
    url: "/about",
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

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-serif selection:bg-[#111111] selection:text-[#FDFBF7]">
      <main className="flex-1 max-w-7xl mx-auto px-6 py-20 lg:py-32 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#FBF6EA] border border-[#E7DFC9]">
            <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
              <g stroke="#8A6D2F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 12c-2.5-2-6-3-10-2v18c4-1 7.5 0 10 2 2.5-2 6-3 10-2V10c-4-1-7.5 0-10 2z" />
                <path d="M20 12v18" />
              </g>
            </svg>
          </div>
          <Badge variant="accent" className="mb-4">Our Mission</Badge>
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">The NextCaseHQ Mission</h1>
          <p className="font-serif italic text-lg leading-relaxed text-[#111111]/70">
            To provide modern advocates and counsel with the world&apos;s most secure, high-focus, zero-knowledge litigation operating system.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-6 font-serif leading-relaxed text-[#111111]/80 bg-white border border-[#C6A253]/20 rounded-2xl p-8 shadow-sm mb-12">
          <p>
            NextCaseHQ was founded at the intersection of cryptography, software engineering, and the law. We believe that legal workflows require an absolute commitment to privacy, data sovereignty, and performance.
          </p>
          <p>
            By designing a platform from the ground up using state-of-the-art zero-knowledge schemas, custom database RLS contexts, and unified context assembly pipelines, we guarantee that counsel remains fully in control of their sensitive evidence and draft filings.
          </p>
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-[#8A6D2F] px-6 py-3 text-sm font-bold text-[#F6F1E7] transition-all duration-200 hover:bg-[#6F5624] hover:shadow-lg hover:shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A253] focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            Explore Careers &amp; Roles
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
