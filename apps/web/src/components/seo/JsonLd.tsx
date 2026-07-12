import React from 'react';

interface JsonLdProps {
  type: 'Organization' | 'SoftwareApplication' | 'WebSite';
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
      'sameAs': [
        'https://twitter.com',
        'https://linkedin.com'
      ],
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
        'price': '0',
        'priceCurrency': 'INR'
      },
      ...data
    },
    WebSite: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      'name': 'NextCaseHQ',
      'url': baseUrl,
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
