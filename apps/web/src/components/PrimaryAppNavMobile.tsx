'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PRIMARY_APP_NAV_SECTIONS, type PrimaryAppNavSection } from './PrimaryAppNav';

interface ContextSection {
  label: string;
  href: string;
}

interface PrimaryAppNavMobileProps {
  active?: PrimaryAppNavSection;
  /** Optional in-page section anchors shown below the cross-module links
      (e.g. the Matter Navigator's Overview/Health/Proceedings list) — only
      relevant while viewing one record within a module. */
  contextLabel?: string;
  contextSections?: ContextSection[];
  contextBackHref?: string;
  contextBackLabel?: string;
}

/**
 * The one mobile navigation pattern shared by every authenticated shell
 * (Case Diary, Matter Register/Workspace, Draft Builder) — a hamburger
 * button that opens an off-canvas drawer with the same three cross-module
 * links PrimaryAppNav already renders on desktop (that component is
 * `hidden md:flex`, so below the md breakpoint an advocate previously had
 * no way at all to move between modules short of the browser back button).
 * Mounted once per layout; each layout passes its own `active` section and,
 * where relevant, its own contextual section list.
 */
export function PrimaryAppNavMobile({
  active,
  contextLabel,
  contextSections,
  contextBackHref,
  contextBackLabel,
}: PrimaryAppNavMobileProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(false);

  React.useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        aria-controls="primary-app-nav-mobile"
        className="lg:hidden flex-none p-2 -ml-2 text-[#8A7A56] hover:text-[#241E17] transition-colors bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] rounded"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="primary-app-nav-mobile"
        aria-label="Primary"
        className={`fixed lg:hidden inset-y-0 left-0 z-50 w-64 border-r border-[#F4EEE0] bg-white flex flex-col
          transform transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-16 px-6 border-b border-[#F4EEE0] flex items-center justify-between flex-none">
          <span className="text-lg font-black tracking-tight text-[#241E17] flex items-center gap-1">
            <span>NextCase</span><span className="text-[#8A6D2F]">HQ</span>
          </span>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation menu"
            className="p-1 text-[#B0A588] hover:text-[#3A3222] transition-colors bg-transparent border-none outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] rounded"
          >
            ✕
          </button>
        </div>

        <nav className="px-4 py-6 space-y-1 flex-none border-b border-[#F4EEE0]">
          {PRIMARY_APP_NAV_SECTIONS.map((section) => (
            <Link
              key={section.key}
              href={section.href}
              aria-current={section.key === active ? 'page' : undefined}
              className={`block px-4 py-2.5 rounded text-sm font-bold uppercase tracking-wide transition-all ${
                section.key === active
                  ? 'bg-[#FBF6EA] text-[#8A6D2F]'
                  : 'text-[#8A7A56] hover:text-[#241E17] hover:bg-[#FBF8F1]'
              }`}
            >
              {section.label}
            </Link>
          ))}
        </nav>

        {contextSections && contextSections.length > 0 && (
          <>
            {contextLabel && (
              <p className="px-6 pt-4 pb-1 text-[10px] font-black uppercase tracking-widest text-[#B0A588] flex-none">
                {contextLabel}
              </p>
            )}
            <nav className="flex-1 px-4 pb-4 space-y-1 overflow-y-auto">
              {contextSections.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2.5 rounded text-sm font-semibold tracking-wide text-[#8A7A56] hover:text-[#241E17] hover:bg-[#FBF8F1] transition-all"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            {contextBackHref && (
              <div className="p-4 border-t border-[#F4EEE0] flex-none">
                <Link
                  href={contextBackHref}
                  className="text-[10px] font-bold uppercase tracking-wider text-[#B0A588] hover:text-[#8A6D2F] transition-colors"
                >
                  {contextBackLabel ?? '← Back'}
                </Link>
              </div>
            )}
          </>
        )}
      </aside>
    </>
  );
}
