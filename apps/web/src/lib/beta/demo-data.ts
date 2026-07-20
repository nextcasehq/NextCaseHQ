/**
 * Product Review Mode — a temporary, environment-flagged mode that lets a
 * Product Owner (or any unauthenticated reviewer) inspect a working
 * `/dashboard` launch page and one fixed, entirely synthetic Matter
 * Workspace (`DEMO_MATTER_ID`) without ever touching the database or
 * weakening authorization for any real tenant's data.
 *
 * Disabled by default. Enable with PRODUCT_REVIEW_MODE=true. This is a
 * server-only flag (read in middleware.ts) — there is no client-exposed
 * equivalent; the client infers review mode purely from the `is_demo` /
 * `review_mode` markers already present in the JSON these routes return,
 * so there is nothing to keep in sync.
 *
 * Formerly gated by BETA_PREVIEW_ENABLED — migrated to PRODUCT_REVIEW_MODE
 * (this module, and the routes/pages that use it, no longer reads the old
 * variable at all) so review access isn't tied to "beta" branding, which
 * is being removed from every reviewer-facing surface.
 *
 * Every payload below is read-only, hand-written sample content. No write
 * route (POST/PATCH/PUT/DELETE) is ever short-circuited here — only GET
 * requests to this fixed set of paths, and only when there is no session
 * cookie at all. A real signed-in session always reaches the real,
 * database-backed route unchanged.
 */

import { findDemoSearchItem, searchDemoLegalDataset } from './demo-search-data';

export const DEMO_MATTER_ID = 'deadbeef-0000-4000-8000-000000000000';

export function isProductReviewModeEnabled(): boolean {
  return process.env.PRODUCT_REVIEW_MODE === 'true';
}

const DEMO_MATTER = {
  id: DEMO_MATTER_ID,
  title: 'Demo Matter — Product Review (Sample Data)',
  matter_number: 'DEMO-0001',
  engagement_type: 'LITIGATION',
  practice_area: 'Commercial Litigation',
  status: 'ACTIVE',
  client_id: null,
  client_name: 'Acme Textiles Pvt. Ltd. (Demo)',
  opposing_party_name: 'R96 Global Traders (Demo)',
  opposing_counsel: 'Demo & Associates',
  court: 'Demo Commercial Court',
  bench: null,
  judge: null,
  description:
    'This is a read-only sample Matter shown for Product Review only. No real client, document, or case data is loaded — working with your own Matters is available after production activation.',
  opened_at: '2026-05-01T00:00:00.000Z',
  closed_at: null,
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z',
  is_demo: true,
};

const DEMO_HEALTH = {
  stage: 'Discovery',
  last_hearing_date: '2026-06-15',
  last_court_forum_display: 'Demo Commercial Court, Court 4',
  last_note: 'Sample court note for demonstration purposes.',
  last_case_title: 'Acme Textiles Pvt. Ltd. v. R96 Global Traders',
  next_hearing_date: '2026-08-10',
  pending_action_count: 1,
  needs_attention: false,
};

const DEMO_PROCEEDING = {
  id: 'deadbeef-0000-4000-8000-000000000001',
  title: 'Acme Textiles Pvt. Ltd. v. R96 Global Traders',
  case_number: 'DEMO-CS-001/2026',
  status: 'HEARING',
  court: 'Demo Commercial Court',
  stage: 'Discovery',
  hearing_date: '2026-08-10',
};

const DEMO_EVENT = {
  id: 'deadbeef-0000-4000-8000-000000000002',
  event_date: '2026-06-15T00:00:00.000Z',
  description: 'Sample timeline entry — initial hearing held, discovery schedule set.',
  source_type: 'MANUAL',
};

const DEMO_PARTICIPANT = {
  id: 'deadbeef-0000-4000-8000-000000000003',
  user_id: 'deadbeef-0000-4000-8000-000000000004',
  role: 'LEAD_COUNSEL',
  user_email: 'demo.counsel@nextcase.local',
  user_name: 'Demo Counsel',
};

const DEMO_COURT_NOTE = {
  id: 'deadbeef-0000-4000-8000-000000000005',
  case_id: DEMO_PROCEEDING.id,
  case_title: DEMO_PROCEEDING.title,
  hearing_date: '2026-06-15',
  next_hearing_date: '2026-08-10',
  court_forum_display: 'Demo Commercial Court, Court 4',
  stage: 'Discovery',
  note: 'Sample court note for demonstration purposes — not a real hearing record.',
  next_actions: 'Prepare discovery bundle ahead of the next hearing.',
};

const DEMO_TASK = {
  id: 'deadbeef-0000-4000-8000-000000000006',
  case_id: DEMO_PROCEEDING.id,
  case_title: DEMO_PROCEEDING.title,
  status: 'PENDING' as const,
  action_text: 'Prepare discovery bundle (sample action item)',
  hearing_date: '2026-08-10',
  court_forum_display: 'Demo Commercial Court, Court 4',
};

const DEMO_NOTIFICATION = {
  id: 'deadbeef-0000-4000-8000-000000000008',
  type: 'HEARING_REMINDER',
  title: 'Sample notification (Product Review)',
  message: 'This is a synthetic notification shown for Product Review only — not a real alert.',
  read_at: null,
  created_at: '2026-07-01T00:00:00.000Z',
};

export const DEMO_DOCUMENT_ID = 'deadbeef-0000-4000-8000-000000000007';

const DEMO_DOCUMENT = {
  id: DEMO_DOCUMENT_ID,
  title: 'Sample Plaint (Demo Document)',
  document_type: 'PLAINT',
  version_count: 1,
  updated_at: '2026-06-01T00:00:00.000Z',
  created_at: '2026-06-01T00:00:00.000Z',
  matter_id: DEMO_MATTER_ID,
  case_id: null,
  // No storage_structure.content_type — this fixture has no real file
  // bytes behind it, so the Preview/Improve actions on the document detail
  // page correctly stay hidden (isPreviewEligible/isImproveEligible both
  // require a content_type) rather than offering a button that would fail.
  storage_structure: null,
  is_demo: true,
};

/**
 * Maps a request's pathname (+ query, for the matter_id-filtered routes)
 * to a static demo payload. Returns undefined for anything outside this
 * fixed, reserved set — every other path falls through to the real route
 * unchanged.
 */
export function matchProductReviewRoute(
  pathname: string,
  searchParams: URLSearchParams
): unknown {
  // Lets an unauthenticated page know whether Product Review Mode is
  // actually active — e.g. to swap "Authentication Required" wording for
  // the neutral "Function available after production activation" wording
  // on a real (non-demo) Matter ID. No real route backs this path; it
  // only ever answers from here, and only for the same no-session GET
  // case every other Product Review response uses.
  if (pathname === '/api/beta-status') {
    return { enabled: true };
  }

  if (pathname === '/api/matters') {
    // Honor the same ?status= filter the real route supports — otherwise
    // the demo Matter (status ACTIVE) would incorrectly still appear
    // under every other status tab (ON_HOLD, CLOSED, ...) on /matters.
    const statusFilter = searchParams.get('status');
    const matchesFilter = !statusFilter || statusFilter === 'ALL' || statusFilter === DEMO_MATTER.status;
    return {
      matters: matchesFilter
        ? [
            {
              id: DEMO_MATTER.id,
              title: DEMO_MATTER.title,
              matter_number: DEMO_MATTER.matter_number,
              engagement_type: DEMO_MATTER.engagement_type,
              practice_area: DEMO_MATTER.practice_area,
              status: DEMO_MATTER.status,
              client_id: null,
              client_name: DEMO_MATTER.client_name,
              opposing_party_name: DEMO_MATTER.opposing_party_name,
              court: DEMO_MATTER.court,
              created_at: DEMO_MATTER.created_at,
              is_demo: true,
            },
          ]
        : [],
      total: matchesFilter ? 1 : 0,
      limit: 50,
      offset: 0,
      review_mode: true,
    };
  }

  if (pathname === '/api/notifications') {
    return { notifications: [DEMO_NOTIFICATION], unread_count: 1, review_mode: true };
  }

  if (pathname === `/api/matters/${DEMO_MATTER_ID}`) {
    return { matter: DEMO_MATTER };
  }
  if (pathname === `/api/matters/${DEMO_MATTER_ID}/participants`) {
    return { participants: [DEMO_PARTICIPANT] };
  }
  if (pathname === `/api/matters/${DEMO_MATTER_ID}/court-notes`) {
    return { court_notes: [DEMO_COURT_NOTE] };
  }
  if (pathname === `/api/matters/${DEMO_MATTER_ID}/events`) {
    return { events: [DEMO_EVENT] };
  }
  if (pathname === `/api/matters/${DEMO_MATTER_ID}/tasks`) {
    return { tasks: [DEMO_TASK] };
  }
  if (pathname === `/api/matters/${DEMO_MATTER_ID}/health`) {
    return { health: DEMO_HEALTH };
  }
  if (pathname === `/api/matters/${DEMO_MATTER_ID}/preparation`) {
    return { preparation: [] };
  }
  if (pathname === '/api/cases' && searchParams.get('matter_id') === DEMO_MATTER_ID) {
    return { cases: [DEMO_PROCEEDING] };
  }
  if (pathname === '/api/documents' && searchParams.get('matter_id') === DEMO_MATTER_ID) {
    return { documents: [DEMO_DOCUMENT] };
  }
  if (pathname === `/api/documents/${DEMO_DOCUMENT_ID}`) {
    return { document: DEMO_DOCUMENT };
  }

  // Demo search — a separate, synthetic search path for unauthenticated
  // Product Review Mode visitors. The real Search Service (lib/search/
  // search-service.ts) is completely unchanged and still requires a real
  // session for every request; this only ever answers GET /api/search
  // when there is no session cookie at all (the same condition every
  // other Product Review response uses).
  if (pathname === '/api/search') {
    const query = searchParams.get('q') ?? '';
    const matterId = searchParams.get('matter_id');
    if (matterId === DEMO_MATTER_ID) {
      // Matter-scoped ("Search this Matter") — reuses the same demo
      // Proceeding / Document / Court Note fixtures already shown
      // elsewhere in the demo Matter Workspace, not the general legal
      // dataset below.
      const q = query.trim().toLowerCase();
      const proceedingMatches = q && DEMO_PROCEEDING.title.toLowerCase().includes(q);
      const documentMatches = q && DEMO_DOCUMENT.title.toLowerCase().includes(q);
      const courtNoteMatches = q && DEMO_COURT_NOTE.note.toLowerCase().includes(q);
      return {
        query,
        review_mode: true,
        groups: [
          {
            type: 'PROCEEDING',
            providerName: 'DemoProceedingProvider',
            items: proceedingMatches
              ? [{ id: DEMO_PROCEEDING.id, title: DEMO_PROCEEDING.title, snippet: `${DEMO_PROCEEDING.case_number} · ${DEMO_PROCEEDING.court}`, score: 1, href: `/cases/${DEMO_PROCEEDING.id}`, is_demo: true }]
              : [],
          },
          {
            type: 'DOCUMENT',
            providerName: 'DemoDocumentProvider',
            items: documentMatches
              ? [{ id: DEMO_DOCUMENT.id, title: DEMO_DOCUMENT.title, snippet: 'PLAINT · v1', score: 1, href: `/documents/${DEMO_DOCUMENT.id}`, is_demo: true }]
              : [],
          },
          {
            type: 'COURT_NOTE',
            providerName: 'DemoCourtNoteProvider',
            items: courtNoteMatches
              ? [{ id: DEMO_COURT_NOTE.id, title: DEMO_COURT_NOTE.case_title, snippet: DEMO_COURT_NOTE.note, score: 1, href: '', is_demo: true }]
              : [],
          },
        ],
      };
    }
    // General legal-research search (landing page, dashboard, or /search
    // with no matter_id) — the small synthetic Judgments / Acts /
    // Sections / Citations dataset, plus the same demo Document reused
    // above so "Documents" appears here too.
    const q = query.trim().toLowerCase();
    const documentMatches = q && DEMO_DOCUMENT.title.toLowerCase().includes(q);
    return {
      query,
      review_mode: true,
      groups: [
        ...searchDemoLegalDataset(query),
        {
          type: 'DOCUMENT',
          providerName: 'DemoDocumentProvider',
          items: documentMatches
            ? [{ id: DEMO_DOCUMENT.id, title: DEMO_DOCUMENT.title, snippet: 'PLAINT · v1', score: 1, href: `/documents/${DEMO_DOCUMENT.id}`, is_demo: true }]
            : [],
        },
      ],
    };
  }

  if (pathname.startsWith('/api/search/demo/')) {
    const id = pathname.slice('/api/search/demo/'.length);
    const item = findDemoSearchItem(id);
    return item ? { result: item } : undefined;
  }

  return undefined;
}
