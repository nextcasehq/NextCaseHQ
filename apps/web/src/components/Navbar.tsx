'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function Navbar() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { label: 'Features', path: '/features' },
    { label: 'Solutions', path: '/solutions' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'About', path: '/about' },
    { label: 'Contact', path: '/contact' }
  ];

  return (
    <header className="w-full h-16 bg-white/80 backdrop-blur-md border-b border-neutral-100 sticky top-0 z-50 px-6 md:px-12 flex items-center justify-between font-sans">
      {/* Brand Identity */}
      <div className="flex items-center gap-3">
        <Link href={`${baseUrl}/`} className="font-bold text-lg text-neutral-900 tracking-tight hover:opacity-80 transition-opacity flex items-center gap-1.5">
          <span>NextCaseHQ</span>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
        </Link>
      </div>
      
      {/* Navigation Links - Desktop */}
      <nav className="hidden md:flex items-center gap-8">
        {menuItems.map((item) => (
          <Link 
            key={item.path} 
            href={`${baseUrl}${item.path}`}
            className="text-sm font-medium text-neutral-500 hover:text-neutral-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded px-2 py-1"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* CTA Section */}
      <div className="hidden md:flex items-center gap-4">
        <Link
          href={`${baseUrl}/dashboard`}
          className="text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors mr-2"
        >
          Dashboard
        </Link>
        <Link
          href={`${baseUrl}/login`}
          className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
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
            className="text-base font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href={`${baseUrl}/login`}
            onClick={() => setMobileMenuOpen(false)}
            className="bg-indigo-600 text-white text-center text-base font-medium py-3 rounded-lg hover:bg-indigo-700 transition-all"
          >
            Sign In
          </Link>
        </div>
      )}
    </header>
  );
}
