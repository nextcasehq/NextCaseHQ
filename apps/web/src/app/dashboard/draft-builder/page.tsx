'use client';

import React, { useState, useEffect } from 'react';
import { LitigationDb, Case } from '@/lib/db/litigation-db';

export default function DraftBuilderPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [template, setTemplate] = useState('writ');
  const [draftContent, setDraftContent] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [signature, setSignature] = useState('');

  const templates: Record<string, string> = {
    writ: `IN THE HIGH COURT OF DELHI AT NEW DELHI\nWrit Petition (Civil) No. ______ of 2026\n\nIN THE MATTER OF:\nNextCaseHQ Technologies Inc.   ...Petitioner\n\nVERSUS\nUnion of India & Ors.          ...Respondents\n\nMEMORANDUM OF WRIT PETITION UNDER ARTICLE 226 OF THE CONSTITUTION OF INDIA\n\nMost Respectfully Showeth:\n1. The Petitioner is a registered corporation under the laws of India.\n2. This petition challenges the administrative guidelines issued on 10-Jan-2026, which arbitrary restrict litigation data routing standards.\n3. The arbitrary guidelines directly violate the Petitioner's fundamental rights under Article 19(1)(g) of the Constitution.\n\nPRAYER:\nIt is most respectfully prayed that this Hon'ble Court may be pleased to issue a Writ of Mandamus or any other appropriate writ, order or direction setting aside the administrative guidelines.`,
    notice: `BY REGISTERED POST A.D. // LEGAL DEMAND NOTICE\n\nDate: 12-Jan-2026\nTo,\nMr. K. R. Sharma\nPartner, Sterling Commerce\nNew Delhi - 110001\n\nSUBJECT: DEMAND NOTICE UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881 FOR DISHONOUR OF CHEQUE\n\nDear Sir,\nUnder instructions from our client, NextCaseHQ Technologies Inc., we hereby serve you with this statutory notice:\n1. You issued a cheque bearing No. 400199 dated 05-Jan-2026 for a sum of INR 5,00,000.\n2. The said cheque was presented by our client but was returned dishonoured with the remarks "Funds Insufficient" on 08-Jan-2026.\n3. You are hereby called upon to pay the said sum of INR 5,00,000 within 15 days of the receipt of this notice, failing which our client shall initiate criminal prosecution under Section 138 of the NI Act.`,
    complaint: `IN THE UNITED STATES DISTRICT COURT\nFOR THE NORTHERN DISTRICT OF CALIFORNIA\n\nNextCaseHQ Technologies, Inc.    Plaintiff,\n\nv.                               Civil Action No. ______\nAcme Litigation Holdings, Inc.   Defendant.\n\nCOMPLAINT FOR PATENT INFRINGEMENT UNDER 35 U.S.C. § 271\n\nPlaintiff NextCaseHQ Technologies, Inc. alleges for its Complaint:\n1. Plaintiff is a Delaware corporation with its principal place of business in California.\n2. Defendant Acme Litigation Holdings is a California corporation.\n3. This Court has subject matter jurisdiction pursuant to 28 U.S.C. §§ 1331 and 1338(a).\n4. Defendant has infringed and continues to infringe patents held by Plaintiff by distributing unauthorized copies of the Litigation Operating System.`
  };

  useEffect(() => {
    const fetchedCases = LitigationDb.getCases();
    setCases(fetchedCases);
    if (fetchedCases.length > 0) {
      setSelectedCaseId(fetchedCases[0].id);
    }
    setDraftContent(templates.writ);
  }, []);

  const handleTemplateChange = (val: string) => {
    setTemplate(val);
    setDraftContent(templates[val] || '');
  };

  const handleLockDraft = () => {
    if (!draftContent.trim()) return;
    setIsLocked(true);
    // Simulate sha256 signature hash of the draft content
    const mockHash = Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
    setSignature(mockHash);
  };

  const handleUnlockDraft = () => {
    setIsLocked(false);
    setSignature('');
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 font-sans text-[#111111] animate-fadeIn">
      {/* Header */}
      <div className="border-b border-neutral-200/60 pb-6">
        <h1 className="text-2xl font-black uppercase tracking-tight text-[#111111]">Draft Builder & Canvas</h1>
        <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mt-1">
          WYSIWYG high-fidelity litigation document editor and template binder.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Controls */}
        <div className="lg:col-span-1 bg-white border border-neutral-200 rounded-xl p-6 shadow-sm space-y-6 self-start">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">1. Select Case Context</h3>
            {cases.length === 0 ? (
              <p className="text-xs text-neutral-400 italic">No case workspace available inside this tenant.</p>
            ) : (
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                disabled={isLocked}
                className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg outline-none text-xs font-bold text-neutral-700 disabled:opacity-60"
              >
                {cases.map(c => (
                  <option key={c.id} value={c.id}>{c.id} // {c.title.slice(0, 20)}...</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">2. Bind Template</h3>
            <div className="space-y-2">
              {[
                { id: 'writ', label: 'Writ Petition (Article 226)' },
                { id: 'notice', label: 'Demand Notice (Sec 138 NI Act)' },
                { id: 'complaint', label: 'Federal Complaint (FRCP)' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateChange(t.id)}
                  disabled={isLocked}
                  className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                    template === t.id
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                      : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-600 disabled:opacity-60'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-6">
            {isLocked ? (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest block mb-1">LOCK STATUS: SIGNED</span>
                  <span className="font-mono text-[9px] text-emerald-600 block truncate" title={signature}>
                    SHA: {signature}
                  </span>
                </div>
                <button
                  onClick={handleUnlockDraft}
                  className="w-full py-3 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 font-bold text-xs uppercase tracking-wider rounded-lg transition-all"
                >
                  Unlock & Edit Draft
                </button>
              </div>
            ) : (
              <button
                onClick={handleLockDraft}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-sm"
              >
                Sign & Lock Draft
              </button>
            )}
          </div>
        </div>

        {/* Rich-Text Area Sheet */}
        <div className="lg:col-span-3 bg-white border border-neutral-200 rounded-xl p-8 shadow-xl shadow-neutral-100/50 min-h-[600px] flex flex-col justify-between">
          <textarea
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            disabled={isLocked}
            placeholder="Edit draft here..."
            className="w-full h-full flex-1 min-h-[500px] border-none outline-none font-serif text-[15px] leading-relaxed text-neutral-800 bg-transparent resize-none placeholder-neutral-300 disabled:text-neutral-500"
          />

          <div className="border-t border-neutral-100 pt-4 mt-6 flex justify-between items-center text-[10px] text-neutral-400 font-mono">
            <span>DRAFT VERSION: v1.0.0-rc1</span>
            <span>CHARACTERS: {draftContent.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
