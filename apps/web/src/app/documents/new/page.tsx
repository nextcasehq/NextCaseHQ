'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_FACT_FIELDS,
  documentTypesByCategory,
  type DocumentCategory,
} from '@/lib/domain/document-type';

interface MatterOption {
  id: string;
  title: string;
  matter_number: string | null;
}

type Step = 'CATEGORY' | 'TYPE' | 'MATTER' | 'FACTS' | 'REVIEW';

const STEP_ORDER: Step[] = ['CATEGORY', 'TYPE', 'MATTER', 'FACTS', 'REVIEW'];

/**
 * Progressive drafting flow (Milestone 4, Prepare Document): Category →
 * Document Type → Matter Association (optional) → Progressive Facts →
 * Generate Draft → Review → Save Draft. Deliberately category-scoped facts
 * (DOCUMENT_FACT_FIELDS), not one universal legal questionnaire and not 15
 * bespoke per-type forms.
 *
 * Generate and Save are two independent actions against two independent
 * endpoints — POST /api/ai/draft never persists anything; Save Draft
 * submits the reviewed text through the exact same
 * POST /api/documents/upload endpoint every real file upload already uses,
 * so generation and persistence stay fully separate.
 */
function PrepareNewDocumentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetMatterId = searchParams.get('matter_id');

  const [needsAuth, setNeedsAuth] = useState(false);
  // Only ever set true by a successful, unauthenticated GET
  // /api/beta-status — a real, signed-in session always gets a 404 for
  // this path, so this can't be spoofed into showing for a real tenant.
  // Governs both the guard on Generate/Save below and the neutral wording
  // on the needsAuth wall (a defense-in-depth backstop in case this
  // hasn't resolved yet when a write is attempted).
  const [betaModeActive, setBetaModeActive] = useState(false);
  const [showPreviewPrompt, setShowPreviewPrompt] = useState(false);
  const [step, setStep] = useState<Step>('CATEGORY');
  const [category, setCategory] = useState<DocumentCategory | null>(null);
  const [documentTypeSlug, setDocumentTypeSlug] = useState<string | null>(null);
  const [matterId, setMatterId] = useState<string | null>(presetMatterId);
  const [matters, setMatters] = useState<MatterOption[]>([]);
  const [facts, setFacts] = useState<Record<string, string>>({});
  const [draftContent, setDraftContent] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/matters?limit=100')
      .then((res) => {
        if (res.status === 401) {
          setNeedsAuth(true);
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data) => {
        if (data) setMatters(data.matters);
      });
    fetch('/api/beta-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.enabled) setBetaModeActive(true);
      })
      .catch(() => {});
  }, []);

  const goTo = (target: Step) => {
    setError(null);
    setStep(target);
  };

  const stepIndex = STEP_ORDER.indexOf(step);

  const handleGenerate = async () => {
    if (!category || !documentTypeSlug) return;
    // Beta Preview is read-only — draft generation is a private AI action,
    // so it gets an inline prompt instead of ever attempting the real
    // (still fully protected) request, and without losing the visitor's
    // in-progress Category/Type/Matter/Facts selections.
    if (betaModeActive) {
      setShowPreviewPrompt(true);
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type: documentTypeSlug,
          category,
          matter_id: matterId || undefined,
          facts,
          mode: 'CREATE',
        }),
      });
      if (res.status === 401) {
        setNeedsAuth(true);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || 'Draft generation failed. Please try again.');
        return;
      }
      const data = await res.json();
      setDraftContent(data.content);
      goTo('REVIEW');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!draftContent || !documentTypeSlug) return;
    // Same Beta Preview guard as Generate — saving is a write action.
    if (betaModeActive) {
      setShowPreviewPrompt(true);
      return;
    }
    const typeDef = documentTypesByCategory(category!).find((t) => t.slug === documentTypeSlug);
    const fileName = `${(typeDef?.label || 'Document').replace(/\s+/g, '_')}.txt`;
    setSaving(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        'x-tenant-key-version': 'v1',
        'x-file-name': fileName,
        'x-document-type': documentTypeSlug,
      };
      if (matterId) headers['x-matter-id'] = matterId;
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers,
        body: draftContent,
      });
      if (res.status === 401) {
        setNeedsAuth(true);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message || 'Saving the draft failed. Please try again.');
        return;
      }
      const data = await res.json();
      router.push(`/documents/${data.id}`);
    } finally {
      setSaving(false);
    }
  };

  if (needsAuth) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        {betaModeActive ? (
          <>
            <span className="text-3xl">👁️</span>
            <h3 className="text-base font-bold text-[#4A4130] mt-3">Preview Mode</h3>
            <p className="text-xs text-[#B0A588] mt-1 max-w-sm mx-auto">This action is unavailable in preview mode.</p>
          </>
        ) : (
          <>
            <span className="text-3xl">🔒</span>
            <h3 className="text-base font-bold text-[#4A4130] mt-3">Authentication Required</h3>
            <p className="text-xs text-[#B0A588] mt-1 max-w-sm mx-auto">Sign in to prepare a document.</p>
            <Link href="/login" className="inline-block mt-4 text-xs font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">
              Go to Login →
            </Link>
          </>
        )}
      </div>
    );
  }

  return (
    <article>
      <header className="mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#111111]">Prepare New Document</h1>
          {betaModeActive && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C6A253]/40 bg-[#FBF6EA] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#8A6D2F]">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C6A253]" aria-hidden="true" />
              Beta Preview
            </span>
          )}
        </div>
        <p className="text-xs text-[#B0A588] font-bold uppercase tracking-wider mt-1">
          Step {stepIndex + 1} of {STEP_ORDER.length}
        </p>
      </header>

      {showPreviewPrompt && (
        <div className="mb-4 p-4 bg-[#FBF6EA] border border-[#C6A253]/40 rounded-xl flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs font-semibold text-[#5C5340]">
            Generating and saving documents is available after beta.
          </p>
          <button
            onClick={() => setShowPreviewPrompt(false)}
            className="text-xs font-bold text-[#B0A588] hover:text-[#8A7A56]"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700">{error}</div>
      )}

      {step === 'CATEGORY' && (
        <section className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-4">Category</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {DOCUMENT_CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setCategory(c);
                  setDocumentTypeSlug(null);
                  setFacts({});
                  goTo('TYPE');
                }}
                className={`px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wider border transition-all ${
                  category === c
                    ? 'bg-[#8A6D2F] text-white border-[#8A6D2F]'
                    : 'bg-white text-[#3A3222] border-[#E7DFC9] hover:border-[#8A6D2F]'
                }`}
              >
                {DOCUMENT_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 'TYPE' && category && (
        <section className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-4">Document Type</h2>
          <div className="space-y-2">
            {documentTypesByCategory(category).map((t) => (
              <button
                key={t.slug}
                onClick={() => {
                  setDocumentTypeSlug(t.slug);
                  goTo('MATTER');
                }}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold border transition-all ${
                  documentTypeSlug === t.slug
                    ? 'bg-[#FBF6EA] text-[#8A6D2F] border-[#8A6D2F]'
                    : 'bg-white text-[#3A3222] border-[#E7DFC9] hover:border-[#8A6D2F]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={() => goTo('CATEGORY')} className="mt-4 text-xs font-bold uppercase tracking-wider text-[#B0A588] hover:text-[#8A6D2F]">
            ← Back
          </button>
        </section>
      )}

      {step === 'MATTER' && (
        <section className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-4">Matter Association (optional)</h2>
          <select
            value={matterId ?? ''}
            onChange={(e) => setMatterId(e.target.value || null)}
            className="w-full px-3 py-2 bg-white border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium"
          >
            <option value="">No Matter</option>
            {matters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.matter_number ? `${m.matter_number} — ` : ''}
                {m.title}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-4 mt-4">
            <button onClick={() => goTo('TYPE')} className="text-xs font-bold uppercase tracking-wider text-[#B0A588] hover:text-[#8A6D2F]">
              ← Back
            </button>
            <button
              onClick={() => goTo('FACTS')}
              className="px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
            >
              Continue
            </button>
          </div>
        </section>
      )}

      {step === 'FACTS' && category && (
        <section className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-4">Facts</h2>
          <div className="space-y-4">
            {DOCUMENT_FACT_FIELDS[category].map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#8A7A56] mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={facts[field.key] ?? ''}
                    onChange={(e) => setFacts((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm"
                  />
                ) : (
                  <input
                    type="text"
                    value={facts[field.key] ?? ''}
                    onChange={(e) => setFacts((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-6">
            <button onClick={() => goTo('MATTER')} className="text-xs font-bold uppercase tracking-wider text-[#B0A588] hover:text-[#8A6D2F]">
              ← Back
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || DOCUMENT_FACT_FIELDS[category].some((f) => f.required && !facts[f.key]?.trim())}
              className="px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
            >
              {generating ? 'Generating…' : 'Generate Draft'}
            </button>
          </div>
        </section>
      )}

      {step === 'REVIEW' && draftContent !== null && (
        <section className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-4">Review</h2>
          <p className="text-[10px] text-[#B0A588] mb-2">AI-generated first draft — review and edit before saving. Nothing is saved yet.</p>
          <textarea
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            rows={18}
            className="w-full px-3 py-3 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-mono"
          />
          <div className="flex items-center gap-3 mt-4">
            <button onClick={() => goTo('FACTS')} className="text-xs font-bold uppercase tracking-wider text-[#B0A588] hover:text-[#8A6D2F]">
              ← Edit Facts
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 bg-white border border-[#8A6D2F] text-[#8A6D2F] hover:bg-[#FBF6EA] disabled:opacity-50 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
            >
              {generating ? 'Regenerating…' : 'Regenerate'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !draftContent.trim()}
              className="px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
            >
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
          </div>
        </section>
      )}
    </article>
  );
}

export default function PrepareNewDocumentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex justify-center items-center py-20">
          <span className="w-8 h-8 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
        </div>
      }
    >
      <PrepareNewDocumentForm />
    </Suspense>
  );
}
