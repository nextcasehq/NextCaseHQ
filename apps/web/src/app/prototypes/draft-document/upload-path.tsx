'use client';

import React, { useState } from 'react';
import { SAMPLE_UPLOAD_DOCUMENTS, ADVOCATE_CAPACITY_OPTIONS, type SampleUploadDocument } from './templates-data';

export interface UploadCompletionResult {
  fileName: string;
  representedParty: string;
  court: string;
  caseType: string;
  caseNumber: string;
  year: string;
  petitioner: string;
  respondent: string;
  documentType: string;
  gist: string;
  duplicateChoice: 'link' | 'separate' | null;
}

interface UploadPathProps {
  isLinkedMatter: boolean;
  onBack: () => void;
  onComplete: (result: UploadCompletionResult) => void;
}

type UploadSubStep = 'select' | 'preview' | 'review' | 'duplicate';

function fieldValue(value: string | null): string {
  return value ?? '';
}

export default function UploadPath({ isLinkedMatter, onBack, onComplete }: UploadPathProps) {
  const [subStep, setSubStep] = useState<UploadSubStep>('select');
  const [selectedDoc, setSelectedDoc] = useState<SampleUploadDocument | null>(null);
  const [representedParty, setRepresentedParty] = useState('');

  const [court, setCourt] = useState('');
  const [caseType, setCaseType] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [year, setYear] = useState('');
  const [petitioner, setPetitioner] = useState('');
  const [respondent, setRespondent] = useState('');
  const [documentType, setDocumentType] = useState('');
  const [filingDate, setFilingDate] = useState('');
  const [gist, setGist] = useState('');

  const handleSelectDoc = (doc: SampleUploadDocument) => {
    setSelectedDoc(doc);
    setSubStep('preview');
  };

  const handleSimulateExtraction = () => {
    if (!selectedDoc) return;
    const { extraction } = selectedDoc;
    setCourt(fieldValue(extraction.court));
    setCaseType(fieldValue(extraction.caseType));
    setCaseNumber(fieldValue(extraction.caseNumber));
    setYear(fieldValue(extraction.year));
    setPetitioner(fieldValue(extraction.petitioner));
    setRespondent(fieldValue(extraction.respondent));
    setDocumentType(fieldValue(extraction.documentType));
    setFilingDate(extraction.filingDate || '');
    setGist(fieldValue(extraction.gist));
    setSubStep('review');
  };

  const finish = (duplicateChoice: 'link' | 'separate' | null) => {
    if (!selectedDoc) return;
    onComplete({
      fileName: selectedDoc.fileName,
      representedParty,
      court,
      caseType,
      caseNumber,
      year,
      petitioner,
      respondent,
      documentType,
      gist,
      duplicateChoice,
    });
  };

  const handleConfirmReview = () => {
    if (isLinkedMatter) {
      finish(null);
      return;
    }
    setSubStep('duplicate');
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-3xl space-y-4">
        <button onClick={onBack} className="text-[10px] font-bold uppercase tracking-widest text-[#B0A588] hover:text-[#8A6D2F]">
          ← Back
        </button>

        {subStep === 'select' && (
          <div className="bg-white border border-[#E7DFC9]/80 rounded-2xl p-6 md:p-8 space-y-4">
            <h2 className="text-lg font-black uppercase tracking-widest text-[#111111]">Select a Document</h2>
            <p className="text-xs text-[#8A7A56]">
              This prototype has no real file upload — choose one of these synthetic sample documents to simulate the flow.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SAMPLE_UPLOAD_DOCUMENTS.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => handleSelectDoc(doc)}
                  className="text-left bg-[#FBF8F1] border border-[#E7DFC9] rounded-xl p-4 hover:bg-[#F4EEE0] hover:border-[#8A6D2F] transition-all space-y-2"
                >
                  <span className="text-2xl">📄</span>
                  <p className="text-xs font-bold text-[#3A3222]">{doc.fileName}</p>
                  <p className="text-[10px] text-[#B0A588]">{doc.pageCount} pages</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {subStep === 'preview' && selectedDoc && (
          <div className="bg-white border border-[#E7DFC9]/80 rounded-2xl p-6 md:p-8 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#F4EEE0]/60 border border-[#E7DFC9] rounded-xl p-6 flex flex-col items-center justify-center min-h-[220px]">
                <span className="text-4xl mb-2">📄</span>
                <p className="text-xs font-bold text-[#3A3222]">{selectedDoc.fileName}</p>
                <p className="text-[10px] text-[#B0A588] mt-1">{selectedDoc.pageCount}-page preview (prototype placeholder — not a real PDF render)</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Whom do you represent? *</label>
                  <select
                    value={representedParty}
                    onChange={(e) => setRepresentedParty(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
                  >
                    <option value="">Select a role...</option>
                    {ADVOCATE_CAPACITY_OPTIONS.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[#B0A588] mt-1">The uploader is not assumed to represent the first-named party.</p>
                </div>
                <button
                  onClick={handleSimulateExtraction}
                  disabled={!representedParty}
                  className="w-full px-4 py-2.5 bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-bold text-[10px] uppercase tracking-widest rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Simulate Extraction
                </button>
              </div>
            </div>
          </div>
        )}

        {subStep === 'review' && selectedDoc && (
          <div className="bg-white border border-[#E7DFC9]/80 rounded-2xl p-6 md:p-8 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-lg font-black uppercase tracking-widest text-[#111111]">Review Extracted Details</h2>
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#8A6D2F] bg-[#FBF6EA] border border-[#C6A253]/40 px-2 py-1 rounded">
                Prototype extraction — advocate confirmation required
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#F4EEE0]/60 border border-[#E7DFC9] rounded-xl p-6 flex flex-col items-center justify-center min-h-[220px]">
                <span className="text-4xl mb-2">📄</span>
                <p className="text-xs font-bold text-[#3A3222]">{selectedDoc.fileName}</p>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Court', value: court, setValue: setCourt },
                  { label: 'Case Type', value: caseType, setValue: setCaseType },
                  { label: 'Case Number', value: caseNumber, setValue: setCaseNumber },
                  { label: 'Year', value: year, setValue: setYear },
                  { label: 'Petitioner / Applicant', value: petitioner, setValue: setPetitioner },
                  { label: 'Respondent / Opponent', value: respondent, setValue: setRespondent },
                  { label: 'Document Type', value: documentType, setValue: setDocumentType },
                  { label: 'Filing Date', value: filingDate, setValue: setFilingDate },
                ].map((field) => (
                  <div key={field.label}>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">{field.label}</label>
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => field.setValue(e.target.value)}
                      placeholder="Not detected"
                      className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#111111]/60 mb-1">Gist</label>
                  <textarea
                    value={gist}
                    onChange={(e) => setGist(e.target.value)}
                    rows={2}
                    placeholder="Not detected"
                    className="w-full px-3 py-2 bg-[#FBF8F1] border border-[#E7DFC9] rounded-lg outline-none focus:border-[#8A6D2F] text-xs font-medium text-[#3A3222]"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleConfirmReview}
                className="px-5 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-bold text-[10px] uppercase tracking-widest rounded-lg shadow transition-all"
              >
                Confirm Details →
              </button>
            </div>
          </div>
        )}

        {subStep === 'duplicate' && selectedDoc && (
          <div className="bg-white border border-[#E7DFC9]/80 rounded-2xl p-6 md:p-8 space-y-4">
            <h2 className="text-lg font-black uppercase tracking-widest text-[#111111]">Duplicate Matter Check</h2>
            {selectedDoc.simulateDuplicateMatch ? (
              <>
                <p className="text-xs text-[#5C5340]">A matching matter may already exist in your workspace.</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => finish('link')}
                    className="px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all"
                  >
                    Link to Existing Matter Register
                  </button>
                  <button
                    onClick={() => finish('separate')}
                    className="px-4 py-2 border border-[#8A6D2F] text-[#8A6D2F] hover:bg-[#FBF6EA] font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all"
                  >
                    Create Separate Matter Register
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-[#5C5340]">No matching matter found — a new Matter Register will be created.</p>
                <button
                  onClick={() => finish('separate')}
                  className="px-5 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white font-bold text-[10px] uppercase tracking-widest rounded-lg shadow transition-all"
                >
                  Continue →
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
