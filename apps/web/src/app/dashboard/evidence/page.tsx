'use client';

import React, { useState } from 'react';

interface EvidenceItem {
  id: string;
  name: string;
  size: string;
  hash: string;
  timestamp: string;
  status: string;
  keyVersion: string;
}

export default function EvidencePage() {
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([
    {
      id: 'EX-2026-001',
      name: 'ni_act_section_138_demand_notice.pdf',
      size: '2.4 MB',
      hash: 'sha256-4f8a3c9b1e2d5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e',
      timestamp: '12-Jan-2026 10:30 UTC',
      status: 'ENVELOPE_ENCRYPTED_STABLE',
      keyVersion: 'v1-active'
    },
    {
      id: 'EX-2026-002',
      name: 'registered_post_acknowledgement_receipt.png',
      size: '840 KB',
      hash: 'sha256-e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8',
      timestamp: '15-Jan-2026 14:15 UTC',
      status: 'ENVELOPE_ENCRYPTED_STABLE',
      keyVersion: 'v1-active'
    }
  ]);

  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('1.2 MB');
  const [isUploading, setIsUploading] = useState(false);
  const [keyVersion, setKeyVersion] = useState('v1-active');

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;

    setIsUploading(true);

    // Simulate multi-tenant secure ingestion timeline
    setTimeout(() => {
      const randomId = `EX-2026-${String(Math.floor(100 + Math.random() * 900))}`;
      // Simulate real cryptographic SHA256 string
      const randomHash = 'sha256-' + Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');

      const newEvidence: EvidenceItem = {
        id: randomId,
        name: fileName,
        size: fileSize,
        hash: randomHash,
        timestamp: new Date().toUTCString().replace('GMT', 'UTC'),
        status: 'ENVELOPE_ENCRYPTED_STABLE',
        keyVersion: keyVersion
      };

      setEvidenceList([newEvidence, ...evidenceList]);
      setFileName('');
      setFileSize('1.2 MB');
      setIsUploading(false);
    }, 1200);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 font-sans selection:bg-[#111111] selection:text-[#FDFBF7]">
      {/* Evidence Registrar Title */}
      <div className="border-b border-[#111111]/10 pb-4">
        <h1 className="text-2xl font-black uppercase tracking-widest text-[#111111]">Evidence Registrar</h1>
        <p className="text-sm font-serif italic text-[#111111]/60">Cryptographically chained ledger hash integrity.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Drag-and-Drop Intake Simulation */}
        <div className="lg:col-span-1 p-6 border border-[#111111]/15 rounded bg-white space-y-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[#111111] border-b border-[#111111]/5 pb-2">
            Secure Exhibit Ingestion
          </h2>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#111111]/60 mb-1">
                File Title
              </label>
              <input
                type="text"
                required
                placeholder="e.g. bank_statement_q1_2026.pdf"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                disabled={isUploading}
                className="w-full px-4 py-2.5 bg-[#FDFBF7] border border-[#111111]/15 rounded outline-none focus:border-[#111111] text-sm font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#111111]/60 mb-1">
                  File Size
                </label>
                <select
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                  disabled={isUploading}
                  className="w-full px-3 py-2 bg-[#FDFBF7] border border-[#111111]/15 rounded outline-none focus:border-[#111111] text-xs font-sans"
                >
                  <option value="512 KB">512 KB</option>
                  <option value="1.2 MB">1.2 MB</option>
                  <option value="3.5 MB">3.5 MB</option>
                  <option value="14.8 MB">14.8 MB</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#111111]/60 mb-1">
                  Key Version
                </label>
                <select
                  value={keyVersion}
                  onChange={(e) => setKeyVersion(e.target.value)}
                  disabled={isUploading}
                  className="w-full px-3 py-2 bg-[#FDFBF7] border border-[#111111]/15 rounded outline-none focus:border-[#111111] text-xs font-sans"
                >
                  <option value="v1-active">v1-active</option>
                  <option value="v2-legacy">v2-legacy</option>
                  <option value="hsm-key-prod">hsm-key-prod</option>
                </select>
              </div>
            </div>

            <div className="border border-dashed border-[#111111]/20 rounded-lg p-6 text-center bg-[#111111]/2 hover:bg-[#111111]/5 transition-colors cursor-pointer">
              <span className="text-2xl mb-1 block">📥</span>
              <p className="text-xs font-bold uppercase tracking-wider text-[#111111]/50">Click or Drag Files Here</p>
              <p className="text-[10px] text-[#111111]/30 font-serif mt-1">Multi-tenant client-side pre-encryption secure pool.</p>
            </div>

            <button
              type="submit"
              disabled={isUploading || !fileName.trim()}
              className="w-full py-3 bg-[#111111] text-[#FDFBF7] text-xs uppercase tracking-wider font-bold rounded shadow hover:bg-[#111111]/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-[#FDFBF7] border-t-transparent rounded-full animate-spin"></span>
                  AES-GCM Envelope Encryption...
                </>
              ) : (
                'Register Exhibit'
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Registered Exhibits List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#111111]/50">
            Registered Tenant Ledger Entries
          </h2>

          <div className="space-y-4">
            {evidenceList.map((item) => (
              <div
                key={item.id}
                className="p-5 border border-[#111111]/10 rounded bg-white hover:border-[#111111] transition-all group"
              >
                <div className="flex justify-between items-start gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-extrabold text-[#8A6D2F] bg-[#FBF6EA] px-2 py-0.5 rounded">
                      {item.id}
                    </span>
                    <span className="text-[10px] bg-[#111111]/5 text-[#111111]/60 px-2 py-0.5 rounded font-mono uppercase font-bold">
                      {item.size}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold tracking-widest uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {item.status}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-[#111111]">{item.name}</h3>

                <div className="mt-4 pt-3 border-t border-[#111111]/5 flex flex-col md:flex-row justify-between text-[10px] font-mono text-[#111111]/50 gap-2">
                  <div className="truncate">
                    <span className="font-bold text-[#111111]/70 mr-1">HASH:</span>
                    <span className="text-[#111111]/60 font-mono select-all">{item.hash}</span>
                  </div>
                  <div className="flex-none text-right">
                    <span className="font-bold text-[#111111]/70 mr-1">KEY_VER:</span>
                    {item.keyVersion} // {item.timestamp}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
