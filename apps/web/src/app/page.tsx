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
  return <LandingPageContent />;
}
