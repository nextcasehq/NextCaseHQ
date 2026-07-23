import React from 'react';

/**
 * `LegalService`/`FAQPage`/`Article` builders exist for future use only.
 * NextCaseHQ is a software platform for legal professionals, not itself a
 * law firm or provider of legal representation — do not wire `LegalService`
 * to any page unless that page explicitly and truthfully presents
 * NextCaseHQ as a legal-service provider. Likewise, `FAQPage`/`Article`
 * should only be attached to a page that actually contains the
 * corresponding Q&A or article content the schema describes.
 */
interface JsonLdProps {
  type: 'Organization' | 'SoftwareApplication' | 'WebSite' | 'LegalService' | 'FAQPage' | 'Article' | 'BreadcrumbList' | 'WebPage' | 'TechArticle';
  data?: Record<string, any>;
}

export default function JsonLd({ type, data = {} }: JsonLdProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nextcasehq.com';

  const baseSchemas = {
    Organization: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      'name': 'NextCaseHQ',
      'url': baseUrl,
      'logo': `${baseUrl}/assets/logo.png`,
      ...data
    },
    SoftwareApplication: {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      'name': 'NextCaseHQ Platform',
      'operatingSystem': 'All',
      'applicationCategory': 'BusinessApplication, LegalTech',
      'offers': {
        '@type': 'Offer',
        'price': '49',
        'priceCurrency': 'USD'
      },
      ...data
    },
    WebSite: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': 'NextCaseHQ',
      'url': baseUrl,
      ...data
    },
    LegalService: {
      '@context': 'https://schema.org',
      '@type': 'LegalService',
      'name': 'NextCaseHQ',
      'url': baseUrl,
      ...data
    },
    FAQPage: {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      ...data
    },
    Article: {
      '@context': 'https://schema.org',
      '@type': 'Article',
      ...data
    },
    BreadcrumbList: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      ...data
    },
    WebPage: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'url': baseUrl,
      ...data
    },
    TechArticle: {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      ...data
    }
  };

  const selectedSchema = baseSchemas[type] || { '@context': 'https://schema.org', '@type': type, ...data };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(selectedSchema) }}
    />
  );
}
