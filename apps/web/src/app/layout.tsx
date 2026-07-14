import type { Metadata } from "next";
import "@nextcase/ndl";
import "./globals.css";
import Navbar from "@/components/Navbar";

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
        <Navbar /> 
        <main>{children}</main>
      </body>
    </html>
  );
}
