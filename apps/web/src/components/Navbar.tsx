'use client';

import React, { useState } from 'react';
import Link from 'next/link';

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
    <header className="w-full h-16 bg-white/90 backdrop-blur-md border-b border-neutral-100 sticky top-0 z-50 px-6 md:px-12 flex items-center justify-between font-sans">
      {/* Brand Identity with Law-inspired "N" logo */}
      <div className="flex items-center gap-3">
        <Link href={`${baseUrl}/`} className="flex items-center gap-2.5 hover:opacity-85 transition-opacity group">
          <svg
            className="w-7 h-7 text-[#111111] group-hover:text-indigo-600 transition-colors"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            {/* Courthouse-inspired vertical pillars forming the letter N */}
            <path d="M6 4v16M18 4v16M6 4l12 16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-bold text-lg text-[#111111] tracking-tight">
            NextCase<span className="text-indigo-600">HQ</span>
          </span>
        </Link>
      </div>
      
      {/* Navigation Links - Desktop */}
      <nav className="hidden md:flex items-center gap-8">
        {menuItems.map((item) => (
          <Link 
            key={item.path} 
            href={`${baseUrl}${item.path}`}
            className="text-sm font-medium text-neutral-500 hover:text-[#111111] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded px-2 py-1"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* CTA Section */}
      <div className="hidden md:flex items-center gap-4">
        <Link
          href={`${baseUrl}/dashboard`}
          className="text-sm font-medium text-neutral-500 hover:text-[#111111] transition-colors mr-2"
        >
          Dashboard
        </Link>
        <Link
          href={`${baseUrl}/login`}
          className="bg-[#111111] text-[#FDFBF7] text-sm font-semibold px-4 py-2 rounded-lg hover:bg-neutral-800 hover:text-white transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
        >
          Sign In
        </Link>
      </div>

      {/* Mobile Burger Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden flex flex-col justify-center items-center w-8 h-8 rounded-lg hover:bg-neutral-50 transition-colors"
        aria-label="Toggle navigation menu"
      >
        <span className={`w-5 h-0.5 bg-neutral-600 rounded transition-transform ${mobileMenuOpen ? 'rotate-45 translate-y-1' : ''}`}></span>
        <span className={`w-5 h-0.5 bg-neutral-600 rounded transition-opacity mt-1.5 ${mobileMenuOpen ? 'opacity-0' : 'opacity-1'}`}></span>
        <span className={`w-5 h-0.5 bg-neutral-600 rounded transition-transform mt-1.5 ${mobileMenuOpen ? '-rotate-45 -translate-y-1' : ''}`}></span>
      </button>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 w-full bg-white border-b border-neutral-100 flex flex-col p-6 gap-4 shadow-lg md:hidden animate-fade-in">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              href={`${baseUrl}${item.path}`}
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <div className="h-px bg-neutral-100 my-2"></div>
          <Link
            href={`${baseUrl}/dashboard`}
            onClick={() => setMobileMenuOpen(false)}
            className="text-base font-medium text-neutral-600 hover:text-[#111111] transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href={`${baseUrl}/login`}
            onClick={() => setMobileMenuOpen(false)}
            className="bg-[#111111] text-[#FDFBF7] text-center text-base font-medium py-3 rounded-lg hover:bg-neutral-800 hover:text-white transition-all"
          >
            Sign In
          </Link>
        </div>
      )}
    </header>
  );
}
