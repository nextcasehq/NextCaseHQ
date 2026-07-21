'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface LegalSearchResultItem {
  id: string;
  title: string;
  snippet: string;
  href: string;
  is_demo?: boolean;
  court?: string;
  citation?: string;
  decision_date?: string;
  legal_issue?: string;
  type: 'JUDGMENT' | 'ACT' | 'SECTION' | 'CITATION';
}

interface MatterOption {
  id: string;
  title: string;
}

const TYPE_LABELS: Record<string, string> = {
  JUDGMENT: 'Judgment',
  ACT: 'Act',
  SECTION: 'Section',
  CITATION: 'Citation',
};

const INTENDED_USE_OPTIONS = ['Arguments', 'Pleadings', 'Evidence-related legal issue', 'Legal research', 'General reference'];

const SAVED_CITATIONS_KEY = 'nchq-dashboard-saved-citations-v1';

function formatDecisionDate(value: string | undefined): string {
  if (!value) return 'Not available';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface LegalSearchWorkspaceProps {
  initialQuery: string;
  onNotice: (message: string) => void;
}

/**
 * The dashboard's Legal Search workspace — reuses the real, existing
 * GET /api/search endpoint (the same one /search/page.tsx calls), filtered
 * to its four legal-authority group types (JUDGMENT/ACT/SECTION/CITATION).
 * The real Search Service never actually produces those types for an
 * authenticated session (see lib/search/search-service.ts) — they only
 * ever come from the Product Review Mode demo-data interceptor
 * (lib/beta/demo-search-data.ts), which real sessions always bypass. So a
 * real, logged-in advocate genuinely searching here will correctly see an
 * honest "not yet connected" state; only an unauthenticated Product Review
 * visit shows the clearly-labelled synthetic Judgments/Acts/Sections/
 * Citations. This is intentional — no fabricated legal-database content is
 * ever shown to a real session.
 */
export default function LegalSearchWorkspace({ initialQuery, onNotice }: LegalSearchWorkspaceProps) {
  const [query, setQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'JUDGMENT' | 'ACT' | 'SECTION' | 'CITATION'>('ALL');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [results, setResults] = useState<LegalSearchResultItem[]>([]);
  const [savedCitations, setSavedCitations] = useState<Set<string>>(new Set());
  const [addToRegisterItem, setAddToRegisterItem] = useState<LegalSearchResultItem | null>(null);
  const [matters, setMatters] = useState<MatterOption[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SAVED_CITATIONS_KEY);
      if (raw) setSavedCitations(new Set(JSON.parse(raw)));
    } catch {
      // Ignore — starts with nothing saved.
    }
  }, []);

  useEffect(() => {
    fetch('/api/matters?limit=20')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setMatters(data?.matters ?? []))
      .catch(() => setMatters([]));
  }, []);

  const persistSaved = (next: Set<string>) => {
    setSavedCitations(next);
    try {
      sessionStorage.setItem(SAVED_CITATIONS_KEY, JSON.stringify(Array.from(next)));
    } catch {
      // Best-effort only.
    }
  };

  const runSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setHasSearched(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?${new URLSearchParams({ q }).toString()}`);
      if (res.status === 401) {
        setNeedsAuth(true);
        return;
      }
      if (!res.ok) {
        setError('Legal search failed. Please try again.');
        return;
      }
      const data = await res.json();
      const legalTypes = new Set(['JUDGMENT', 'ACT', 'SECTION', 'CITATION']);
      const flattened: LegalSearchResultItem[] = (data.groups || [])
        .filter((g: { type: string }) => legalTypes.has(g.type))
        .flatMap((g: { type: string; items: Omit<LegalSearchResultItem, 'type'>[] }) =>
          g.items.map((item) => ({ ...item, type: g.type as LegalSearchResultItem['type'] }))
        );
      setResults(flattened);
    } catch {
      setError('Legal search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery.trim()) runSearch(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runSearch(query);
  };

  const toggleSaveCitation = (item: LegalSearchResultItem) => {
    const next = new Set(savedCitations);
    if (next.has(item.id)) {
      next.delete(item.id);
    } else {
      next.add(item.id);
    }
    persistSaved(next);
  };

  const filteredResults = typeFilter === 'ALL' ? results : results.filter((r) => r.type === typeFilter);

  return (
    <div className="bg-white border border-[#E7DFC9]/80 rounded-2xl p-5 md:p-6 space-y-5">
      <div>
        <h2 className="text-sm font-black uppercase tracking-widest text-[#111111]">Legal Search</h2>
        <p className="text-[10px] text-[#8A7A56] mt-1">Search judgments, acts, sections, and citations, and save authorities to a Matter Register.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Judgments & Citations..."
          aria-label="Search Judgments & Citations"
          className="flex-1 min-w-0 px-4 py-3 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="px-3 py-3 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-bold uppercase tracking-wide text-[#5C5340]"
        >
          <option value="ALL">All Types</option>
          <option value="JUDGMENT">Judgments</option>
          <option value="ACT">Acts</option>
          <option value="SECTION">Sections</option>
          <option value="CITATION">Citations</option>
        </select>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-5 py-3 bg-[#8A6D2F] hover:bg-[#6F5624] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {needsAuth && (
        <div className="text-center py-10">
          <span className="text-2xl">🔒</span>
          <p className="text-xs font-bold text-[#4A4130] mt-2">Sign in to use Legal Search.</p>
        </div>
      )}

      {!needsAuth && error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700">{error}</div>
      )}

      {!needsAuth && loading && (
        <div className="flex justify-center py-12">
          <span className="w-7 h-7 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
        </div>
      )}

      {!needsAuth && !loading && hasSearched && !error && filteredResults.length === 0 && (
        <div className="text-center py-10 bg-[#FBF8F1] border border-[#E7DFC9] rounded-xl">
          <p className="text-xs font-semibold text-[#8A7A56]">
            No legal-authority results. Legal-authority search is only connected to a synthetic illustration dataset in
            this environment (Product Review Mode) — a real, signed-in session has no live citation database wired up
            yet.
          </p>
        </div>
      )}

      {!needsAuth && !hasSearched && !loading && (
        <div className="text-center py-10 text-xs text-[#B0A588]">
          Search above to find judgments, acts, sections, and citations.
        </div>
      )}

      {!needsAuth && !loading && filteredResults.length > 0 && (
        <div className="space-y-3">
          {filteredResults.map((item) => (
            <div key={item.id} className="border border-[#E7DFC9]/80 rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#8A6D2F] bg-[#FBF6EA] px-1.5 py-0.5 rounded">
                    {TYPE_LABELS[item.type] ?? item.type}
                  </span>
                  <p className="text-sm font-bold text-[#111111] mt-1">{item.title}</p>
                </div>
                {item.is_demo ? (
                  <span className="flex-none text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
                    ⚠ Simulated — Not a Verified Judgment
                  </span>
                ) : (
                  <span className="flex-none text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#F4EEE0] text-[#5C5340] border border-[#E7DFC9]">
                    Unverified — Requires Advocate Verification
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-1.5 text-[10px]">
                <div>
                  <p className="font-bold uppercase tracking-wider text-[#8A7A56]">Court</p>
                  <p className="text-[#3A3222] font-semibold">{item.court || 'Not available'}</p>
                </div>
                <div>
                  <p className="font-bold uppercase tracking-wider text-[#8A7A56]">Citation</p>
                  <p className="text-[#3A3222] font-semibold">{item.citation || (item.type === 'CITATION' ? item.title : 'Not available')}</p>
                </div>
                <div>
                  <p className="font-bold uppercase tracking-wider text-[#8A7A56]">Decision Date</p>
                  <p className="text-[#3A3222] font-semibold">{formatDecisionDate(item.decision_date)}</p>
                </div>
                <div>
                  <p className="font-bold uppercase tracking-wider text-[#8A7A56]">Source</p>
                  <p className="text-[#3A3222] font-semibold">{item.is_demo ? 'Product Review demo data' : 'Search index'}</p>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#8A7A56]">Legal Issue / Proposition</p>
                <p className="text-xs text-[#3A3222]">{item.legal_issue || 'Not available'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#8A7A56]">Relevance Summary</p>
                <p className="text-xs text-[#4A4130]">{item.snippet}</p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-[#F4EEE0]">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-[#E7DFC9] rounded-lg text-[#8A6D2F] hover:bg-[#FBF8F1] transition-all"
                  >
                    View Judgment
                  </Link>
                ) : null}
                <button
                  onClick={() => toggleSaveCitation(item)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border rounded-lg transition-all ${
                    savedCitations.has(item.id)
                      ? 'bg-[#8A6D2F] border-[#8A6D2F] text-white'
                      : 'border-[#E7DFC9] text-[#8A6D2F] hover:bg-[#FBF8F1]'
                  }`}
                >
                  {savedCitations.has(item.id) ? 'Saved ✓' : 'Save Citation'}
                </button>
                <button
                  onClick={() => setAddToRegisterItem(item)}
                  className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-[#8A6D2F] hover:bg-[#6F5624] text-white rounded-lg transition-all"
                >
                  Add to Matter Register
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {addToRegisterItem && (
        <AddToMatterRegisterModal
          item={addToRegisterItem}
          matters={matters}
          onCancel={() => setAddToRegisterItem(null)}
          onConfirm={(matterTitle) => {
            setAddToRegisterItem(null);
            onNotice(
              `Saved "${addToRegisterItem.title}" to Research / Authorities under "${matterTitle}" (prototype only — not persisted to a database).`
            );
          }}
        />
      )}
    </div>
  );
}

interface AddToMatterRegisterModalProps {
  item: LegalSearchResultItem;
  matters: MatterOption[];
  onCancel: () => void;
  onConfirm: (matterTitle: string) => void;
}

function AddToMatterRegisterModal({ item, matters, onCancel, onConfirm }: AddToMatterRegisterModalProps) {
  const [matterId, setMatterId] = useState('');
  const [intendedUse, setIntendedUse] = useState('');
  const [note, setNote] = useState('');
  const [linkTo, setLinkTo] = useState('');

  const canConfirm = matterId !== '' && intendedUse !== '';

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const matter = matters.find((m) => m.id === matterId);
    if (!matter) return;
    onConfirm(matter.title);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#111111]">Add to Matter Register</h3>
          <p className="text-xs text-[#8A7A56] mt-1">
            <strong>{item.title}</strong> will be saved under the Matter Register&apos;s Research / Authorities section. This is a
            legal authority, not factual evidence — it supports a proposition, argument, or admissibility question.
          </p>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Matter Register *</label>
            <select
              required
              value={matterId}
              onChange={(e) => setMatterId(e.target.value)}
              className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
            >
              <option value="">Select a Matter Register...</option>
              {matters.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">How will this authority be used? *</label>
            <select
              required
              value={intendedUse}
              onChange={(e) => setIntendedUse(e.target.value)}
              className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
            >
              <option value="">Select intended use...</option>
              {INTENDED_USE_OPTIONS.map((use) => (
                <option key={use} value={use}>
                  {use}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">
              Link to argument, issue, document, or evidence question (optional)
            </label>
            <input
              type="text"
              value={linkTo}
              onChange={(e) => setLinkTo(e.target.value)}
              placeholder="e.g. Issue 2 — limitation, or the reply affidavit"
              className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Advocate Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-bold uppercase border border-[#E7DFC9] text-[#8A7A56] rounded-lg hover:bg-[#FBF8F1] transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canConfirm}
              className="px-5 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase rounded-lg shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
