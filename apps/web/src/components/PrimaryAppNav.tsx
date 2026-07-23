'use client';

import React from 'react';
import Link from 'next/link';

/**
 * The one cross-module nav row shared by every authenticated-shell layout
 * (Case Diary, Matter Register/Workspace, Draft Builder) — replaces the
 * disabled "Matter Workspace ▾" placeholder button that used to sit here
 * (a non-functional "coming soon" control that also happened to collide
 * in name with the per-matter Matter Workspace page). Real, working links
 * so moving between modules never requires falling back to the public
 * marketing navbar (see NavbarWrapper.tsx's hide-list) or feels like
 * leaving the application.
 */
export const PRIMARY_APP_NAV_SECTIONS = [
  { key: 'cases', label: 'Case Diary', href: '/cases' },
  { key: 'matters', label: 'Matter Register', href: '/matters' },
  { key: 'draft-builder', label: 'Draft Builder', href: '/dashboard/draft-builder' },
] as const;

export type PrimaryAppNavSection = (typeof PRIMARY_APP_NAV_SECTIONS)[number]['key'];

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
