import { MetadataRoute } from 'next';
import { HELP_ARTICLES } from '@/lib/help/content';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nextcasehq.com';

  const marketingPages = [
    '',
    '/features',
    '/solutions',
    '/pricing',
    '/about',
    '/resources',
    '/contact',
    '/privacy',
    '/terms',
  ];

  const marketingEntries: MetadataRoute.Sitemap = marketingPages.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : route === '/features' || route === '/solutions' ? 0.8 : 0.5,
  }));

  const helpEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/help`, lastModified: new Date().toISOString(), changeFrequency: 'weekly', priority: 0.7 },
    ...HELP_ARTICLES.map((article) => ({
      url: `${baseUrl}/help/${article.slug}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];

  const legalResourceEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/legal-resources`, lastModified: new Date().toISOString(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/legal-resources/practice-guides`, lastModified: new Date().toISOString(), changeFrequency: 'weekly', priority: 0.7 },
  ];

  return [...marketingEntries, ...helpEntries, ...legalResourceEntries];
}
