/**
 * Product Review Mode's demo search dataset — a small, entirely synthetic
 * set of Judgments, Acts, Sections, and Citations, used only by the
 * search-service shortcut in demo-data.ts's matchProductReviewRoute() for
 * GET /api/search when there is no session cookie at all. Never touches
 * the database, never reads a real tenant's documents, and is completely
 * separate from the real Search Service (lib/search/search-service.ts),
 * which is unchanged and still requires a real session for every request.
 */

export interface DemoSearchItem {
  id: string;
  type: 'JUDGMENT' | 'ACT' | 'SECTION' | 'CITATION';
  title: string;
  snippet: string;
  body: string;
}

const DEMO_JUDGMENTS: DemoSearchItem[] = [
  {
    id: 'demo-judgment-0001',
    type: 'JUDGMENT',
    title: 'Acme Textiles Pvt. Ltd. v. R96 Global Traders (Demo Judgment)',
    snippet: 'Demo Commercial Court — sample judgment summary on breach of contract and discovery timelines.',
    body:
      'This is a sample, entirely fictional judgment summary provided for Product Review demonstration only. ' +
      'It illustrates how a judgment result would appear in search — no real court record, party, or case is ' +
      'described here. The demo matter this judgment references, and the demo court note and hearing dates ' +
      'attached to it, are the same synthetic sample data shown throughout Product Review.',
  },
  {
    id: 'demo-judgment-0002',
    type: 'JUDGMENT',
    title: 'Sharma Exports v. National Logistics Co. (Demo Judgment)',
    snippet: 'Sample appellate judgment on limitation and enforcement of an arbitral award.',
    body:
      'This is a sample, entirely fictional judgment summary provided for Product Review demonstration only. ' +
      'It illustrates an appellate-stage result on limitation and arbitral award enforcement — no real ' +
      'court record, party, or case is described here.',
  },
];

const DEMO_ACTS: DemoSearchItem[] = [
  {
    id: 'demo-act-0001',
    type: 'ACT',
    title: 'The Indian Contract Act, 1872 (Demo Reference)',
    snippet: 'Sample statute reference entry for contract law fundamentals.',
    body:
      'This is a sample statute reference entry provided for Product Review demonstration only, illustrating ' +
      'how an Act would appear in search results and its own read-only reference page.',
  },
  {
    id: 'demo-act-0002',
    type: 'ACT',
    title: 'The Arbitration and Conciliation Act, 1996 (Demo Reference)',
    snippet: 'Sample statute reference entry for arbitration procedure.',
    body:
      'This is a sample statute reference entry provided for Product Review demonstration only, illustrating ' +
      'how an Act would appear in search results and its own read-only reference page.',
  },
];

const DEMO_SECTIONS: DemoSearchItem[] = [
  {
    id: 'demo-section-0001',
    type: 'SECTION',
    title: 'Section 73 — Compensation for Loss or Damage (Demo Reference)',
    snippet: 'Indian Contract Act, 1872 — sample section reference on breach-of-contract compensation.',
    body:
      'This is a sample section reference entry provided for Product Review demonstration only, illustrating ' +
      'how a Section would appear in search results — not the actual text of any real statute.',
  },
  {
    id: 'demo-section-0002',
    type: 'SECTION',
    title: 'Section 34 — Application for Setting Aside an Arbitral Award (Demo Reference)',
    snippet: 'Arbitration and Conciliation Act, 1996 — sample section reference on challenging an award.',
    body:
      'This is a sample section reference entry provided for Product Review demonstration only, illustrating ' +
      'how a Section would appear in search results — not the actual text of any real statute.',
  },
];

const DEMO_CITATIONS: DemoSearchItem[] = [
  {
    id: 'demo-citation-0001',
    type: 'CITATION',
    title: '(2019) 4 SCC 1 (Demo Citation)',
    snippet: 'Sample citation entry provided for Product Review demonstration only.',
    body: 'This is a sample citation reference provided for Product Review demonstration only — not a real reported case.',
  },
  {
    id: 'demo-citation-0002',
    type: 'CITATION',
    title: 'AIR 2021 SC 123 (Demo Citation)',
    snippet: 'Sample citation entry provided for Product Review demonstration only.',
    body: 'This is a sample citation reference provided for Product Review demonstration only — not a real reported case.',
  },
];

const ALL_DEMO_SEARCH_ITEMS: DemoSearchItem[] = [
  ...DEMO_JUDGMENTS,
  ...DEMO_ACTS,
  ...DEMO_SECTIONS,
  ...DEMO_CITATIONS,
];

function matches(item: DemoSearchItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return (
    item.title.toLowerCase().includes(q) ||
    item.snippet.toLowerCase().includes(q) ||
    item.body.toLowerCase().includes(q)
  );
}

function toResultItem(item: DemoSearchItem) {
  return {
    id: item.id,
    title: item.title,
    snippet: item.snippet,
    score: 1,
    href: `/search/demo/${item.id}`,
    is_demo: true,
  };
}

/**
 * Case-insensitive substring match across the synthetic Judgments / Acts /
 * Sections / Citations dataset — deliberately simple (no similarity
 * ranking, no database) since this exists only to give Product Review
 * visitors something real to click through, not to demonstrate search
 * relevance quality.
 */
export function searchDemoLegalDataset(query: string) {
  const groupFor = (type: DemoSearchItem['type'], items: DemoSearchItem[]) => ({
    type,
    providerName: `Demo${type.charAt(0)}${type.slice(1).toLowerCase()}Provider`,
    items: items.filter((item) => matches(item, query)).map(toResultItem),
  });

  return [
    groupFor('JUDGMENT', DEMO_JUDGMENTS),
    groupFor('ACT', DEMO_ACTS),
    groupFor('SECTION', DEMO_SECTIONS),
    groupFor('CITATION', DEMO_CITATIONS),
  ];
}

export function findDemoSearchItem(id: string): DemoSearchItem | undefined {
  return ALL_DEMO_SEARCH_ITEMS.find((item) => item.id === id);
}
