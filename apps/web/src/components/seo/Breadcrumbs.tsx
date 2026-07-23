import React from 'react';
import Link from 'next/link';
import JsonLd from './JsonLd';

export interface BreadcrumbItem {
  label: string;
  href: string;
}

/**
 * Visible breadcrumb nav + matching BreadcrumbList JSON-LD, in one place
 * so the two never drift apart. href values should be absolute paths
 * (e.g. "/help/glossary"); the schema resolves them against
 * NEXT_PUBLIC_APP_URL the same way every other JsonLd instance does.
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nextcasehq.com';

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-xs text-[#8A7A56] mb-4">
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((item, index) => (
            <li key={item.href} className="flex items-center gap-1.5">
              {index > 0 && <span aria-hidden="true">/</span>}
              {index === items.length - 1 ? (
                <span className="font-semibold text-[#3A3222]" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="hover:underline hover:text-[#8A6D2F]">
                  {item.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        type="BreadcrumbList"
        data={{
          itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.label,
            item: `${baseUrl}${item.href}`,
          })),
        }}
      />
    </>
  );
}
