import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import BrandBackground from '@/components/BrandBackground';
import Breadcrumbs from '@/components/Breadcrumbs';
import { buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { verifySessionToken } from '@/lib/auth/jwt';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session-cookie';
import { DatabaseClient } from '@/lib/db/db-client';
import { getDocumentType } from '@/lib/domain/document-type';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface DocumentMeta {
  title: string;
  documentType: string | null;
}

/**
 * Best-effort, session-scoped lookup used by BOTH generateMetadata and the
 * layout body below, so the (real, tenant-RLS-scoped) title backing the
 * page's <title>/breadcrumb is fetched at most once per request-render
 * pass. Never throws: metadata generation must never crash the page, and
 * an expired/missing session here simply falls back to a generic title —
 * the actual auth gate for the document's content is the client page's own
 * requireSession-backed API calls, not this shell.
 */
async function resolveDocumentMeta(id: string): Promise<DocumentMeta | null> {
  if (!UUID_PATTERN.test(id)) return null;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    const session = await verifySessionToken(token);
    const db = new DatabaseClient();
    const rows = await db.execute<{ title: string; document_type: string | null }>(
      session.tenantId,
      `SELECT title, document_type FROM "DocumentEnvelope" WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) return null;
    return { title: rows[0].title, documentType: rows[0].document_type };
  } catch {
    return null;
  }
}

type LayoutParams = { params: Promise<{ id: string }> };

/**
 * Server-component shell for /documents/[id] (SEO/GEO hook, Milestone 4).
 * Same split as /documents/new/layout.tsx: real, server-rendered chrome
 * (title, canonical, breadcrumb, JSON-LD) independent of the client body.
 * `robots: noindex` — authenticated, tenant-private content, never
 * intended to rank publicly; see
 * docs/MILESTONE_4_PREPARE_DOCUMENT_PLAN.md §9 for the rationale and the
 * documented future extension point (a public DocumentType knowledge page,
 * which would emit real schema.org structured data from this same seam).
 */
export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { id } = await params;
  const meta = await resolveDocumentMeta(id);
  const title = meta ? `${meta.title} | NextCaseHQ Documents` : 'Document | NextCaseHQ';
  const description = meta
    ? `${meta.title} — version history, preview, and download.`
    : 'View a prepared or uploaded legal document.';
  return {
    title,
    description,
    alternates: { canonical: `/documents/${id}` },
    robots: { index: false, follow: false },
    openGraph: { title, description, url: `/documents/${id}`, siteName: 'NextCaseHQ', type: 'website' },
  };
}

export default async function DocumentDetailLayout({ children, params }: { children: React.ReactNode } & LayoutParams) {
  const { id } = await params;
  const meta = await resolveDocumentMeta(id);
  const leafLabel = meta ? getDocumentType(meta.documentType)?.label ?? meta.title : 'Document';

  const jsonLd = buildBreadcrumbJsonLd([
    { name: 'Documents', path: `/documents/${id}` },
    { name: leafLabel, path: `/documents/${id}` },
  ]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans selection:bg-[#8A6D2F] selection:text-white">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="relative isolate flex-1 max-w-4xl w-full mx-auto px-6 py-10">
        <BrandBackground />
        <Breadcrumbs items={[{ label: 'Documents' }, { label: leafLabel }]} />
        {children}
      </div>
    </div>
  );
}
