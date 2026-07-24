'use client';

import React from 'react';
import Link from 'next/link';
import { PRIMARY_APP_NAV_SECTIONS, type PrimaryAppNavSection } from '@/lib/nav/primary-app-nav-sections';

export { PRIMARY_APP_NAV_SECTIONS, type PrimaryAppNavSection };

export function PrimaryAppNav({ active }: { active?: PrimaryAppNavSection }) {
  return (
    <nav aria-label="Primary" className="hidden md:flex items-center gap-1 ml-2">
      {PRIMARY_APP_NAV_SECTIONS.map((section) => (
        <Link
          key={section.key}
          href={section.href}
          aria-current={section.key === active ? 'page' : undefined}
          className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${
            section.key === active
              ? 'bg-[#FBF6EA] text-[#8A6D2F] border border-[#E7DFC9]'
              : 'text-[#726B58] hover:text-[#241E17] border border-transparent'
          }`}
        >
          {section.label}
        </Link>
      ))}
    </nav>
  );
}
