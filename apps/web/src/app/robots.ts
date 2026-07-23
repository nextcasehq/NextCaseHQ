import { MetadataRoute } from 'next';

/**
 * Crawler guidance only — not an access-control boundary. Every route
 * excluded here is (or, per its own route logic, will be) also gated by
 * real authentication/authorization; disallow entries just keep crawlers
 * from wasting budget on, or surfacing snippets of, non-public app screens.
 * This list is a superset of the sitemap's public routes but is not
 * required to enumerate every non-public path 1:1 with the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nextcasehq.com';
  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/features',
        '/solutions',
        '/pricing',
        '/about',
        '/resources',
        '/contact',
        '/privacy',
        '/terms',
        '/help',
        '/legal-resources'
      ],
      disallow: [
        '/_next/',
        '/api/',
        '/organization',
        '/dashboard/',
        '/cases/',
        '/matters/',
        '/documents/',
        '/search/',
        '/audit/',
        '/admin',
        '/docs',
        '/system',
        '/settings/'
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
