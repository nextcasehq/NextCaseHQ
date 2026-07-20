'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ExistingMatterOption } from './templates-data';
import {
  type CaseContext,
  type EntryChoice,
  type FlowStep,
  type MatterRegisterInfo,
  EMPTY_CASE_CONTEXT,
} from './types';
import StartScreen from './start-screen';
import CaseContextStep from './case-context-step';
import DraftPath, { type DraftPathState, EMPTY_DRAFT_PATH_STATE } from './draft-path';
import UploadPath, { type UploadCompletionResult } from './upload-path';
import ConfirmIdentityStep from './confirm-identity-step';
import RegisterReveal, { type RegisterRevealData } from './register-reveal';

const SESSION_KEY = 'nchq-draft-document-prototype-v1';

interface DocumentSaveInfo {
  documentName: string;
  paragraphCount: number;
}

interface PersistedFlowState {
  flowStep: FlowStep;
  entryChoice: EntryChoice | null;
  caseContext: CaseContext;
  draftPathState: DraftPathState;
  uploadResult: UploadCompletionResult | null;
  register: MatterRegisterInfo | null;
  documentSaveInfo: DocumentSaveInfo | null;
}

export default function DraftDocumentPrototypePage() {
  const [flowStep, setFlowStep] = useState<FlowStep>('start');
  const [entryChoice, setEntryChoice] = useState<EntryChoice | null>(null);
  const [caseContext, setCaseContext] = useState<CaseContext>(EMPTY_CASE_CONTEXT);
  const [draftPathState, setDraftPathState] = useState<DraftPathState>(EMPTY_DRAFT_PATH_STATE);
  const [uploadResult, setUploadResult] = useState<UploadCompletionResult | null>(null);
  const [register, setRegister] = useState<MatterRegisterInfo | null>(null);
  const [documentSaveInfo, setDocumentSaveInfo] = useState<DocumentSaveInfo | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Restore in-progress state after a refresh — sessionStorage only, no
  // backend, cleared automatically when the browser tab closes.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedFlowState>;
        if (parsed.flowStep) setFlowStep(parsed.flowStep);
        if (parsed.entryChoice !== undefined) setEntryChoice(parsed.entryChoice);
        if (parsed.caseContext) setCaseContext(parsed.caseContext);
        if (parsed.draftPathState) setDraftPathState(parsed.draftPathState);
        if (parsed.uploadResult !== undefined) setUploadResult(parsed.uploadResult);
        if (parsed.register !== undefined) setRegister(parsed.register);
        if (parsed.documentSaveInfo !== undefined) setDocumentSaveInfo(parsed.documentSaveInfo);
      }
    } catch {
      // Corrupt or unavailable sessionStorage — start fresh rather than crash.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const snapshot: PersistedFlowState = {
        flowStep,
        entryChoice,
        caseContext,
        draftPathState,
        uploadResult,
        register,
        documentSaveInfo,
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
    } catch {
      // Best-effort only — never block the UI if persistence fails.
    }
  }, [hydrated, flowStep, entryChoice, caseContext, draftPathState, uploadResult, register, documentSaveInfo]);

  const handleStartOver = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore — worst case the next visit restores stale state.
    }
    setFlowStep('start');
    setEntryChoice(null);
    setCaseContext(EMPTY_CASE_CONTEXT);
    setDraftPathState(EMPTY_DRAFT_PATH_STATE);
    setUploadResult(null);
    setRegister(null);
    setDocumentSaveInfo(null);
    setNotice(null);
  };

  const handleChooseEntry = (choice: EntryChoice) => {
    setEntryChoice(choice);
    setFlowStep('context');
  };

  const handleLinkExisting = (matter: ExistingMatterOption, nextPath: 'draft-new' | 'upload-existing') => {
    setEntryChoice(nextPath);
    setRegister({ mode: 'link', name: matter.label });
    setFlowStep(nextPath === 'draft-new' ? 'draft' : 'upload');
  };

  const handleContextContinue = () => {
    setFlowStep(entryChoice === 'upload-existing' ? 'upload' : 'draft');
  };

  const handleDraftSave = (payload: DocumentSaveInfo) => {
    setDocumentSaveInfo(payload);
    setFlowStep(register ? 'register' : 'confirm');
  };

  const handleUploadComplete = (result: UploadCompletionResult) => {
    setUploadResult(result);
    setDocumentSaveInfo({ documentName: result.fileName, paragraphCount: 0 });
    setFlowStep(register ? 'register' : 'confirm');
  };

  const handleConfirmIdentity = (reg: MatterRegisterInfo) => {
    setRegister(reg);
    setFlowStep('register');
  };

  const suggestedMatterName = uploadResult
    ? `${uploadResult.representedParty || 'Represented Party'} — ${uploadResult.caseType || 'Matter'}`
    : `${caseContext.representedParty || 'Represented Party'}${caseContext.opposingParty ? ` vs. ${caseContext.opposingParty}` : ''}`;

  const summaryFields = uploadResult
    ? [
        { label: 'Document Type', value: uploadResult.documentType },
        { label: 'Represented Party', value: uploadResult.representedParty },
        { label: 'Other Party', value: uploadResult.respondent || uploadResult.petitioner },
        { label: 'Court', value: uploadResult.court },
        { label: 'Case Type', value: uploadResult.caseType },
        { label: 'Case Number / Year', value: [uploadResult.caseNumber, uploadResult.year].filter(Boolean).join(' of ') },
      ]
    : [
        { label: 'Document Type', value: caseContext.documentType },
        { label: 'Represented Party', value: caseContext.representedParty },
        { label: 'Opposing Party', value: caseContext.opposingParty },
        { label: 'Court', value: caseContext.court },
        { label: 'Advocate Capacity', value: caseContext.advocateCapacity },
        { label: 'Case Category', value: caseContext.caseCategory },
        { label: 'Case Number / Year', value: [caseContext.caseNumber, caseContext.caseYear].filter(Boolean).join(' of ') },
        { label: 'Relief / Objective', value: caseContext.relief },
      ];

  const registerRevealData: RegisterRevealData | null =
    register && documentSaveInfo
      ? {
          matterName: register.name,
          matterNumber: register.number || '',
          court: uploadResult ? uploadResult.court : caseContext.court,
          caseType: uploadResult ? uploadResult.caseType : caseContext.caseCategory || caseContext.documentType,
          caseNumber: uploadResult ? uploadResult.caseNumber : caseContext.caseNumber,
          caseYear: uploadResult ? uploadResult.year : caseContext.caseYear,
          mode: register.mode,
          linkedMatterLabel: register.mode === 'link' ? register.name : undefined,
          documentName: documentSaveInfo.documentName,
          paragraphCount: documentSaveInfo.paragraphCount,
        }
      : null;

  const isLinkedMatterFlow = flowStep !== 'start' && flowStep !== 'link-pick' && flowStep !== 'context' && register?.mode === 'link' && !documentSaveInfo;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#111111] flex flex-col font-sans selection:bg-[#8A6D2F] selection:text-white">
      {/* Prototype identification banner */}
      <div className="bg-[#111111] text-[#FDFBF7] px-4 py-2 text-center text-[10px] md:text-[11px] font-bold uppercase tracking-widest">
        Prototype — Draft Document &amp; Matter Register workspace. Product-direction exploration only. No drafts are saved, no AI is called, nothing is written to production.
      </div>

      <header className="border-b border-[#111111]/10 px-4 md:px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link href="/matters" className="text-[10px] font-bold uppercase tracking-widest text-[#B0A588] hover:text-[#8A6D2F]">
            ← Back to Matters
          </Link>
          <h1 className="text-lg md:text-xl font-black uppercase tracking-widest mt-1">Draft Document</h1>
          <p className="text-xs font-serif italic text-[#111111]/60">Prototype drafting workspace and Matter Register concept.</p>
        </div>
        <div className="flex items-center gap-3">
          {register && flowStep !== 'register' && documentSaveInfo && (
            <button
              onClick={() => setFlowStep('register')}
              className="text-xs font-semibold text-[#5C5340] bg-[#FBF6EA] border border-[#C6A253]/40 rounded-lg px-3 py-2 max-w-sm hover:bg-[#F4EEE0] transition-all"
            >
              Matter Register: {register.name}
              {register.number ? ` (${register.number})` : ''} — view register →
            </button>
          )}
          <button onClick={handleStartOver} className="text-[10px] font-bold uppercase tracking-widest text-[#B0A588] hover:text-[#8A6D2F]">
            Start Over
          </button>
        </div>
      </header>

      {notice && (
        <div className="mx-4 md:mx-6 mt-4 p-4 bg-[#FBF6EA] border border-[#C6A253]/40 rounded-xl flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs font-semibold text-[#5C5340]">{notice}</p>
          <button onClick={() => setNotice(null)} className="text-xs font-bold text-[#B0A588] hover:text-[#8A7A56]" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {flowStep === 'start' && <StartScreen onChooseEntry={handleChooseEntry} onLinkExisting={handleLinkExisting} />}

      {flowStep === 'context' && entryChoice && (
        <CaseContextStep
          entryChoice={entryChoice}
          context={caseContext}
          onChange={setCaseContext}
          onBack={() => setFlowStep('start')}
          onContinue={handleContextContinue}
        />
      )}

      {flowStep === 'draft' && (
        <DraftPath
          caseContext={caseContext}
          initialState={draftPathState}
          onStateChange={setDraftPathState}
          onBack={() => setFlowStep(isLinkedMatterFlow ? 'start' : 'context')}
          onSaveDraft={handleDraftSave}
          onNotice={setNotice}
        />
      )}

      {flowStep === 'upload' && (
        <UploadPath
          isLinkedMatter={Boolean(isLinkedMatterFlow)}
          onBack={() => setFlowStep(isLinkedMatterFlow ? 'start' : 'context')}
          onComplete={handleUploadComplete}
        />
      )}

      {flowStep === 'confirm' && (
        <ConfirmIdentityStep
          suggestedMatterName={suggestedMatterName}
          summaryFields={summaryFields}
          onBack={() => setFlowStep(entryChoice === 'upload-existing' ? 'upload' : 'draft')}
          onConfirm={handleConfirmIdentity}
        />
      )}

      {flowStep === 'register' && registerRevealData && (
        <RegisterReveal
          data={registerRevealData}
          onContinueDrafting={() => setFlowStep(entryChoice === 'upload-existing' ? 'upload' : 'draft')}
          onNotice={setNotice}
        />
      )}
    </div>
  );
}
