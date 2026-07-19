import type { Metadata } from 'next';
import BrandBackground from '@/components/BrandBackground';

/**
 * Server-component shell for /search (SEO/GEO hook, Milestone 5 — Universal
 * Search), following the same server-rendered-shell/client-rendered-body
 * split established for /documents/new and /documents/[id] in Milestone 4.
 * This branch predates that milestone's shared Breadcrumbs/json-ld helper
 * modules (PR #100, not yet merged at the time this milestone branched
 * from main) — rather than depend on files that don't exist yet on this
 * branch's history, the breadcrumb nav and JSON-LD BreadcrumbList are
 * inlined here directly. `robots: noindex` — authenticated, tenant-private
 * search, never intended to rank publicly.
 */
export const metadata: Metadata = {
  title: 'Search | NextCaseHQ',
  description: 'Search across Matters, Proceedings, Clients, Court Notes, and Documents.',
  alternates: { canonical: '/search' },
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Search | NextCaseHQ',
    description: 'Search across Matters, Proceedings, Clients, Court Notes, and Documents.',
    url: '/search',
    siteName: 'NextCaseHQ',
    type: 'website',
  },
};

const BREADCRUMB_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Search',
      item: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nextcasehq.com'}/search`,
    },
  ],
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans selection:bg-[#8A6D2F] selection:text-white">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_JSON_LD) }} />
      <main className="relative isolate flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        <BrandBackground />
        <nav aria-label="breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#B0A588]">
            <li>
              <span aria-current="page" className="text-[#8A6D2F]">
                Search
              </span>
            </li>
          </ol>
        </nav>
        {children}
      </main>
    </div>
  );
}
