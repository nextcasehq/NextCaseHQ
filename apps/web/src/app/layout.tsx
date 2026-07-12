import type { Metadata } from "next";
import "@nextcase/ndl";
import "./globals.css";
import JsonLd from "@/components/seo/JsonLd";

export const metadata: Metadata = {
  title: "NextCaseHQ",
  description: "The Operating System of Litigation",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-base text-primary">
        <JsonLd type="SoftwareApplication" />
        {children}
      </body>
    </html>
  );
}
