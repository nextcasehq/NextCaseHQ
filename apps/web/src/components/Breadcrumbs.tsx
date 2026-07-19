import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Semantic breadcrumb nav (SEO/GEO hook — Milestone 4). Server-renderable:
 * used from route-segment layout.tsx files (server components) so the
 * trail exists in markup independent of the client-rendered page body
 * beneath it. See docs/MILESTONE_4_PREPARE_DOCUMENT_PLAN.md §9.
 */
export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#726B58]">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">/</span>}
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-[#8A6D2F] transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined} className={isLast ? 'text-[#8A6D2F]' : ''}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
