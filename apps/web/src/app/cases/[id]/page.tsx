'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AuthOrReviewGate } from '@/components/ReviewModeNotice';
import { getDocumentType } from '@/lib/domain/document-type';

interface LegalCase {
  id: string;
  title: string;
  status: 'PENDING' | 'HEARING' | 'DISPOSED' | 'APPEAL';
  court: string | null;
  judge: string | null;
  stage: string | null;
  hearing_date: string | null;
  notes: string | null;
  matter_id: string | null;
}

interface CourtNote {
  id: string;
  hearing_date: string;
  next_hearing_date: string | null;
  court_forum_display: string;
  stage: string;
  note: string;
  next_actions: string | null;
  created_at: string;
}

interface ParentMatter {
  id: string;
  title: string;
  matter_number: string | null;
  client_name: string | null;
}

interface MatterOption {
  id: string;
  title: string;
  matter_number: string | null;
  client_name: string | null;
}

interface CaseDocument {
  id: string;
  title: string;
  document_type: string | null;
  version_count: number;
  updated_at: string;
}

export default function CaseWorkspaceDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [cCase, setCase] = useState<LegalCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);
  // Only ever set true by a successful, unauthenticated GET /api/beta-status
  // — i.e. Product Review Mode is actually active right now. Governs
  // whether the "Authentication Required" wall below uses neutral review
  // wording instead of the normal sign-in wording; when review mode is off
  // becomes true and the wall is unchanged.
  const [reviewModeActive, setReviewModeActive] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [courtNotes, setCourtNotes] = useState<CourtNote[]>([]);
  const [caseDocuments, setCaseDocuments] = useState<CaseDocument[]>([]);

  // Parent Matter linkage — a Proceeding may belong to a Matter (the usual
  // case) or stand alone. Either state is honest and shown plainly; there
  // is no fabricated "awaiting activation" placeholder for the unlinked
  // case, just a real action to link one.
  const [parentMatter, setParentMatter] = useState<ParentMatter | null>(null);
  const [showLinkMatter, setShowLinkMatter] = useState(false);
  const [matterOptions, setMatterOptions] = useState<MatterOption[]>([]);
  const [selectedMatterId, setSelectedMatterId] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const fetchCase = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/cases/${id}`);
      if (res.status === 401) {
        setNeedsAuth(true);
        fetch('/api/beta-status')
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.enabled) setReviewModeActive(true);
          })
          .catch(() => {});
        return;
      }
      if (!res.ok) {
        setCase(null);
        return;
      }
      const data = await res.json();
      setCase(data.case);
      setNotes(data.case.notes || '');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/cases/${id}/court-notes`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setCourtNotes(data.court_notes);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/documents?case_id=${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setCaseDocuments(data.documents);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!cCase?.matter_id) {
      setParentMatter(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/matters/${cCase.matter_id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setParentMatter({
          id: data.matter.id,
          title: data.matter.title,
          matter_number: data.matter.matter_number,
          client_name: data.matter.client_name,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [cCase?.matter_id]);

  const openLinkMatter = () => {
    setShowLinkMatter(true);
    setLinkError(null);
    if (matterOptions.length > 0) return;
    fetch('/api/matters?limit=100')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setMatterOptions(data.matters);
      })
      .catch(() => {});
  };

  const handleLinkMatter = async () => {
    if (!selectedMatterId) return;
    setIsLinking(true);
    setLinkError(null);
    try {
      const res = await fetch(`/api/cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matter_id: selectedMatterId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setLinkError(body?.message || 'Could not link this Proceeding to the Matter.');
        return;
      }
      setShowLinkMatter(false);
      setSelectedMatterId('');
      fetchCase();
    } catch {
      setLinkError('Network error — the Matter was not linked.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleSaveNotes = async () => {
    const res = await fetch(`/api/cases/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    if (res.ok) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex justify-center items-center">
        <span className="w-8 h-8 border-4 border-[#8A6D2F] border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans">
        <div className="flex-1 flex flex-col justify-center items-center py-20">
          <AuthOrReviewGate
            reviewModeActive={reviewModeActive}
            what="this case workspace"
            authDescription="Sign in to view this case workspace."
            headingClassName="text-lg font-bold mt-2"
            bodyClassName="text-xs text-[#726B58] mt-1"
          />
        </div>
      </div>
    );
  }

  if (!cCase) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans">
        <div className="flex-1 flex flex-col justify-center items-center py-20">
          <span className="text-3xl">⚠️</span>
          <h2 className="text-lg font-bold mt-2">Case Workspace Not Found</h2>
          <p className="text-xs text-[#726B58] mt-1">This Case ID does not exist or you lack multi-tenant RLS clearance.</p>
          <Link href="/cases" className="mt-4 text-xs font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline">
            Back to Case Workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans selection:bg-[#8A6D2F] selection:text-white">

      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/cases" className="text-xs font-bold uppercase tracking-wider text-[#726B58] hover:text-[#8A6D2F] transition-colors">
            ← Back to Case Workspace Chamber
          </Link>
        </div>

        {/* Case Title Card */}
        <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 md:p-8 shadow-sm mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#8A6D2F] bg-[#FBF6EA] px-2 py-0.5 rounded uppercase tracking-wider">
                {cCase.id.slice(0, 8)}...
              </span>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                cCase.status === 'HEARING' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                cCase.status === 'DISPOSED' ? 'bg-green-50 text-green-700 border border-green-200' :
                'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}>
                {cCase.status}
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#111111]">
              {cCase.title}
            </h1>

            {/* Parent Matter — real linkage, never fabricated. A Proceeding
                without a Matter is a fully valid, ordinary state (shown
                plainly with an action to link one), not an error. */}
            {parentMatter ? (
              <p className="text-xs font-semibold text-[#6F5624]">
                Part of Matter:{' '}
                <Link href={`/matters/${parentMatter.id}`} className="font-bold text-[#8A6D2F] hover:underline">
                  {parentMatter.title}
                </Link>
                {parentMatter.client_name ? ` — ${parentMatter.client_name}` : ''}
              </p>
            ) : (
              <div className="text-xs font-semibold text-[#726B58]">
                Not linked to any Matter.{' '}
                <button type="button" onClick={openLinkMatter} className="font-bold text-[#8A6D2F] hover:underline">
                  Link to Matter →
                </button>
              </div>
            )}
          </div>

          <Link
            href={`/cases/${id}/court-note`}
            className="w-full md:w-auto text-center px-5 py-3 min-h-[48px] bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow"
          >
            Record Court Note
          </Link>
        </div>

        {showLinkMatter && (
          <div className="mb-8 p-4 bg-white border border-[#E7DFC9]/80 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center gap-3">
            <select
              value={selectedMatterId}
              onChange={(e) => setSelectedMatterId(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium text-[#3A3222]"
            >
              <option value="">Select a Matter…</option>
              {matterOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                  {m.matter_number ? ` (${m.matter_number})` : ''}
                  {m.client_name ? ` — ${m.client_name}` : ''}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLinkMatter(false)}
                className="px-4 py-2 border border-[#E7DFC9] text-[#6F5624] text-xs font-bold uppercase rounded-lg hover:bg-[#FBF8F1]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLinkMatter}
                disabled={!selectedMatterId || isLinking}
                className="px-5 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold uppercase rounded-lg shadow"
              >
                {isLinking ? 'Linking…' : 'Link'}
              </button>
            </div>
            {linkError && <p role="alert" className="text-xs font-bold text-red-600 md:basis-full">{linkError}</p>}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Case Workspaces (Details, Notes, History) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Core Field Details Panel */}
            <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58] mb-4">Litigation Panel Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">COURT / FORUM</span>
                  <span className="text-sm font-bold text-[#3A3222]">{cCase.court || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">JUDGE / CORAM</span>
                  <span className="text-sm font-bold text-[#3A3222]">{cCase.judge || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">PROCEDURAL STAGE</span>
                  <span className="text-sm font-bold text-[#8A6D2F] font-mono uppercase">{cCase.stage || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#726B58] uppercase tracking-widest">NEXT HEARING DATE</span>
                  <span className="text-sm font-mono font-bold text-[#3A3222]">{cCase.hearing_date || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Court Note History — real, append-only hearing records. This
                is the Proceeding's actual chronology; there is no separate
                fabricated timeline alongside it. */}
            <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58] mb-4">Court Note History</h2>
              {courtNotes.length === 0 ? (
                <p className="text-xs font-semibold text-[#6F5624]">
                  No Court Notes recorded yet. Record one right after your next hearing.
                </p>
              ) : (
                <div className="space-y-4">
                  {courtNotes.map((cn) => (
                    <div key={cn.id} className="border-l-2 border-[#F4EEE0] pl-4">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-[9px] font-mono font-bold text-[#8A6D2F]">{cn.hearing_date}</span>
                        <span className="text-[10px] font-bold text-[#726B58] uppercase tracking-wider">{cn.stage}</span>
                        <span className="text-[10px] text-[#726B58]">· {cn.court_forum_display}</span>
                      </div>
                      <p className="text-xs text-[#3A3222] mt-1">{cn.note}</p>
                      {cn.next_actions && (
                        <p className="text-xs text-[#8A6D2F] font-semibold mt-1">Next: {cn.next_actions}</p>
                      )}
                      {cn.next_hearing_date && (
                        <p className="text-[10px] text-[#726B58] mt-1">Next hearing: {cn.next_hearing_date}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Private scratchpad — deliberately NOT the hearing record.
                Anything that should update the Matter's stage/next hearing
                date belongs in "Record Court Note" above; this textarea is
                a personal, unstructured note that stays on this Proceeding
                only. */}
            <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58]">Private Scratchpad</h2>
                {isSaved && (
                  <span className="text-xs text-green-800 font-bold font-sans">✓ Saved</span>
                )}
              </div>
              <p className="text-[10px] text-[#B0A588] font-semibold mb-3">
                Not part of the official hearing record and does not update the Matter — use &quot;Record Court Note&quot;
                for anything that should.
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Personal notes, reminders, or drafts for this Proceeding..."
                rows={6}
                className="w-full p-4 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-sm font-medium font-mono text-[#3A3222]"
              />
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleSaveNotes}
                  className="px-5 py-2.5 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow"
                >
                  Save Scratchpad
                </button>
              </div>
            </div>

          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Documents linked to this Proceeding — real data from the
                existing GET /api/documents?case_id= filter, same pattern
                the Matter Workspace's Documents section already uses. */}
            <div className="bg-white border border-[#E7DFC9]/80 rounded-xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#726B58]">Documents</h2>
                <Link
                  href={parentMatter ? `/documents/new?matter_id=${parentMatter.id}` : '/documents/new'}
                  className="text-[10px] font-bold uppercase tracking-wider text-[#8A6D2F] hover:underline"
                >
                  + Prepare
                </Link>
              </div>
              {caseDocuments.length > 0 ? (
                <div className="space-y-3">
                  {caseDocuments.map((docItem) => (
                    <div key={docItem.id} className="flex items-center justify-between border-b border-[#F4EEE0] pb-3 last:border-0 last:pb-0 gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#3A3222] truncate">{docItem.title}</p>
                        <p className="text-[9px] text-[#726B58] font-bold uppercase tracking-wider">
                          {getDocumentType(docItem.document_type)?.label ?? 'Uploaded'} · v{docItem.version_count || 1}
                        </p>
                      </div>
                      <Link
                        href={`/documents/${docItem.id}`}
                        className="shrink-0 text-[9px] font-bold text-[#8A6D2F] bg-[#FBF6EA] px-2 py-1 rounded uppercase tracking-wider hover:bg-[#F4EEE0]"
                      >
                        Open
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-semibold text-[#6F5624]">No documents linked to this Proceeding yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
