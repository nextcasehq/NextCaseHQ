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
    images: [
      {
        url: "/landing/product-preview.png",
        width: 1200,
        height: 900,
        alt: "NextCaseHQ dashboard preview showing case navigation, an evidence timeline, and an AI legal assistant summary panel",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Secure, Zero-Knowledge Litigation Operating System | NextCaseHQ",
    description: "Secure, zero-knowledge operating system for modern litigation. Search cases, analyze evidence, and draft filings with complete context.",
    images: ["/landing/product-preview.png"],
  },
};

export default function Page() {
  return <LandingPageContent />;
}
