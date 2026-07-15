import type { Metadata } from "next";
import "@nextcase/ndl";
import "./globals.css";
import NavbarWrapper from "@/components/NavbarWrapper";

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
      <body className="bg-[#FDFBF7] text-[#111111]">
        <NavbarWrapper />
        <main>{children}</main>
      </body>
    </html>
  );
}
