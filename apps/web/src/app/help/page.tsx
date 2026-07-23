import type { Metadata } from 'next';
import Link from 'next/link';
import { HELP_ARTICLES, buildHelpSearchIndex } from '@/lib/help/content';
import JsonLd from '@/components/seo/JsonLd';
import { HelpSearch } from './HelpSearch';

export const metadata: Metadata = {
  title: 'Help Centre',
  description: 'Search the NextCaseHQ knowledge base: the user manual, administrator manual, workflow library, FAQ, and glossary.',
  alternates: { canonical: '/help' },
  openGraph: { title: 'NextCaseHQ Help Centre', description: 'Search the NextCaseHQ knowledge base.', url: '/help' },
};

export default function HelpIndexPage() {
  const searchIndex = buildHelpSearchIndex();

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans">
      <JsonLd type="WebPage" data={{ name: 'NextCaseHQ Help Centre', url: '/help' }} />
      <div className="max-w-4xl mx-auto px-6 py-16">
        <p className="text-xs font-bold uppercase tracking-widest text-[#8A6D2F] mb-3">Help Centre</p>
        <h1 className="text-3xl font-black text-[#111111] mb-4">How can we help?</h1>
        <p className="text-sm text-[#6F5624] mb-8 max-w-2xl">
          Search the full NextCaseHQ knowledge base — the user manual, administrator manual, workflow library, FAQ, and glossary — or browse by topic below.
        </p>

        <HelpSearch entries={searchIndex} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
          {HELP_ARTICLES.map((article) => (
            <Link
              key={article.slug}
              href={`/help/${article.slug}`}
              className="bg-white border border-[#E7DFC9]/80 rounded-xl p-5 hover:border-[#8A6D2F] hover:shadow transition-all"
            >
              <h2 className="text-sm font-bold text-[#111111] mb-1.5">{article.title}</h2>
              <p className="text-xs text-[#8A7A56]">{article.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
