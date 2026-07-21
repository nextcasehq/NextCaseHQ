'use client';

import React from 'react';
import { useDurableAutosave, type AutosaveStatus } from '@/lib/documents/useDurableAutosave';
import { serializeDraftPayload, parseDraftPayload } from '@/lib/documents/editor/draft-payload';
import { DEFAULT_PAGE_SETUP, clampZoom, pageDimensionsMm, type PageSetup } from '@/lib/documents/editor/page-setup';
import { LEGAL_TEMPLATES, BLANK_DRAFT_TITLE, type LegalTemplate } from '@/lib/documents/editor/templates';
import { useDocumentEditor } from '@/components/document-editor/useDocumentEditor';
import { Ribbon } from '@/components/document-editor/Ribbon';
import { PageSetupPanel } from '@/components/document-editor/PageSetupPanel';
import { TemplateLibrary } from '@/components/document-editor/TemplateLibrary';
import { AttachmentsPanel } from '@/components/document-editor/AttachmentsPanel';
import { DocumentCanvas, MM_TO_PX } from '@/components/document-editor/DocumentCanvas';
import { StatusBar } from '@/components/document-editor/StatusBar';
import { PageThumbnails } from '@/components/document-editor/PageThumbnails';
import { FormattingBubble } from '@/components/document-editor/FormattingBubble';
import { EditorContextMenu } from '@/components/document-editor/EditorContextMenu';

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

type MobileDrawer = 'none' | 'left' | 'right';

/**
 * Document Creator — a Microsoft Word–style legal drafting workspace,
 * rebuilt on top of the exact same durable-draft/autosave foundation
 * Phase 2 shipped (useDurableAutosave, IndexedDB recovery, revision-
 * guarded conflict detection, the local-only unauthenticated path) — only
 * the page's own presentation changed, per
 * docs/document-creator/DOCUMENT_CREATOR_UI_UX_SPECIFICATION.md. See
 * lib/documents/editor/draft-payload.ts for how rich-text content, page
 * setup, and template identity are packed into the one opaque `content`
 * string the DocumentDraft API already knows how to store — that server
 * contract has not moved.
 */
export default function DraftBuilderPage() {
  const [draftTitle, setDraftTitle] = React.useState(BLANK_DRAFT_TITLE);
  const [pageSetup, setPageSetup] = React.useState<PageSetup>(DEFAULT_PAGE_SETUP);
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null);
  const [currentHtml, setCurrentHtml] = React.useState('');
  const [pendingTemplate, setPendingTemplate] = React.useState<LegalTemplate | null | 'blank'>(null);
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);
  const [sessionStartedAt] = React.useState(() => new Date());

  const [mobileDrawer, setMobileDrawer] = React.useState<MobileDrawer>('none');
  const [leftOpen, setLeftOpen] = React.useState(true);
  const [rightOpen, setRightOpen] = React.useState(true);
  const [zoomMode, setZoomMode] = React.useState<'fixed' | 'fit-width'>('fixed');
  const [focusMode, setFocusMode] = React.useState(false);
  const [darkWorkspace, setDarkWorkspace] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [contextMenuPos, setContextMenuPos] = React.useState<{ x: number; y: number } | null>(null);

  const canvasScrollRef = React.useRef<HTMLDivElement>(null);

  const editor = useDocumentEditor({ editable: true, onUpdateHtml: setCurrentHtml });

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

  const handlePrint = () => window.print();

  const activeTemplate = LEGAL_TEMPLATES.find((t) => t.id === selectedTemplateId);

  const plainText = editor?.getText() ?? '';
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  // Legal-drafting convention: character count excludes whitespace.
  const characterCount = plainText.replace(/\s/g, '').length;
  const pageCount = (currentHtml.match(/data-page-break/g) ?? []).length + 1;

  const computeFitWidthZoom = React.useCallback(() => {
    const container = canvasScrollRef.current;
    if (!container) return;
    const { width } = pageDimensionsMm(pageSetup.paperSize, pageSetup.orientation);
    const widthPx = width * MM_TO_PX;
    const available = container.clientWidth - 64;
    const nextZoom = clampZoom(Math.round((available / widthPx) * 100));
    setZoomMode('fit-width');
    setPageSetup((prev) => ({ ...prev, zoom: nextZoom }));
  }, [pageSetup.paperSize, pageSetup.orientation]);

  React.useEffect(() => {
    if (zoomMode !== 'fit-width') return;
    const handleResize = () => computeFitWidthZoom();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [zoomMode, computeFitWidthZoom]);

  const handlePageSetupChange = (next: PageSetup) => {
    setZoomMode('fixed');
    setPageSetup(next);
  };

  const handleNavigateToPage = (page: number) => {
    const container = canvasScrollRef.current;
    if (!container) return;
    if (page <= 1) {
      container.scrollTo({ top: 0, behavior: 'smooth' });
      setCurrentPage(1);
      return;
    }
    const breaks = container.querySelectorAll('#nchq-print-page [data-page-break]');
    const target = breaks[page - 2] as HTMLElement | undefined;
    if (target) {
      container.scrollTo({ top: target.offsetTop - 40, behavior: 'smooth' });
      setCurrentPage(page);
    }
  };

  React.useEffect(() => {
    const container = canvasScrollRef.current;
    if (!container) return;
    const handleScroll = () => {
      const breaks = Array.from(container.querySelectorAll('#nchq-print-page [data-page-break]')) as HTMLElement[];
      const threshold = container.scrollTop + container.clientHeight / 3;
      let page = 1;
      for (const el of breaks) {
        if (el.offsetTop < threshold) page += 1;
        else break;
      }
      setCurrentPage(page);
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const workspaceBg = darkWorkspace ? 'bg-[#1C1B19]' : 'bg-[#FDFBF7]';
  const chromeBg = darkWorkspace ? 'bg-[#232220] border-[#3A3830]' : 'bg-white border-[#E7DFC9]/80';
  const chromeText = darkWorkspace ? 'text-[#D8D3C4]' : 'text-[#3A3222]';
  const canvasPaneBg = darkWorkspace ? 'bg-[#2A2925]' : 'bg-[#E4E0D6]';

  const leftSidebarContent = (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">Templates &amp; Attachments</h2>
        <button
          type="button"
          onClick={() => setLeftOpen(false)}
          aria-label="Collapse left panel"
          className="hidden md:block text-[#B0A588] hover:text-[#8A6D2F] text-xs font-bold"
        >
          ‹
        </button>
      </div>
      {/* The Document Creator's two creation modes — "Create Manually"
          (Start Blank Draft, below) and "Create Using Template" (the
          template cards). Guided questionnaire-driven assembly is a
          separate, later milestone — selecting a template here loads its
          complete static content directly into the manual editor. */}
      <div className="pb-4 border-b border-[#F4EEE0]">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-2">Create Manually</h3>
        <button
          type="button"
          onClick={handleStartBlank}
          className="w-full py-2 bg-[#111111] hover:bg-[#111111]/90 text-white text-[10px] uppercase tracking-widest font-bold rounded-lg transition-all"
        >
          Start Blank Draft
        </button>
      </div>
      <div className="pb-4 border-b border-[#F4EEE0]">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-1">Create Using Template</h3>
        <p className="text-[10px] text-[#B0A588] mb-3">
          Guided, questionnaire-driven assembly is a separate upcoming milestone. For now, selecting a template loads its full
          content directly into the editor below for manual completion.
        </p>
        <TemplateLibrary
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={handleSelectTemplate}
          onStartBlank={handleStartBlank}
          hideBlankAction
        />
      </div>
      <AttachmentsPanel />
      <div className="pt-4 border-t border-[#F4EEE0] opacity-60">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-1">AI Panel</h3>
        <p className="text-[10px] text-[#B0A588] italic">Reserved for a future milestone.</p>
      </div>
    </>
  );

  const rightSidebarContent = (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">Page Setup &amp; Properties</h2>
        <button
          type="button"
          onClick={() => setRightOpen(false)}
          aria-label="Collapse right panel"
          className="hidden md:block text-[#B0A588] hover:text-[#8A6D2F] text-xs font-bold"
        >
          ›
        </button>
      </div>
      <PageSetupPanel
        pageSetup={pageSetup}
        onChange={handlePageSetupChange}
        onFitWidth={computeFitWidthZoom}
        isFitWidth={zoomMode === 'fit-width'}
      />
      <div className="space-y-2 pt-4 border-t border-[#F4EEE0]">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">Document Information</h2>
        <dl className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-[#8A7A56] font-semibold">Template</dt>
            <dd className="text-[#3A3222] font-bold text-right">{activeTemplate?.name ?? 'Blank Draft'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[#8A7A56] font-semibold">Document Type</dt>
            <dd className="text-[#3A3222] font-bold text-right">{activeTemplate?.documentType ?? 'UNTYPED'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[#8A7A56] font-semibold">Matter</dt>
            {/* Honest by construction: this page never fetches or links a
                Matter Register record — claiming a real link here would be
                a fabricated connection. */}
            <dd className="text-[#3A3222] font-bold text-right">Unlinked Draft</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[#8A7A56] font-semibold">Status</dt>
            <dd className="text-[#3A3222] font-bold text-right">{AUTOSAVE_STATUS_LABEL[autosave.status]}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[#8A7A56] font-semibold">Created</dt>
            {/* No server-side created_at is exposed by the autosave API
                (an API-contract change, out of scope here), so this is
                honestly labeled as this browser session's start time, not
                claimed as the document's true original creation date. */}
            <dd className="text-[#3A3222] font-bold text-right">
              {sessionStartedAt.toLocaleTimeString()} <span className="font-normal text-[#B0A588]">(session)</span>
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[#8A7A56] font-semibold">Last Saved</dt>
            <dd className="text-[#3A3222] font-bold text-right">{lastSavedAt ? lastSavedAt.toLocaleTimeString() : '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[#8A7A56] font-semibold">Page Count</dt>
            <dd className="text-[#3A3222] font-bold text-right">{pageCount}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[#8A7A56] font-semibold">Word Count</dt>
            <dd className="text-[#3A3222] font-bold text-right">{wordCount}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[#8A7A56] font-semibold">Character Count</dt>
            <dd className="text-[#3A3222] font-bold text-right">{characterCount}</dd>
          </div>
        </dl>
      </div>
    </>
  );

  return (
    <div className={`h-screen flex flex-col overflow-hidden font-sans ${workspaceBg}`}>
      {!focusMode && (
        <header className={`no-print shrink-0 border-b px-4 md:px-6 py-3 ${chromeBg}`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileDrawer(mobileDrawer === 'left' ? 'none' : 'left')}
                aria-label="Toggle templates and attachments"
                className={`md:hidden px-2.5 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-widest ${chromeBg} ${chromeText}`}
              >
                ☰
              </button>
              <div>
                <h1 className={`text-lg md:text-xl font-black uppercase tracking-widest ${chromeText}`}>Document Creator</h1>
                <input
                  aria-label="Document title"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className={`mt-0.5 text-xs font-serif italic bg-transparent border-none outline-none focus:underline w-full max-w-md ${chromeText} opacity-70`}
                  placeholder="Untitled Draft"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`flex items-center gap-1.5 text-[10px] font-mono uppercase font-bold tracking-widest ${chromeText} opacity-70`}>
                <span className={`w-1.5 h-1.5 rounded-full ${AUTOSAVE_STATUS_DOT[autosave.status]}`}></span>
                {AUTOSAVE_STATUS_LABEL[autosave.status]}
              </span>
              <button
                type="button"
                onClick={() => setDarkWorkspace((v) => !v)}
                className={`px-2.5 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-widest ${chromeBg} ${chromeText}`}
              >
                {darkWorkspace ? '☀ Light' : '● Dark'}
              </button>
              <button
                type="button"
                onClick={() => setFocusMode(true)}
                className={`px-2.5 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-widest ${chromeBg} ${chromeText}`}
              >
                ⛶ Focus Mode
              </button>
              <button
                type="button"
                onClick={() => setMobileDrawer(mobileDrawer === 'right' ? 'none' : 'right')}
                aria-label="Toggle page setup and properties"
                className={`md:hidden px-2.5 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-widest ${chromeBg} ${chromeText}`}
              >
                ⚙
              </button>
            </div>
          </div>
        </header>
      )}

      {autosave.status === 'unauthenticated' && (
        <div className="no-print shrink-0 px-4 md:px-6 py-2 bg-sky-50 border-b border-sky-200 text-center">
          <p className="text-xs font-semibold text-sky-800">{UNAUTHENTICATED_MESSAGE}</p>
        </div>
      )}

      {autosave.conflict && (
        <div className="no-print shrink-0 px-4 md:px-6 py-3 bg-red-50 border-b border-red-200 flex items-center justify-between gap-4 flex-wrap">
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

      {!focusMode && (
        <div className="no-print shrink-0 px-4 md:px-6 pt-3">
          <Ribbon editor={editor} pageSetup={pageSetup} onPageSetupChange={handlePageSetupChange} onPrint={handlePrint} />
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {!focusMode && (
          <aside
            style={{ width: leftOpen ? '272px' : '0px' }}
            className={`no-print hidden md:flex flex-col overflow-hidden transition-all duration-200 border-r ${chromeBg}`}
          >
            <div className="w-[272px] shrink-0 overflow-y-auto p-4 space-y-4">{leftSidebarContent}</div>
          </aside>
        )}

        {!focusMode && !leftOpen && (
          <button
            type="button"
            onClick={() => setLeftOpen(true)}
            aria-label="Expand left panel"
            className={`no-print hidden md:flex items-center justify-center w-4 shrink-0 border-r ${chromeBg} ${chromeText} hover:bg-[#FBF8F1]`}
          >
            ›
          </button>
        )}

        <main ref={canvasScrollRef} onContextMenu={handleContextMenu} className={`relative flex-1 overflow-auto ${canvasPaneBg}`}>
          <FormattingBubble editor={editor} />
          <div className="absolute top-3 right-3 z-10 no-print bg-white/90 border border-[#E7DFC9] rounded-lg px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#8A6D2F] shadow-sm">
            {pageSetup.paperSize} · {pageSetup.orientation === 'landscape' ? 'Landscape' : 'Portrait'} · {pageSetup.margins.top}/
            {pageSetup.margins.right}/{pageSetup.margins.bottom}/{pageSetup.margins.left}mm
          </div>
          <DocumentCanvas editor={editor} pageSetup={pageSetup} defaultFontFamily={activeTemplate?.defaultFontFamily ?? 'Times New Roman'} />
        </main>

        {!focusMode && (
          <div className={`no-print hidden md:block w-16 shrink-0 overflow-y-auto border-l ${chromeBg}`}>
            <PageThumbnails pageCount={pageCount} currentPage={currentPage} onNavigate={handleNavigateToPage} orientation={pageSetup.orientation} />
          </div>
        )}

        {!focusMode && !rightOpen && (
          <button
            type="button"
            onClick={() => setRightOpen(true)}
            aria-label="Expand right panel"
            className={`no-print hidden md:flex items-center justify-center w-4 shrink-0 border-l ${chromeBg} ${chromeText} hover:bg-[#FBF8F1]`}
          >
            ‹
          </button>
        )}

        {!focusMode && (
          <aside
            style={{ width: rightOpen ? '288px' : '0px' }}
            className={`no-print hidden md:flex flex-col overflow-hidden transition-all duration-200 border-l ${chromeBg}`}
          >
            <div className="w-[288px] shrink-0 overflow-y-auto p-4 space-y-4">{rightSidebarContent}</div>
          </aside>
        )}

        {mobileDrawer !== 'none' && (
          <>
            <div className="no-print fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setMobileDrawer('none')} />
            <div
              className={`no-print fixed inset-y-0 z-50 w-72 bg-white shadow-2xl md:hidden overflow-y-auto p-4 space-y-4 ${
                mobileDrawer === 'left' ? 'left-0' : 'right-0'
              }`}
            >
              <button
                type="button"
                onClick={() => setMobileDrawer('none')}
                aria-label="Close panel"
                className="text-[#B0A588] hover:text-[#8A6D2F] text-xs font-bold uppercase tracking-widest"
              >
                ✕ Close
              </button>
              {mobileDrawer === 'left' ? leftSidebarContent : rightSidebarContent}
            </div>
          </>
        )}
      </div>

      {!focusMode && (
        <StatusBar
          currentPage={currentPage}
          pageCount={pageCount}
          zoom={pageSetup.zoom}
          paperSize={pageSetup.paperSize}
          orientation={pageSetup.orientation}
          autosaveLabel={AUTOSAVE_STATUS_LABEL[autosave.status]}
          autosaveDotClass={AUTOSAVE_STATUS_DOT[autosave.status]}
          wordCount={wordCount}
          characterCount={characterCount}
        />
      )}

      {focusMode && (
        <button
          type="button"
          onClick={() => setFocusMode(false)}
          className="no-print fixed bottom-4 right-4 z-40 px-4 py-2 bg-[#111111] text-white text-xs font-bold uppercase tracking-widest rounded-lg shadow-lg"
        >
          Exit Focus Mode
        </button>
      )}

      <EditorContextMenu editor={editor} position={contextMenuPos} onClose={() => setContextMenuPos(null)} />
    </div>
  );
}
