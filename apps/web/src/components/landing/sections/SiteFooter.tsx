import React from "react";
import Link from "next/link";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Solutions", href: "/solutions" },
      { label: "Pricing", href: "/pricing" },
      { label: "Resources", href: "/resources" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Documentation", href: "/docs" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-[#0A1B14] bg-[#0E241B] text-[#F6F1E7]">
      <div className="mx-auto w-full max-w-7xl px-6 py-14 md:px-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <svg
                className="h-7 w-7 text-[#F6F1E7] transition-colors group-hover:text-[#E4C77E]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path d="M6 4v16M18 4v16M6 4l12 16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-serif text-lg font-bold tracking-tight text-[#F6F1E7]">
                NextCase<span className="text-[#E4C77E]">HQ</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#B0A588]">
              The zero-knowledge litigation operating system. Infinite context.
              Zero knowledge.
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-3">
            {COLUMNS.map((column) => (
              <nav key={column.heading} aria-label={column.heading}>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#E4C77E]">
                  {column.heading}
                </h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm font-medium text-[#CFC3A8] transition-colors hover:text-[#F6F1E7]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#C6A253]/15 pt-6 text-center sm:flex-row sm:text-left">
          <p className="text-xs font-medium text-[#B0A588]">
            {"\u00A9"} {new Date().getFullYear()} NextCaseHQ Technologies Inc. All rights reserved.
          </p>
          <p className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#8A7A56]">
            Infinite context · Zero knowledge
          </p>
        </div>
      </div>
    </footer>
  );
}
