import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getResourceHtml } from '@/lib/help/legal-resources';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import JsonLd from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Practice Guides & Checklists',
  description: 'Step-by-step procedural checklists for civil, criminal, family, commercial, arbitration, tribunal, and advisory legal work.',
  alternates: { canonical: '/legal-resources/practice-guides' },
  openGraph: { title: 'Practice Guides & Checklists | NextCaseHQ', description: 'Step-by-step procedural checklists for Indian legal practice.', url: '/legal-resources/practice-guides' },
};

export default function PracticeGuidesPage() {
  const html = getResourceHtml('practice-guides');
  if (html === null) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans">
      <JsonLd type="TechArticle" data={{ headline: 'Practice Guides & Checklists', url: '/legal-resources/practice-guides' }} />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Breadcrumbs
          items={[
            { label: 'Legal Resource Centre', href: '/legal-resources' },
            { label: 'Practice Guides & Checklists', href: '/legal-resources/practice-guides' },
          ]}
        />
        <article className="help-article" dangerouslySetInnerHTML={{ __html: html! }} />
      </div>
    </div>
  );
}
