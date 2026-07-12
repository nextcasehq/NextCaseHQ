import { MetadataRoute } from 'next';

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
        '/blog',
        '/privacy',
        '/terms'
      ],
      disallow: [
        '/_next/',
        '/api/',
        '/login',
        '/organization',
        '/dashboard/',
        '/cases/',
        '/search/',
        '/audit/',
        '/settings/'
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
