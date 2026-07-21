'use client';

import React from 'react';
import { useDurableAutosave, type AutosaveStatus } from '@/lib/documents/useDurableAutosave';
import { serializeDraftPayload, parseDraftPayload } from '@/lib/documents/editor/draft-payload';
import { DEFAULT_PAGE_SETUP, type PageSetup } from '@/lib/documents/editor/page-setup';
import { LEGAL_TEMPLATES, BLANK_DRAFT_TITLE, type LegalTemplate } from '@/lib/documents/editor/templates';
import { useDocumentEditor } from '@/components/document-editor/useDocumentEditor';
import { Toolbar } from '@/components/document-editor/Toolbar';
import { PageSetupPanel } from '@/components/document-editor/PageSetupPanel';
import { TemplateLibrary } from '@/components/document-editor/TemplateLibrary';
import { DocumentCanvas } from '@/components/document-editor/DocumentCanvas';

const AUTOSAVE_STATUS_LABEL: Record<AutosaveStatus, string> = {
  saving: 'Saving',
  saved: 'Saved',
  offline: 'Offline',
  save_failed: 'Save Failed',
  conflict_detected: 'Conflict Detected',
  recovered_draft: 'Recovered Draft',
  unauthenticated: 'Local Draft',
};

const AUTOSAVE_STATUS_DOT: Record<AutosaveStatus, string> = {
  saving: 'bg-amber-500 animate-pulse',
  saved: 'bg-emerald-500',
  offline: 'bg-slate-400',
  save_failed: 'bg-red-500',
  conflict_detected: 'bg-red-500',
  recovered_draft: 'bg-amber-500',
  unauthenticated: 'bg-sky-500',
};

const UNAUTHENTICATED_MESSAGE = 'Local draft — phone verification required for permanent saving.';

/**
 * Document Creator — the Document Creator/manual-drafting workspace.
 * Rebuilt on top of the same durable-draft/autosave foundation Phase 2
 * shipped (useDurableAutosave, IndexedDB recovery, revision-guarded
 * conflict detection, the local-only unauthenticated path) — only the
 * page's own UI and the editor itself changed. See
 * lib/documents/editor/draft-payload.ts for how the rich-text content,
 * page setup, and template identity are packed into the one opaque
 * `content` string that autosave/draft-store.ts and the DocumentDraft API
 * already know how to store, so none of that server-side contract moved.
 */
export default function DraftBuilderPage() {
  const [draftTitle, setDraftTitle] = React.useState(BLANK_DRAFT_TITLE);
  const [pageSetup, setPageSetup] = React.useState<PageSetup>(DEFAULT_PAGE_SETUP);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);
  const [currentHtml, setCurrentHtml] = React.useState('');
  const [pendingTemplate, setPendingTemplate] = React.useState<LegalTemplate | null | 'blank'>(null);
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);
  const [mobilePanel, setMobilePanel] = React.useState<'none' | 'templates' | 'pageSetup'>('none');

  const editor = useDocumentEditor({
    editable: true,
    onUpdateHtml: setCurrentHtml,
  });

  const serializedContent = React.useMemo(
    () => serializeDraftPayload({ html: currentHtml, pageSetup, templateId: selectedTemplateId }),
    [currentHtml, pageSetup, selectedTemplateId]
  );

  // Tiptap's `useEditor` is configured with `immediatelyRender: false`
  // (required to avoid SSR hydration mismatches in Next.js) — `editor`
  // starts as null and only becomes real once Tiptap's own mount effect
  // runs. Recovery fires from useDurableAutosave's own mount effect,
  // whose `onRecovered` reference is captured once (on the hook's first
  // render) and never updated — so a `restoreRecovered` that branches on
  // the *current* `editor` closure variable would always see it as null,
  // no matter how much later the callback actually fires. Queuing the
  // recovered HTML in STATE (not a ref) and consuming it from an effect
  // keyed on both `editor` and the queued value handles either
  // ordering — editor ready first, or recovery arriving first — since
  // the effect re-evaluates whenever either one changes, not just once.
  const [pendingRestoreHtml, setPendingRestoreHtml] = React.useState<string | null>(null);

  const restoreRecovered = React.useCallback((recoveredContent: string, recoveredTitle: string | null) => {
    const parsed = parseDraftPayload(recoveredContent);
    setPendingRestoreHtml(parsed.html);
    setPageSetup(parsed.pageSetup);
    setSelectedTemplateId(parsed.templateId);
    setDraftTitle(recoveredTitle || BLANK_DRAFT_TITLE);
  }, []);

  React.useEffect(() => {
    if (editor && pendingRestoreHtml !== null) {
      editor.commands.setContent(pendingRestoreHtml, { emitUpdate: false });
      setCurrentHtml(pendingRestoreHtml);
      setPendingRestoreHtml(null);
    }
  }, [editor, pendingRestoreHtml]);

  const autosave = useDurableAutosave({
    storageKey: 'draft-builder-session',
    title: draftTitle,
    content: serializedContent,
    onRecovered: (recovered) => restoreRecovered(recovered.content, recovered.title),
  });

  React.useEffect(() => {
    if (autosave.status === 'saved') setLastSavedAt(new Date());
  }, [autosave.status]);

  const applyTemplate = React.useCallback(
    async (template: LegalTemplate | null) => {
      const html = template?.html ?? '';
      const nextPageSetup = template?.pageSetup ?? DEFAULT_PAGE_SETUP;
      const nextTitle = template?.name ?? BLANK_DRAFT_TITLE;

      editor?.commands.setContent(html, { emitUpdate: false });
      setCurrentHtml(html);
      setPageSetup(nextPageSetup);
      setSelectedTemplateId(template?.id ?? null);
      setDraftTitle(nextTitle);
      setPendingTemplate(null);

      // Selecting a template always starts an independent draft — it
      // must never overwrite whatever the advocate was already working
      // on, and the master template itself (lib/documents/editor/
      // templates.ts) is never mutated; only this brand-new draft's copy
      // of its HTML is.
      await autosave.startNewDraft({
        title: nextTitle,
        content: serializeDraftPayload({ html, pageSetup: nextPageSetup, templateId: template?.id ?? null }),
      });
    },
    [editor, autosave]
  );

  const handleSelectTemplate = (template: LegalTemplate) => {
    const hasSubstantialContent = currentHtml.replace(/<[^>]+>/g, '').trim().length > 40;
    if (hasSubstantialContent && template.id !== selectedTemplateId) {
      setPendingTemplate(template);
      return;
    }
    void applyTemplate(template);
  };

  const handleStartBlank = () => {
    const hasSubstantialContent = currentHtml.replace(/<[^>]+>/g, '').trim().length > 40;
    if (hasSubstantialContent && selectedTemplateId !== null) {
      setPendingTemplate('blank');
      return;
    }
    void applyTemplate(null);
  };

  const confirmReplaceTemplate = () => {
    if (pendingTemplate === 'blank') void applyTemplate(null);
    else if (pendingTemplate) void applyTemplate(pendingTemplate);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans">
      {/* Application header */}
      <div className="border-b border-[#111111]/10 bg-white px-4 md:px-8 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap max-w-[1600px] mx-auto">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-widest text-[#111111]">
              Document Creator
            </h1>
            <input
              aria-label="Document title"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="mt-1 text-sm font-serif italic text-[#111111]/70 bg-transparent border-none outline-none focus:underline w-full max-w-md"
              placeholder="Untitled Draft"
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase font-bold tracking-widest text-[#111111]/60">
              <span className={`w-1.5 h-1.5 rounded-full ${AUTOSAVE_STATUS_DOT[autosave.status]}`}></span>
              {AUTOSAVE_STATUS_LABEL[autosave.status]}
            </span>
            {lastSavedAt && (
              <span className="text-[10px] text-[#B0A588] font-semibold hidden sm:inline">
                Last saved {lastSavedAt.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 border border-[#E7DFC9] text-[#8A6D2F] text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-[#FBF8F1] transition-all no-print"
            >
              🖨 Print / Preview
            </button>
            <div className="flex lg:hidden gap-2">
              <button
                onClick={() => setMobilePanel(mobilePanel === 'templates' ? 'none' : 'templates')}
                className="px-3 py-1.5 border border-[#E7DFC9] text-[#3A3222] text-[10px] font-bold uppercase tracking-widest rounded-lg"
              >
                Templates
              </button>
              <button
                onClick={() => setMobilePanel(mobilePanel === 'pageSetup' ? 'none' : 'pageSetup')}
                className="px-3 py-1.5 border border-[#E7DFC9] text-[#3A3222] text-[10px] font-bold uppercase tracking-widest rounded-lg"
              >
                Page Setup
              </button>
            </div>
          </div>
        </div>
      </div>

      {autosave.status === 'unauthenticated' && (
        <div className="no-print px-4 md:px-8 py-2 bg-sky-50 border-b border-sky-200 text-center">
          <p className="text-xs font-semibold text-sky-800">{UNAUTHENTICATED_MESSAGE}</p>
        </div>
      )}

      {autosave.conflict && (
        <div className="no-print px-4 md:px-8 py-3 bg-red-50 border-b border-red-200 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs font-semibold text-red-700">
            This draft was updated elsewhere since it was last loaded here.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={autosave.loadNewer}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-red-300 text-red-700 hover:bg-red-100 bg-white transition-all"
            >
              Load Newer Version
            </button>
            <button
              onClick={autosave.keepMine}
              className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-red-700 text-white hover:bg-red-800 transition-all"
            >
              Keep Mine
            </button>
          </div>
        </div>
      )}

      {pendingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="text-sm font-bold text-[#111111]">Replace current draft content?</h2>
            <p className="text-xs text-[#5C5340]">
              Selecting a new template starts a fresh, independent draft. Your current draft is not deleted — it
              stays saved under its own id — but this document view will switch to the new template's content.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingTemplate(null)}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#B0A588] hover:text-[#8A6D2F]"
              >
                Cancel
              </button>
              <button
                onClick={confirmReplaceTemplate}
                className="px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
              >
                Start New Draft
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-[240px_1fr_260px] gap-6 px-4 md:px-8 py-6">
        {/* Left panel: the Document Creator's two creation modes —
            "Create Manually" (Start Blank Draft, below) and "Create
            Using Template" (the template cards). The full guided
            questionnaire-driven template assembly workflow is a separate,
            later milestone — selecting a template here loads its
            complete static content directly into the manual editor for
            unrestricted editing, per this milestone's scope. */}
        <aside
          className={`no-print bg-white border border-[#E7DFC9]/80 rounded-xl p-5 shadow-sm h-fit lg:sticky lg:top-6 ${
            mobilePanel === 'templates' ? 'block' : 'hidden'
          } lg:block`}
        >
          <div className="mb-4 pb-4 border-b border-[#F4EEE0]">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-2">Create Manually</h2>
            <button
              type="button"
              onClick={handleStartBlank}
              className="w-full py-2 bg-[#111111] hover:bg-[#111111]/90 text-white text-[10px] uppercase tracking-widest font-bold rounded-lg transition-all"
            >
              Start Blank Draft
            </button>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-1">Create Using Template</h2>
            <p className="text-[10px] text-[#B0A588] mb-3">
              Guided, questionnaire-driven assembly is a separate upcoming milestone. For now, selecting a template
              loads its full content directly into the editor below for manual completion.
            </p>
            <TemplateLibrary
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={handleSelectTemplate}
              onStartBlank={handleStartBlank}
              hideBlankAction
            />
          </div>
        </aside>

        {/* Main: Toolbar + Document Canvas */}
        <main className="space-y-4 min-w-0">
          <div className="no-print sticky top-0 z-10">
            <Toolbar editor={editor} />
          </div>
          <div className="bg-[#F4EEE0]/30 rounded-xl border border-[#F4EEE0]">
            <DocumentCanvas
              editor={editor}
              pageSetup={pageSetup}
              defaultFontFamily={LEGAL_TEMPLATES.find((t) => t.id === selectedTemplateId)?.defaultFontFamily ?? 'Times New Roman'}
            />
          </div>
        </main>

        {/* Right panel: Page Setup + document properties */}
        <aside
          className={`no-print bg-white border border-[#E7DFC9]/80 rounded-xl p-5 shadow-sm h-fit lg:sticky lg:top-6 space-y-6 ${
            mobilePanel === 'pageSetup' ? 'block' : 'hidden'
          } lg:block`}
        >
          <PageSetupPanel pageSetup={pageSetup} onChange={setPageSetup} />

          <div className="space-y-2 pt-4 border-t border-[#F4EEE0]">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">Document Properties</h2>
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-[#8A7A56] font-semibold">Template</dt>
                <dd className="text-[#3A3222] font-bold text-right">
                  {LEGAL_TEMPLATES.find((t) => t.id === selectedTemplateId)?.name ?? 'Blank Draft'}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#8A7A56] font-semibold">Jurisdiction</dt>
                <dd className="text-[#3A3222] font-bold text-right">
                  {LEGAL_TEMPLATES.find((t) => t.id === selectedTemplateId)?.jurisdiction ?? '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#8A7A56] font-semibold">Document Type</dt>
                <dd className="text-[#3A3222] font-bold text-right">
                  {LEGAL_TEMPLATES.find((t) => t.id === selectedTemplateId)?.documentType ?? 'UNTYPED'}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#8A7A56] font-semibold">Matter</dt>
                {/* Honest by construction: this page never fetches or
                    links a Matter Register record — the visible Matter
                    Register is still mock/prototype data (see
                    dashboard/matters), so claiming a real link here would
                    be a fabricated connection. */}
                <dd className="text-[#3A3222] font-bold text-right">Unlinked Draft</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-[#8A7A56] font-semibold">Draft Status</dt>
                <dd className="text-[#3A3222] font-bold text-right">{AUTOSAVE_STATUS_LABEL[autosave.status]}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
