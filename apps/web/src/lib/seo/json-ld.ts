/**
 * JSON-LD insertion points (SEO/GEO hook — Milestone 4). Only
 * BreadcrumbList is emitted today — a schema.org LegalDocument/DocumentType
 * builder is a documented future extension point (see
 * docs/MILESTONE_4_PREPARE_DOCUMENT_PLAN.md §9), not implemented now:
 * emitting real document content as structured data would leak private
 * content, since every /documents/[id] page is authenticated.
 */

export function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'https://nextcasehq.com';
}

export interface BreadcrumbJsonLdItem {
  name: string;
  path: string;
}

export function buildBreadcrumbJsonLd(items: BreadcrumbJsonLdItem[]) {
  const base = appBaseUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${base}${item.path}`,
    })),
  };
}
