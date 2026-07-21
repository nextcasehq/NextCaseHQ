import { MetadataRoute } from 'next';

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

  return marketingPages.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1.0 : route === '/features' || route === '/solutions' ? 0.8 : 0.5,
  }));
}
