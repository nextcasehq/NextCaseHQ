import type { Metadata } from "next";
import { Lora, Source_Sans_3 } from "next/font/google";
import "@nextcase/ndl";
import "./globals.css";
import NavbarWrapper from "@/components/NavbarWrapper";

const lora = Lora({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const sourceSans = Source_Sans_3({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "NextCaseHQ - Zero-Knowledge Litigation Operating System",
  description: "Secure, zero-knowledge operating system for modern litigation. Search cases, analyze evidence, and draft filings in unified context.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://nextcasehq.com"),
  alternates: {
    canonical: "/",
  },
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
        <NavbarWrapper />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
