'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getDocumentType } from '@/lib/domain/document-type';

interface DocumentDetail {
  id: string;
  title: string;
  case_id: string | null;
  matter_id: string | null;
  storage_structure: { content_type?: string } | null;
  document_type: string | null;
  version_count: number;
  updated_at: string;
  created_at: string;
}

interface DocumentVersion {
  id: string;
  version_number: number;
  title: string;
  created_at: string;
}

const PREVIEW_ELIGIBLE = new Set(['image/jpeg', 'image/png', 'application/pdf', 'text/plain']);

export default function DocumentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [needsAuth, setNeedsAuth] = useState(false);
  // Named `doc`, not `document` — this is a client component and the
  // global DOM `document` object must stay reachable if ever needed.
  const [doc, setDoc] = useState<DocumentDetail | null | undefined>(undefined);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [improving, setImproving] = useState(false);
  const [improveInstruction, setImproveInstruction] = useState('');
  const [improvedContent, setImprovedContent] = useState<string | null>(null);
  const [improveError, setImproveError] = useState<string | null>(null);
  const [savingImproved, setSavingImproved] = useState(false);

  const fetchDocument = useCallback(async () => {
    const res = await fetch(`/api/documents/${id}`);
    if (res.status === 401) {
      setNeedsAuth(true);
      return;
    }
    if (!res.ok) {
      setDoc(null);
      return;
    }
    const data = await res.json();
    setDoc(data.document);
  }, [id]);

  const fetchVersions = useCallback(async () => {
    const res = await fetch(`/api/documents/${id}/versions`);
    if (!res.ok) return;
    const data = await res.json();
    setVersions(data.versions);
  }, [id]);

  useEffect(() => {
    fetchDocument();
    fetchVersions();
  }, [fetchDocument, fetchVersions]);

  const handleUploadVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const bytes = await file.arrayBuffer();
      const res = await fetch(`/api/documents/${id}/versions`, {
        method: 'POST',
        headers: { 'x-file-name': file.name },
        body: bytes,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setUploadError(body.message || 'Uploading the new version failed.');
        return;
      }
      await Promise.all([fetchDocument(), fetchVersions()]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImprove = async () => {
    if (!doc?.document_type) return;
    const typeDef = getDocumentType(doc.document_type);
    if (!typeDef) return;
    setImproving(true);
    setImproveError(null);
    try {
      const previewRes = await fetch(`/api/documents/${id}/preview`);
      if (!previewRes.ok) {
        setImproveError('Could not read the current document content.');
        return;
      }
      const existingContent = await previewRes.text();

      const draftRes = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type: typeDef.slug,
          category: typeDef.category,
          matter_id: doc.matter_id || undefined,
          facts: {},
          mode: 'IMPROVE',
          existing_content: existingContent,
          improve_instruction: improveInstruction || undefined,
        }),
      });
      if (draftRes.status === 401) {
        setNeedsAuth(true);
        return;
      }
      if (!draftRes.ok) {
        const body = await draftRes.json().catch(() => ({}));
        setImproveError(body.message || 'Improving the draft failed.');
        return;
      }
      const data = await draftRes.json();
      setImprovedContent(data.content);
    } finally {
      setImproving(false);
    }
  };

  const handleSaveImproved = async () => {
    if (!improvedContent || !doc) return;
    setSavingImproved(true);
    setImproveError(null);
    try {
      const res = await fetch(`/api/documents/${id}/versions`, {
        method: 'POST',
        headers: { 'x-file-name': doc.title.endsWith('.txt') ? doc.title : `${doc.title}.txt` },
        body: improvedContent,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setImproveError(body.message || 'Saving the improved version failed.');
        return;
      }
      setImprovedContent(null);
      setImproveInstruction('');
      await Promise.all([fetchDocument(), fetchVersions()]);
    } finally {
      setSavingImproved(false);
    }
  };

  if (needsAuth) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-3xl">🔒</span>
        <h3 className="text-base font-bold text-[#4A4130] mt-3">Authentication Required</h3>
        <p className="text-xs text-[#B0A588] mt-1 max-w-sm mx-auto">Sign in to view this document.</p>
        <Link href="/login" className="inline-block mt-4 text-xs font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">
          Go to Login →
        </Link>
      </div>
    );
  }

  if (doc === null) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-3xl">⚠️</span>
        <h2 className="text-lg font-bold mt-2">Document Not Found</h2>
        <p className="text-xs text-[#B0A588] mt-1">This document does not exist or you don&apos;t have access to it.</p>
      </div>
    );
  }

  if (doc === undefined) {
    return (
      <div className="flex-1 flex justify-center items-center py-20">
        <span className="w-8 h-8 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  const typeDef = getDocumentType(doc.document_type);
  const contentType = doc.storage_structure?.content_type ?? null;
  const isPreviewEligible = !!contentType && PREVIEW_ELIGIBLE.has(contentType);
  const isImproveEligible = contentType === 'text/plain' && !!doc.document_type;

  return (
    <article>
      <header className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-[10px] font-bold text-[#8A6D2F] bg-[#FBF6EA] px-2 py-0.5 rounded uppercase tracking-wider">
            {typeDef?.label ?? 'Uploaded Document'}
          </span>
          <span className="text-[10px] font-mono text-[#B0A588]">v{doc.version_count || 1}</span>
        </div>
        <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#111111]">{doc.title}</h1>
        {doc.matter_id && (
          <p className="text-xs text-[#B0A588] font-bold uppercase tracking-wider mt-1">
            MATTER: <Link href={`/matters/${doc.matter_id}`} className="text-[#8A6D2F] font-sans hover:underline">Open Matter →</Link>
          </p>
        )}
        <p className="text-[10px] text-[#B0A588] mt-1">Updated {new Date(doc.updated_at).toLocaleDateString()}</p>

        <div className="flex flex-wrap items-center gap-3 mt-4">
          <a
            href={`/api/documents/${id}/download`}
            className="px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
          >
            Download
          </a>
          {isPreviewEligible && (
            <a
              href={`/api/documents/${id}/preview`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-white border border-[#E7DFC9] text-[#3A3222] hover:border-[#8A6D2F] text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
            >
              Preview
            </a>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-white border border-[#E7DFC9] text-[#3A3222] hover:border-[#8A6D2F] disabled:opacity-50 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
          >
            {uploading ? 'Uploading…' : 'Upload New Version'}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleUploadVersion} />
          {isImproveEligible && (
            <button
              onClick={handleImprove}
              disabled={improving}
              className="px-4 py-2 bg-white border border-[#8A6D2F] text-[#8A6D2F] hover:bg-[#FBF6EA] disabled:opacity-50 text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
            >
              {improving ? 'Improving…' : 'Improve Draft (AI)'}
            </button>
          )}
        </div>
        {uploadError && <p className="text-xs font-semibold text-red-700 mt-2">{uploadError}</p>}
      </header>

      {isImproveEligible && (improving || improvedContent !== null) && (
        <section className="bg-white border border-[#8A6D2F]/40 rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#8A6D2F] mb-3">Improve Draft (AI)</h2>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#8A7A56] mb-1">Revision Instruction</label>
          <input
            type="text"
            value={improveInstruction}
            onChange={(e) => setImproveInstruction(e.target.value)}
            placeholder="e.g. Add a paragraph on limitation, tighten the reliefs sought"
            className="w-full px-3 py-2 bg-white border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm mb-3"
          />
          <button
            onClick={handleImprove}
            disabled={improving}
            className="px-4 py-2 bg-white border border-[#8A6D2F] text-[#8A6D2F] hover:bg-[#FBF6EA] disabled:opacity-50 text-xs font-bold uppercase tracking-wider rounded-lg transition-all mb-3"
          >
            {improving ? 'Generating…' : 'Regenerate'}
          </button>
          {improveError && <p className="text-xs font-semibold text-red-700 mb-2">{improveError}</p>}
          {improvedContent !== null && (
            <>
              <p className="text-[10px] text-[#B0A588] mb-2">AI-revised draft — review and edit before saving as a new version.</p>
              <textarea
                value={improvedContent}
                onChange={(e) => setImprovedContent(e.target.value)}
                rows={16}
                className="w-full px-3 py-3 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-mono"
              />
              <button
                onClick={handleSaveImproved}
                disabled={savingImproved || !improvedContent.trim()}
                className="mt-3 px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
              >
                {savingImproved ? 'Saving…' : 'Save as New Version'}
              </button>
            </>
          )}
        </section>
      )}

      <section className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-4">Version History</h2>
        {versions.length > 0 ? (
          <ol className="space-y-2">
            {versions.map((v, i) => (
              <li key={v.id} className="flex items-center justify-between border-b border-[#F4EEE0] pb-2 last:border-0 last:pb-0">
                <span className="text-sm font-bold text-[#3A3222]">
                  v{v.version_number} {i === 0 && <span className="text-[10px] font-bold text-[#8A6D2F] uppercase ml-1">current</span>}
                </span>
                <span className="text-[10px] font-mono text-[#B0A588]">{new Date(v.created_at).toLocaleDateString()}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-[#8A7A56] text-center py-4">No version history yet.</p>
        )}
      </section>
    </article>
  );
}
