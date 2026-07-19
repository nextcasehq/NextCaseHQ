import type { Metadata } from 'next';
import BrandBackground from '@/components/BrandBackground';
import Breadcrumbs from '@/components/Breadcrumbs';
import { buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';

/**
 * Server-component shell for /documents/new (SEO/GEO hook, Milestone 4).
 * Owns the page chrome (background, breadcrumb, JSON-LD) as real,
 * server-rendered markup, independent of the client-rendered form beneath
 * it in page.tsx — same split the root app/layout.tsx already uses between
 * itself and its client pages. `robots: noindex` because this is an
 * authenticated drafting tool, not public content; the
 * canonical/openGraph/breadcrumb/JSON-LD machinery itself is what a future
 * public-facing page would reuse unchanged. See
 * docs/MILESTONE_4_PREPARE_DOCUMENT_PLAN.md §9.
 */
export const metadata: Metadata = {
  title: 'Prepare New Document | NextCaseHQ',
  description:
    'Prepare a new legal document from a category-scoped facts form and AI-assisted drafting, for advocate review before saving.',
  alternates: { canonical: '/documents/new' },
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Prepare New Document | NextCaseHQ',
    description:
      'Prepare a new legal document from a category-scoped facts form and AI-assisted drafting, for advocate review before saving.',
    url: '/documents/new',
    siteName: 'NextCaseHQ',
    type: 'website',
  },
};

const BREADCRUMB_ITEMS = [
  { label: 'Documents', path: '/documents/new' },
  { label: 'Prepare New Document', path: '/documents/new' },
];

export default function DocumentsNewLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = buildBreadcrumbJsonLd(BREADCRUMB_ITEMS.map((i) => ({ name: i.label, path: i.path })));

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans selection:bg-[#8A6D2F] selection:text-white">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="relative isolate flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        <BrandBackground />
        <Breadcrumbs items={[{ label: 'Documents' }, { label: 'Prepare New Document' }]} />
        {children}
      </main>
    </div>
  );
}
