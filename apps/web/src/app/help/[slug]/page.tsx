import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HELP_ARTICLES, getHelpArticleMeta, getHelpArticleHtml, getHelpArticleRawContent } from '@/lib/help/content';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import JsonLd from '@/components/seo/JsonLd';

export function generateStaticParams() {
  return HELP_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const meta = getHelpArticleMeta(slug);
  if (!meta) return {};
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/help/${slug}` },
    openGraph: { title: `${meta.title} | NextCaseHQ Help Centre`, description: meta.description, url: `/help/${slug}` },
  };
}

/** Extracts "**Q: ...?** / A: ..." pairs (this repo's faq.md format) for
 *  FAQPage schema. Best-effort only — used solely for the faq.md article. */
function extractFaqPairs(raw: string): Array<{ question: string; answer: string }> {
  const pairs: Array<{ question: string; answer: string }> = [];
  const lines = raw.split('\n');
  let currentQuestion: string | null = null;
  for (const line of lines) {
    const qMatch = line.match(/^\*\*Q:\s*(.*?)\*\*\s*$/);
    if (qMatch) {
      currentQuestion = qMatch[1].trim();
      continue;
    }
    const aMatch = line.match(/^A:\s*(.*)$/);
    if (aMatch && currentQuestion) {
      pairs.push({ question: currentQuestion, answer: aMatch[1].trim() });
      currentQuestion = null;
    }
  }
  return pairs;
}

export default async function HelpArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = getHelpArticleMeta(slug);
  const html = getHelpArticleHtml(slug);
  if (!meta || html === null) {
    notFound();
  }

  const faqPairs = slug === 'faq' ? extractFaqPairs(getHelpArticleRawContent(slug) ?? '') : [];

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans">
      <JsonLd
        type="TechArticle"
        data={{ headline: meta!.title, description: meta!.description, url: `/help/${slug}` }}
      />
      {faqPairs.length > 0 && (
        <JsonLd
          type="FAQPage"
          data={{
            mainEntity: faqPairs.map((p) => ({
              '@type': 'Question',
              name: p.question,
              acceptedAnswer: { '@type': 'Answer', text: p.answer },
            })),
          }}
        />
      )}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Breadcrumbs items={[{ label: 'Help Centre', href: '/help' }, { label: meta!.title, href: `/help/${slug}` }]} />
        <article className="help-article" dangerouslySetInnerHTML={{ __html: html! }} />
      </div>
    </div>
  );
}
