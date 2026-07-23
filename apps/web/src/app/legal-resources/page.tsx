import type { Metadata } from 'next';
import Link from 'next/link';
import { RESOURCE_CATEGORIES } from '@/lib/help/legal-resources';
import JsonLd from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Legal Resource Centre',
  description: 'Practice guides, checklists, workflow guides, and reference material for Indian litigation and legal practice — from NextCaseHQ.',
  alternates: { canonical: '/legal-resources' },
  openGraph: { title: 'NextCaseHQ Legal Resource Centre', description: 'Practice guides and reference material for Indian legal practice.', url: '/legal-resources' },
};

export default function LegalResourcesPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans">
      <JsonLd type="WebPage" data={{ name: 'NextCaseHQ Legal Resource Centre', url: '/legal-resources' }} />
      <div className="max-w-4xl mx-auto px-6 py-16">
        <Breadcrumbs items={[{ label: 'Legal Resource Centre', href: '/legal-resources' }]} />
        <p className="text-xs font-bold uppercase tracking-widest text-[#8A6D2F] mb-3">Legal Resource Centre</p>
        <h1 className="text-3xl font-black text-[#111111] mb-4">Practice guides &amp; reference material</h1>
        <p className="text-sm text-[#6F5624] mb-10 max-w-2xl">
          A professional reference library for Indian litigation and legal practice — separate from the product Help Centre, and independent of your day-to-day Matter work. Nothing here is required reading to use NextCaseHQ.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {RESOURCE_CATEGORIES.map((cat) =>
            cat.status === 'available' ? (
              <Link
                key={cat.title}
                href={cat.href}
                className="bg-white border border-[#E7DFC9]/80 rounded-xl p-5 hover:border-[#8A6D2F] hover:shadow transition-all"
              >
                <h2 className="text-sm font-bold text-[#111111] mb-1.5">{cat.title}</h2>
                <p className="text-xs text-[#8A7A56]">{cat.description}</p>
              </Link>
            ) : (
              <div key={cat.title} className="bg-[#FBF8F1]/50 border border-dashed border-[#E7DFC9] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-1.5">
                  <h2 className="text-sm font-bold text-[#8A7A56]">{cat.title}</h2>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#B0A588] border border-[#E7DFC9] rounded px-1.5 py-0.5">
                    Planned
                  </span>
                </div>
                <p className="text-xs text-[#B0A588]">{cat.description}</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
