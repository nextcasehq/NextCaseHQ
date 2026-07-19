import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/Badge";

const title = "Contact | NextCaseHQ";
const description =
  "Get in touch with the NextCaseHQ engineering and compliance team about our secure litigation operating system.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/contact" },
  openGraph: {
    title,
    description,
    url: "/contact",
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

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-serif selection:bg-[#111111] selection:text-[#FDFBF7]">
      <div className="flex-1 max-w-7xl mx-auto px-6 py-20 lg:py-32 w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#FBF6EA] border border-[#E7DFC9]">
            <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
              <g stroke="#8A6D2F" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="10" width="28" height="20" rx="2" />
                <path d="M7 12l13 10 13-10" />
              </g>
            </svg>
          </div>
          <Badge variant="accent" className="mb-4">Contact</Badge>
          <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">Connect With Counsel</h1>
          <p className="font-serif italic text-lg leading-relaxed text-[#111111]/70">
            Initiate direct secured communications with the NextCaseHQ engineering and compliance group.
          </p>
        </div>

        <div className="max-w-md w-full bg-white border border-[#C6A253]/20 rounded-2xl p-8 shadow-sm mx-auto mb-12 space-y-4">
          <div>
            <label className="block text-[10px] font-sans font-bold uppercase tracking-wider text-[#111111]/70 mb-1">Office Location</label>
            <p className="text-sm font-sans font-semibold text-[#111111]/80">New Delhi // Mumbai // Bengaluru // NY</p>
          </div>
          <div className="border-t border-[#111111]/10 pt-3">
            <label className="block text-[10px] font-sans font-bold uppercase tracking-wider text-[#111111]/70 mb-1">Secure Messaging Key</label>
            <p className="text-xs font-mono bg-[#FBF6EA] p-2.5 rounded border border-[#E7DFC9] break-all text-[#111111]/70">
              nchq_sec_dh_pk_583920194839201a0b3829d84c1920
            </p>
          </div>
          <div className="border-t border-[#111111]/10 pt-3">
            <label className="block text-[10px] font-sans font-bold uppercase tracking-wider text-[#111111]/70 mb-1">Corporate Support Email</label>
            <p className="text-sm font-sans font-semibold text-[#8A6D2F]">counsel@nextcasehq.com</p>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-[#8A6D2F] px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-[#6F5624] hover:shadow-lg hover:shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C6A253] focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            Sign In to Support Center
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
