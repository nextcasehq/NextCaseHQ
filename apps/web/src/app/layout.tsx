import type { Metadata } from "next";
import { Lora, Source_Sans_3 } from "next/font/google";
import "@nextcase/ndl";
import "./globals.css";
import NavbarWrapper from "@/components/NavbarWrapper";
import { Analytics } from "@/components/seo/Analytics";

const lora = Lora({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "NextCaseHQ - Zero-Knowledge Litigation Operating System",
    template: "%s | NextCaseHQ",
  },
  description: "Secure, zero-knowledge operating system for modern litigation. Search cases, analyze evidence, and draft filings in unified context.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://nextcasehq.com"),
  alternates: {
    canonical: "/",
  },
  // Set only when NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION is configured — see
  // docs/knowledge-base/admin-manual.md for the Search Console setup step.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
  openGraph: {
    title: "NextCaseHQ - Zero-Knowledge Litigation Operating System",
    description: "Secure, zero-knowledge operating system for modern litigation. Search cases, analyze evidence, and draft filings in unified context.",
    url: "/",
    siteName: "NextCaseHQ",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "NextCaseHQ - Zero-Knowledge Litigation Operating System",
    description: "Secure, zero-knowledge operating system for modern litigation. Search cases, analyze evidence, and draft filings in unified context.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${lora.variable} ${sourceSans.variable} bg-[#F4EEE0]`}>
      <body className="bg-[#F4EEE0] font-sans text-[#241E17]">
        <Analytics />
        <NavbarWrapper />
        {/* Navbar is `sticky` (in-flow), not `fixed`, so it already reserves
            its own height — extra top padding here just left a blank gap
            below it (the reported "white patch"). No padding needed on
            internal routes either, where NavbarWrapper renders nothing. */}
        <main>{children}</main>
      </body>
    </html>
  );
}
