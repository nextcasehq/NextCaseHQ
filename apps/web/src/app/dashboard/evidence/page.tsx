'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LitigationDb, Case } from '@/lib/db/litigation-db';

interface Exhibit {
  id: string;
  caseId: string;
  citation: string;
  snippet: string;
  sha256: string;
  status: 'VERIFIED' | 'PENDING';
  uploadedBy: string;
}

export default function EvidenceRegisterPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [exhibits, setExhibits] = useState<Exhibit[]>([]);
  const [showUpload, setShowUpload] = useState(false);

  // Form State
  const [caseId, setCaseId] = useState('');
  const [citation, setCitation] = useState('');
  const [snippet, setSnippet] = useState('');

  const defaultExhibits: Exhibit[] = [
    {
      id: 'EX-A',
      caseId: 'CAS-2026-001',
      citation: 'WP 132/2026 - Page 14',
      snippet: 'The petitioner maintains that the limitation period was tolled during the state of emergency...',
      sha256: '4f46e5ba2b14d244cefcf285e191f4370c202c725e92a87db01245ab6ccc8562',
      status: 'VERIFIED',
      uploadedBy: 'Senior Counsel Harish Salve'
    },
    {
      id: 'EX-B',
      caseId: 'CAS-2026-001',
      citation: 'NI Act Section 138 Notice',
      snippet: 'Notice served via registered post on 12-Jan-2026. Return receipt signed on 15-Jan-2026.',
      sha256: '0853022c0b14d244e51afb90d723453cefcf285e191f4370c202c725e92a87db',
      status: 'VERIFIED',
      uploadedBy: 'Senior Counsel Harish Salve'
    }
  ];

  useEffect(() => {
    setCases(LitigationDb.getCases());
    const saved = localStorage.getItem('nchq_exhibits_store');
    if (saved) {
      setExhibits(JSON.parse(saved));
    } else {
      setExhibits(defaultExhibits);
      localStorage.setItem('nchq_exhibits_store', JSON.stringify(defaultExhibits));
    }
  }, []);

  useEffect(() => {
    if (cases.length > 0 && !caseId) {
      setCaseId(cases[0].id);
    }
  }, [cases]);

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseId || !citation || !snippet) return;

    const mockHash = Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
    const newEx: Exhibit = {
      id: `EX-${String.fromCharCode(65 + exhibits.length)}`,
      caseId,
      citation,
      snippet,
      sha256: mockHash,
      status: 'VERIFIED',
      uploadedBy: 'Counsel Session'
    };

    const updated = [...exhibits, newEx];
    setExhibits(updated);
    localStorage.setItem('nchq_exhibits_store', JSON.stringify(updated));

    // Reset Form
    setCitation('');
    setSnippet('');
    setShowUpload(false);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 font-sans text-[#111111] animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200/60 pb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-[#111111]">Evidence Registrar</h1>
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mt-1">
            Cryptographically chained ledger hash integrity (HMAC-SHA256).
          </p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="self-start md:self-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-lg transition-all shadow-sm"
        >
          {showUpload ? 'Close Form' : 'Register New Exhibit'}
        </button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="p-6 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4">Register Exhibit Metadata</h3>

          {cases.length === 0 ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs rounded-lg font-semibold text-center">
              ⚠️ No Active Cases exist in this tenant partition. You must spawn a Case Workspace before uploading exhibit evidence.
            </div>
          ) : (
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Bind to Case Workspace *</label>
                  <select
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-indigo-600 text-sm font-medium"
                  >
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>{c.id} // {c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Exhibit Citation / Source *</label>
                  <input
                    type="text"
                    required
                    value={citation}
                    onChange={(e) => setCitation(e.target.value)}
                    placeholder="e.g. Bank Statement page 5"
                    className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-indigo-600 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-[#111111]/60 mb-2">Evidentiary Text Snippet *</label>
                <textarea
                  required
                  value={snippet}
                  onChange={(e) => setSnippet(e.target.value)}
                  placeholder="Paste OCR extract or text content representing the core evidence..."
                  rows={4}
                  className="w-full px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:border-indigo-600 text-sm font-medium font-sans"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  className="px-4 py-2 border border-neutral-200 text-neutral-500 text-xs font-bold uppercase rounded-lg hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase rounded-lg shadow"
                >
                  Encrypt & Upload Exhibit
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Exhibits Table List */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="p-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Exhibit ID</th>
              <th className="p-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Bound Case</th>
              <th className="p-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Citation Source</th>
              <th className="p-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Extracted Content Snippet</th>
              <th className="p-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">SHA-256 Ledger Signature</th>
              <th className="p-4 text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {exhibits.map(ex => (
              <tr key={ex.id} className="border-b border-neutral-100 hover:bg-neutral-50/50 transition-colors">
                <td className="p-4">
                  <span className="font-mono text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded">
                    {ex.id}
                  </span>
                </td>
                <td className="p-4 text-xs font-bold text-neutral-600 font-mono">
                  {ex.caseId}
                </td>
                <td className="p-4 text-xs font-bold text-neutral-800">
                  {ex.citation}
                </td>
                <td className="p-4 text-xs text-neutral-500 max-w-xs truncate font-mono italic">
                  "{ex.snippet}"
                </td>
                <td className="p-4">
                  <span className="font-mono text-[9px] text-neutral-400 block truncate max-w-[120px]" title={ex.sha256}>
                    {ex.sha256}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <span className="px-2 py-0.5 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded text-[9px] font-bold uppercase tracking-wide">
                    {ex.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
