import type { Metadata } from "next";
import "@nextcase/ndl";
import "./globals.css";

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
        <main>{children}</main>
      </body>
    </html>
  );
}
