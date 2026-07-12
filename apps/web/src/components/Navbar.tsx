import React from "react";
import Link from "next/link";

export const Navbar = () => {
  const navLinks = [
    { label: "Features", href: "/features" },
    { label: "Solutions", href: "/solutions" },
    { label: "Resources", href: "/resources" },
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#FDFBF7]/80 border-b border-[#111111]/10 px-6 lg:px-16 h-20 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 group">
        <span className="text-2xl font-black tracking-tight text-[#111111] font-sans">
          NextCase<span className="text-[#111111]/60">HQ</span>
        </span>
      </Link>

      {/* Desktop Nav Links */}
      <nav className="hidden md:flex items-center gap-8 text-sm font-sans tracking-wide uppercase font-semibold text-[#111111]/80">
        {navLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className="hover:text-[#111111] transition-colors relative after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[2px] after:bg-[#111111] hover:after:w-full after:transition-all"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Top Navigation CTA */}
      <div className="flex items-center gap-4">
        <Link
          href="/login"
          className="px-6 py-2.5 rounded border border-[#111111] text-sm font-semibold font-sans uppercase hover:bg-[#111111] hover:text-[#FDFBF7] transition-all"
        >
          Sign In
        </Link>
      </div>
    </header>
  );
};
