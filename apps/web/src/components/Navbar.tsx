'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Logo from './Logo';

export default function Navbar() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { label: 'Matters', path: '/matters' },
    { label: 'Cases', path: '/cases' },
    { label: 'Features', path: '/features' },
    { label: 'Solutions', path: '/solutions' },
    { label: 'Pricing', path: '/pricing' }
  ];

  return (
    <header className="w-full h-16 bg-[#0E241B]/95 backdrop-blur-md border-b border-[#C6A253]/25 sticky top-0 z-50 px-6 md:px-12 flex items-center justify-between font-sans">
      {/* Brand Identity with scales-of-justice emblem */}
      <div className="flex items-center gap-3">
        <Link href={`${baseUrl}/`} className="flex items-center gap-2.5 hover:opacity-85 transition-opacity group">
          <Logo size={30} className="transition-transform group-hover:scale-105" />
          <span className="font-serif font-bold text-lg text-white tracking-tight">
            NextCase<span className="text-[#E4C77E]">HQ</span>
          </span>
        </Link>
      </div>
      
      {/* Navigation Links - Desktop */}
      <nav className="hidden md:flex items-center gap-8">
        {menuItems.map((item) => (
          <Link 
            key={item.path} 
            href={`${baseUrl}${item.path}`}
            className="text-sm font-medium text-[#CFC3A8] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E4C77E] rounded px-2 py-1"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* CTA Section */}
      <div className="hidden md:flex items-center gap-4">
        <Link
          href={`${baseUrl}/dashboard`}
          className="text-sm font-medium text-[#CFC3A8] hover:text-white transition-colors mr-2"
        >
          Dashboard
        </Link>
        <Link
          href={`${baseUrl}/login`}
          className="bg-[#C6A253] text-[#241E17] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#E4C77E] transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E4C77E] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0E241B]"
        >
          Sign In
        </Link>
      </div>

      {/* Mobile Burger Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden flex flex-col justify-center items-center w-8 h-8 rounded-lg hover:bg-[#C6A253]/15 transition-colors"
        aria-label="Toggle navigation menu"
      >
        <span className={`w-5 h-0.5 bg-[#E4C77E] rounded transition-transform ${mobileMenuOpen ? 'rotate-45 translate-y-1' : ''}`}></span>
        <span className={`w-5 h-0.5 bg-[#E4C77E] rounded transition-opacity mt-1.5 ${mobileMenuOpen ? 'opacity-0' : 'opacity-1'}`}></span>
        <span className={`w-5 h-0.5 bg-[#E4C77E] rounded transition-transform mt-1.5 ${mobileMenuOpen ? '-rotate-45 -translate-y-1' : ''}`}></span>
      </button>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <nav aria-label="Mobile navigation" className="absolute top-16 left-0 w-full bg-[#0E241B] border-b border-[#C6A253]/25 flex flex-col p-6 gap-4 shadow-lg md:hidden animate-fade-in">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              href={`${baseUrl}${item.path}`}
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-[#CFC3A8] hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <div className="h-px bg-[#C6A253]/20 my-2"></div>
          <Link
            href={`${baseUrl}/dashboard`}
            onClick={() => setMobileMenuOpen(false)}
            className="text-base font-medium text-[#CFC3A8] hover:text-white transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href={`${baseUrl}/login`}
            onClick={() => setMobileMenuOpen(false)}
            className="bg-[#C6A253] text-[#241E17] text-center text-base font-semibold py-3 rounded-lg hover:bg-[#E4C77E] transition-all"
          >
            Sign In
          </Link>
        </nav>
      )}
    </header>
  );
}
