import React from "react";
import Link from "next/link";

export const Footer = () => {
  const footerLinks = [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Documentation", href: "/docs" },
    { label: "Support", href: "/support" },
  ];

  return (
    <footer className="border-t border-[#111111]/10 bg-[#111111]/5 px-6 lg:px-16 py-12">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Copyright Information */}
        <div className="flex flex-col gap-2 items-center md:items-start">
          <span className="font-sans font-bold text-lg tracking-tight text-[#111111]">
            NextCaseHQ
          </span>
          <span className="text-xs font-sans text-[#111111]/60">
            © {new Date().getFullYear()} NextCaseHQ. All rights reserved. Zero-Knowledge. Infinite Context.
          </span>
        </div>

        {/* Footer Links */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-xs font-sans uppercase font-bold text-[#111111]/70">
          {footerLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="hover:text-[#111111] transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
};
