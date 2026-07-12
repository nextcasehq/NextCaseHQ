'use client';

import React from 'react';
import Link from 'next/link';

export default function Navbar() {
  // Hardened fallback ensures mapping execution even if environment tokens are absent
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  const menuItems = [
    { label: 'Home', path: '/' },
    { label: 'Features', path: '/features' },
    { label: 'Solutions', path: '/solutions' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'About', path: '/about' },
    { label: 'Resources', path: '/resources' },
    { label: 'Contact', path: '/contact' },
    { label: 'Login', path: '/login' },
    { label: 'Dashboard', path: '/dashboard' }
  ];

  return (
    <header className="w-full h-16 bg-[#FDFBF7] border-b border-neutral-200 sticky top-0 z-50 px-6 flex items-center justify-between">
      {/* Brand Workspace Identity */}
      <div className="flex items-center gap-2">
        <Link href={`${baseUrl}/`} className="font-bold text-xl text-[#111111] tracking-tight hover:opacity-80 transition-opacity">
          NextCaseHQ
        </Link>
      </div>
      
      {/* Responsive Horizontal Link Strip */}
      <nav className="flex items-center gap-2 sm:gap-4 md:gap-6 overflow-x-auto max-w-full py-1 scrollbar-none">
        {menuItems.map((item) => (
          <Link 
            key={item.path} 
            href={`${baseUrl}${item.path}`}
            className="text-xs sm:text-sm font-medium text-neutral-600 hover:text-[#111111] whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 rounded px-2 py-1"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
