import type { Metadata } from "next";
import "@nextcase/ndl";
import "./globals.css";
import NavbarWrapper from "@/components/NavbarWrapper";

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
    <html lang="en">
      <body className="bg-[#FDFBF7] text-[#111111]">
        <NavbarWrapper />
        <main>{children}</main>
      </body>
    </html>
  );
}
