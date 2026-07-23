import React from "react";
import type { Metadata } from "next";
import LandingPageContent from "@/components/landing/LandingPageContent";

export const metadata: Metadata = {
  title: "NextCaseHQ — AI-Powered Legal Workspace",
  description: "Search cases, judgments, acts, and citations instantly. Draft documents, verify eCourts case status, and manage your matter register in one workspace.",
  alternates: {
    canonical: "https://nextcasehq.com",
  },
  openGraph: {
    title: "NextCaseHQ — AI-Powered Legal Workspace",
    description: "Search cases, judgments, acts, and citations instantly. Draft documents, verify eCourts case status, and manage your matter register in one workspace.",
    url: "https://nextcasehq.com",
    siteName: "NextCaseHQ",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "NextCaseHQ — AI-Powered Legal Workspace",
    description: "Search cases, judgments, acts, and citations instantly. Draft documents, verify eCourts case status, and manage your matter register in one workspace.",
  },
};

export default function Page() {
  return <LandingPageContent />;
}
