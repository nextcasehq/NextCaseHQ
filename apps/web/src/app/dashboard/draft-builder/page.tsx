'use client';

import React from 'react';
import { useDurableAutosave, pointerKey, type AutosaveStatus } from '@/lib/documents/useDurableAutosave';
import { serializeDraftPayload, parseDraftPayload } from '@/lib/documents/editor/draft-payload';
import { DEFAULT_PAGE_SETUP, clampZoom, pageDimensionsMm, type PageSetup } from '@/lib/documents/editor/page-setup';
import { LEGAL_TEMPLATES, BLANK_DRAFT_TITLE, type LegalTemplate } from '@/lib/documents/editor/templates';
import { getInterviewConfigForTemplate } from '@/lib/documents/survey/registry';
import type { InterviewConfig } from '@/lib/documents/survey/types';
import { useDocumentEditor } from '@/components/document-editor/useDocumentEditor';
import { Ribbon } from '@/components/document-editor/Ribbon';
import { MobileToolbar } from '@/components/document-editor/MobileToolbar';
import { PageSetupPanel } from '@/components/document-editor/PageSetupPanel';
import { TemplateLibrary } from '@/components/document-editor/TemplateLibrary';
import { AttachmentsPanel } from '@/components/document-editor/AttachmentsPanel';
import { DocumentCanvas, MM_TO_PX } from '@/components/document-editor/DocumentCanvas';
import { StatusBar } from '@/components/document-editor/StatusBar';
import { PageThumbnails } from '@/components/document-editor/PageThumbnails';
import { FormattingBubble } from '@/components/document-editor/FormattingBubble';
import { EditorContextMenu } from '@/components/document-editor/EditorContextMenu';
import { SurveyWizard } from '@/components/document-editor/SurveyWizard';

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

// 'left' (Templates & Attachments) is the only sidebar with this
// mobile-only overlay-drawer behavior now — Page Setup & Properties is a
// slide-over drawer at every breakpoint, tracked separately by
// `pageSetupOpen` below, since it's never a persistent sidebar anymore.
type MobileDrawer = 'none' | 'left';

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
  // A guided interview's generated draft, awaiting the same
  // substantial-content confirmation gate direct template selection
  // already goes through — set only once the advocate clicks "Generate
  // Draft" inside the wizard, never while the interview itself is open.
  const [pendingGeneratedDraft, setPendingGeneratedDraft] = React.useState<{ template: LegalTemplate; html: string } | null>(null);
  // Which guided interview (if any) is currently open in place of the
  // document canvas. Opening one never touches the current draft — only
  // completing it (via pendingGeneratedDraft above) can.
  const [activeInterview, setActiveInterview] = React.useState<{ template: LegalTemplate; config: InterviewConfig } | null>(null);
  const [lastSavedAt, setLastSavedAt] = React.useState<Date | null>(null);
  // Computed in an effect (client-only, after hydration) rather than a
  // useState lazy initializer: this component is server-rendered first,
  // and `new Date()` evaluated during that render would almost always
  // differ by a tick from the client's own first render of the same
  // component, producing a real hydration-mismatch warning for the
  // "Created" field's rendered text.
  const [sessionStartedAt, setSessionStartedAt] = React.useState<Date | null>(null);
  React.useEffect(() => {
    setSessionStartedAt(new Date());
  }, []);

  const [mobileDrawer, setMobileDrawer] = React.useState<MobileDrawer>('none');
  // A brand-new visitor (no resumable draft pointer yet — see
  // useDurableAutosave's own localStorage key) otherwise lands silently on
  // a blank editor with the Template Library tucked behind an icon-only
  // hamburger, easy to miss entirely on a small screen. Surfacing it once,
  // automatically, up front — exactly like Google Docs/Word's own "choose
  // a template" gallery on a new document — costs nothing for anyone
  // resuming an existing draft (the pointer already exists by then) and
  // costs one dismissible tap for anyone who genuinely wants to start
  // blank. Desktop already shows the same Template Library permanently in
  // its sidebar, so this only needs to run below the md breakpoint.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasExistingDraft = window.localStorage.getItem(pointerKey('draft-builder-session')) !== null;
    if (!hasExistingDraft && window.matchMedia('(max-width: 767px)').matches) {
      setMobileDrawer('left');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [leftOpen, setLeftOpen] = React.useState(true);
  // Page Setup & Properties is a slide-over drawer at every breakpoint —
  // never a persistent sidebar the way it used to be. It's touched once
  // per document at most (paper size, margins, the read-only Document
  // Properties block); no benchmark editor (Docs, Word, Pages) keeps page
  // setup as permanent chrome, so there is no default-open state to
  // reconcile with the server render the way leftOpen has to below.
  const [pageSetupOpen, setPageSetupOpen] = React.useState(false);
  // Below desktop (lg), the left sidebar persistently open (unlike
  // mobile, it doesn't collapse into a drawer here — see the aside
  // element's own `hidden md:flex`) leaves the canvas so narrow that even
  // the 50% zoom floor doesn't fit, so the page silently overflows behind
  // the sidebar and becomes unclickable there. Defaulting to collapsed
  // reuses the existing expand/collapse toggle already built for
  // reclaiming canvas space — the advocate can still reopen it with one
  // tap. Starts true to match the server-rendered default (avoiding a
  // hydration mismatch) and flips after mount, same pattern as
  // sessionStartedAt above.
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(max-width: 1023px)').matches) {
      setLeftOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [zoomMode, setZoomMode] = React.useState<'fixed' | 'fit-width'>('fixed');
  const [focusMode, setFocusMode] = React.useState(false);
  const [darkWorkspace, setDarkWorkspace] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [contextMenuPos, setContextMenuPos] = React.useState<{ x: number; y: number } | null>(null);
  // Dark workspace is a set-once-per-session preference, not something
  // reached for continuously the way Focus Mode is — no benchmark editor
  // (Docs, Word, Notion) gives it the same permanent top-bar weight as the
  // document title, so it lives behind a small overflow menu instead.
  const [headerMenuOpen, setHeaderMenuOpen] = React.useState(false);
  React.useEffect(() => {
    if (!headerMenuOpen) return;
    const close = () => setHeaderMenuOpen(false);
    const id = window.setTimeout(() => window.addEventListener('click', close), 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('click', close);
    };
  }, [headerMenuOpen]);

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
    // `htmlOverride` is how a guided interview's generated draft reaches
    // the editor: same independent-new-draft path as a directly-loaded
    // template, just with the interview's filled-in HTML instead of the
    // template's raw master HTML.
    async (template: LegalTemplate | null, htmlOverride?: string) => {
      const html = htmlOverride ?? template?.html ?? '';
      const nextPageSetup = template?.pageSetup ?? DEFAULT_PAGE_SETUP;
      const nextTitle = template?.name ?? BLANK_DRAFT_TITLE;

      editor?.commands.setContent(html, { emitUpdate: false });
      setCurrentHtml(html);
      setPageSetup(nextPageSetup);
      setSelectedTemplateId(template?.id ?? null);
      setDraftTitle(nextTitle);
      setPendingTemplate(null);
      setPendingGeneratedDraft(null);

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
    // On mobile the library lives in a slide-out drawer over the canvas —
    // dismiss it as soon as a choice is made so the wizard/editor
    // underneath is actually visible, instead of staying hidden behind it.
    setMobileDrawer('none');
    const interviewConfig = getInterviewConfigForTemplate(template.id);
    if (interviewConfig) {
      // Opening the interview never touches the current draft — it's a
      // wizard rendered in place of the canvas, on this same page, until
      // "Generate Draft" is clicked.
      setActiveInterview({ template, config: interviewConfig });
      return;
    }
    const hasSubstantialContent = currentHtml.replace(/<[^>]+>/g, '').trim().length > 40;
    if (hasSubstantialContent && template.id !== selectedTemplateId) {
      setPendingTemplate(template);
      return;
    }
    void applyTemplate(template);
  };

  const handleSurveyGenerate = (template: LegalTemplate, html: string) => {
    setActiveInterview(null);
    const hasSubstantialContent = currentHtml.replace(/<[^>]+>/g, '').trim().length > 40;
    if (hasSubstantialContent) {
      setPendingGeneratedDraft({ template, html });
      return;
    }
    void applyTemplate(template, html);
  };

  const handleStartBlank = () => {
    setMobileDrawer('none');
    const hasSubstantialContent = currentHtml.replace(/<[^>]+>/g, '').trim().length > 40;
    if (hasSubstantialContent && selectedTemplateId !== null) {
      setPendingTemplate('blank');
      return;
    }
    void applyTemplate(null);
  };

  const confirmReplaceTemplate = () => {
    if (pendingGeneratedDraft) {
      void applyTemplate(pendingGeneratedDraft.template, pendingGeneratedDraft.html);
      return;
    }
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
    // Capped at 100: on a wide desktop window, letting this grow past the
    // page's real print size would work against the "see nearly a whole
    // page at once" goal Fit Width exists for in the first place — a
    // bigger zoom shows more detail per screen-inch but proportionally
    // LESS of the page's total height on screen, the opposite of what a
    // wide monitor should buy the advocate. Below 100% (a narrow tablet or
    // phone), it still shrinks exactly as before.
    const nextZoom = Math.min(100, clampZoom(Math.round((available / widthPx) * 100)));
    setZoomMode('fit-width');
    setPageSetup((prev) => ({ ...prev, zoom: nextZoom }));
  }, [pageSetup.paperSize, pageSetup.orientation]);

  React.useEffect(() => {
    if (zoomMode !== 'fit-width') return;
    const handleResize = () => computeFitWidthZoom();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [zoomMode, computeFitWidthZoom]);

  // Below desktop (lg), the sidebars/thumbnail rail used to leave too
  // little room for a full-width A4/Letter page at the 100% zoom
  // default — the page rendered far wider than the available viewport,
  // mostly centered off-screen, making the editor practically untappable
  // on a phone (see the mobile toolbar's own regression coverage for how
  // this was found: typing appeared to work in a Playwright test because
  // the click landed outside the real contenteditable entirely).
  //
  // Fit Width now auto-engages on EVERY viewport, desktop included: a
  // fixed 100% zoom leaves a large, empty grey margin on anything wider
  // than a small laptop — real screen space the advocate is drafting on,
  // sitting unused. Fitting the page to whatever room the canvas actually
  // has (sidebars/thumbnail rail included) is the same "use the whole
  // window" behavior Google Docs/Notion default to, and the explicit
  // fixed-zoom buttons (50–200%) remain available for anyone who wants
  // the page at its literal print size instead.
  React.useEffect(() => {
    computeFitWidthZoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selecting a template (or blank) replaces pageSetup wholesale with the
  // template's own — always zoom: 100 — undoing Fit Width the same way a
  // fresh paper size/orientation would. Recomputing whenever
  // selectedTemplateId changes (not just paperSize/orientation) catches
  // the common case of two templates sharing the same A4/portrait
  // dimensions, where paperSize/orientation alone wouldn't change.
  // leftOpen is included too: toggling that sidebar changes the canvas's
  // available width just as much as a resize does, but doesn't fire a
  // window 'resize' event — without this, the auto-collapse above would
  // leave zoom computed against the still-narrow pre-collapse width from
  // the very first render. Page Setup & Properties needs no equivalent
  // entry: it's a slide-over drawer that overlays the canvas rather than
  // resizing it, so opening/closing it never changes the available width.
  React.useEffect(() => {
    if (zoomMode === 'fit-width') computeFitWidthZoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSetup.paperSize, pageSetup.orientation, selectedTemplateId, leftOpen]);

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
      {/* One flat gallery, not two separately-labelled sections for
          starting blank vs. picking a template — Blank Document is just
          the first card, same weight as every template, the way Google
          Docs' and Word's own "new document" picker work. Templates
          tagged "Guided Interview" open a step-based questionnaire (see
          SurveyWizard) whose answers generate the draft; all other
          templates load their static content directly into the manual
          editor — see the badge on each card. */}
      <div className="pb-4 border-b border-[#F4EEE0] last:border-b-0 last:pb-0">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#B0A588] mb-2">Create a Document</h3>
        <TemplateLibrary
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={handleSelectTemplate}
          onStartBlank={handleStartBlank}
          isBlankSelected={selectedTemplateId === null}
        />
      </div>
      {/* Trimmed from a 9-row block (Status, Matter, Template, Pages,
          Words, Characters, Created, Last Saved, Autosave Status) down to
          the two rows that were genuinely unique here. Status and
          Autosave Status showed the identical value twice in this same
          panel, Pages/Words/Characters duplicate the status bar exactly,
          Matter never varies (always "Unlinked Draft" — no Matter Register
          link exists yet), and Template repeats what's already visible via
          the highlighted card in the gallery above. Created and Last Saved
          are the only facts not shown anywhere else on screen. */}
      <div className="pb-4 border-b border-[#F4EEE0] last:border-b-0 last:pb-0 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">Draft Info</h3>
        <dl className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-[#8A7A56] font-semibold">Created</dt>
            {/* No server-side created_at is exposed by the autosave API
                (an API-contract change, out of scope here), so this is
                honestly labeled as this browser session's start time, not
                claimed as the document's true original creation date. */}
            <dd className="text-[#3A3222] font-bold text-right">
              {sessionStartedAt ? sessionStartedAt.toLocaleTimeString() : '—'}{' '}
              <span className="font-normal text-[#B0A588]">(session)</span>
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[#8A7A56] font-semibold">Last Saved</dt>
            <dd className="text-[#3A3222] font-bold text-right">{lastSavedAt ? lastSavedAt.toLocaleTimeString() : '—'}</dd>
          </div>
        </dl>
      </div>
      <div className="pb-4 last:border-b-0 last:pb-0">
        <AttachmentsPanel />
      </div>
    </>
  );

  const rightSidebarContent = (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">Page Setup &amp; Properties</h2>
        <button
          type="button"
          onClick={() => setPageSetupOpen(false)}
          aria-label="Close panel"
          className="text-[#B0A588] hover:text-[#8A6D2F] text-xs font-bold uppercase tracking-widest"
        >
          ✕ Close
        </button>
      </div>
      <PageSetupPanel
        pageSetup={pageSetup}
        onChange={handlePageSetupChange}
        onFitWidth={computeFitWidthZoom}
        isFitWidth={zoomMode === 'fit-width'}
      />
      <div className="space-y-2 pt-4 border-t border-[#F4EEE0]">
        <h2 className="text-xs font-bold uppercase tracking-widest text-[#B0A588]">Document Properties</h2>
        <dl className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-[#8A7A56] font-semibold">Document Type</dt>
            <dd className="text-[#3A3222] font-bold text-right">{activeTemplate?.documentType ?? 'UNTYPED'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[#8A7A56] font-semibold">Court</dt>
            <dd className="text-[#3A3222] font-bold text-right">{activeTemplate?.court ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[#8A7A56] font-semibold">Practice Area</dt>
            <dd className="text-[#3A3222] font-bold text-right">{activeTemplate?.practiceArea ?? '—'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-[#8A7A56] font-semibold">Version</dt>
            <dd className="text-[#3A3222] font-bold text-right">{activeTemplate?.version ?? '—'}</dd>
          </div>
        </dl>
      </div>
    </>
  );

  return (
    <div className={`h-screen flex flex-col overflow-hidden font-sans ${workspaceBg}`}>
      {!focusMode && (
        // A single compact row (~36px), not the old two-line stack (a big
        // uppercase "DOCUMENT CREATOR" heading with the editable title on
        // its own line beneath) — the shared dashboard header above this
        // already establishes app context, so this page's own header only
        // needs to carry the document's title plus a few small controls,
        // the same weight Google Docs/Notion give their own title bar.
        <header className={`no-print shrink-0 border-b px-3 py-[6px] ${chromeBg}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileDrawer(mobileDrawer === 'left' ? 'none' : 'left')}
                aria-label="Toggle templates and attachments"
                className={`md:hidden shrink-0 flex items-center gap-1 px-2 py-1 border rounded text-[9px] font-bold uppercase tracking-widest ${chromeBg} ${chromeText}`}
              >
                <span aria-hidden="true">☰</span>
                <span>Templates</span>
              </button>
              {/* No "Document" label here — it was purely decorative (no
                  function, nothing it clarified that the title input
                  itself doesn't already), and the shared dashboard header
                  above already establishes app context. */}
              <input
                aria-label="Document title"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className={`text-sm font-semibold bg-transparent border-none outline-none focus:underline min-w-0 flex-1 max-w-[140px] sm:max-w-md ${chromeText}`}
                placeholder="Untitled Draft"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {/* Autosave status used to also appear here, duplicating the
                  status bar (and, in the sidebar, itself) — removed in
                  favor of the status bar as the one place it's shown. */}
              <button
                type="button"
                onClick={() => setFocusMode(true)}
                className={`px-2 py-1 border rounded text-[9px] font-bold uppercase tracking-widest ${chromeBg} ${chromeText}`}
              >
                ⛶ Focus
              </button>
              <button
                type="button"
                onClick={() => setPageSetupOpen(true)}
                aria-label="Open page setup and properties"
                className={`px-2 py-1 border rounded text-[9px] font-bold uppercase tracking-widest ${chromeBg} ${chromeText}`}
              >
                ⚙<span className="hidden sm:inline"> Page Setup</span>
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setHeaderMenuOpen((v) => !v);
                  }}
                  aria-label="More workspace options"
                  aria-expanded={headerMenuOpen}
                  className={`px-2 py-1 border rounded text-[9px] font-bold uppercase tracking-widest ${chromeBg} ${chromeText}`}
                >
                  ⋯
                </button>
                {headerMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute right-0 top-full mt-1 z-30 w-40 rounded-lg border shadow-lg p-1 ${chromeBg}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setDarkWorkspace((v) => !v);
                        setHeaderMenuOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-[#FBF8F1] ${chromeText}`}
                    >
                      {darkWorkspace ? '☀ Light workspace' : '● Dark workspace'}
                    </button>
                  </div>
                )}
              </div>
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

      {(pendingTemplate || pendingGeneratedDraft) && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <h2 className="text-sm font-bold text-[#111111]">Create New Draft?</h2>
            <p className="text-xs text-[#5C5340]">
              Your current draft is safely preserved. A new independent draft will now be created. Your existing
              draft remains available from Draft History.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setPendingTemplate(null);
                  setPendingGeneratedDraft(null);
                }}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#B0A588] hover:text-[#8A6D2F]"
              >
                Cancel
              </button>
              <button
                onClick={confirmReplaceTemplate}
                className="px-4 py-2 bg-[#8A6D2F] hover:bg-[#6F5624] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all"
              >
                Create New Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {!focusMode && (
        <div className="no-print shrink-0 px-4 md:px-6 pt-3 hidden md:block">
          <Ribbon editor={editor} pageSetup={pageSetup} onPageSetupChange={handlePageSetupChange} onPrint={handlePrint} />
        </div>
      )}
      {!focusMode && <MobileToolbar editor={editor} onPrint={handlePrint} />}

      {/* pb-[24px] reserves the StatusBar's own height (h-[24px], fixed
          bottom-0 — see StatusBar.tsx) since a fixed-position element
          never takes up space in normal flow. Without it, on a short
          viewport (e.g. mobile landscape) the sidebar/editor's own
          scrollable content can extend the full remaining height and end
          up rendered underneath the status bar, both visually clipped and
          unclickable there. */}
      <div className={`flex-1 flex overflow-hidden ${focusMode ? '' : 'pb-[24px]'}`}>
        {!focusMode && (
          <aside
            style={{ width: leftOpen ? '240px' : '0px' }}
            className={`no-print hidden md:flex flex-col overflow-hidden ${leftOpen ? 'border-r' : 'border-r-0'} ${chromeBg}`}
          >
            <div className="w-[240px] shrink-0 overflow-y-auto p-[12px] space-y-3">{leftSidebarContent}</div>
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

        <main ref={canvasScrollRef} onContextMenu={activeInterview ? undefined : handleContextMenu} className={`relative flex-1 overflow-auto ${canvasPaneBg}`}>
          {activeInterview ? (
            <SurveyWizard
              config={activeInterview.config}
              templateHtml={activeInterview.template.html}
              onCancel={() => setActiveInterview(null)}
              onGenerate={(html) => handleSurveyGenerate(activeInterview.template, html)}
            />
          ) : (
            <>
              <FormattingBubble editor={editor} />
              <div className="absolute top-3 right-3 z-10 no-print bg-white/90 border border-[#E7DFC9] rounded-lg px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-[#8A6D2F] shadow-sm">
                {pageSetup.paperSize} · {pageSetup.orientation === 'landscape' ? 'Landscape' : 'Portrait'} · {pageSetup.margins.top}/
                {pageSetup.margins.right}/{pageSetup.margins.bottom}/{pageSetup.margins.left}mm
              </div>
              <DocumentCanvas editor={editor} pageSetup={pageSetup} defaultFontFamily={activeTemplate?.defaultFontFamily ?? 'Times New Roman'} />
            </>
          )}
        </main>

        {/* Only shown for genuinely multi-page documents — a single
            thumbnail has no navigational value and, before this, took up
            60px of permanent width on every fresh (one-page) draft. */}
        {!focusMode && !activeInterview && pageCount > 1 && (
          <div className={`no-print hidden md:block w-[60px] shrink-0 overflow-y-auto border-l ${chromeBg}`}>
            <PageThumbnails pageCount={pageCount} currentPage={currentPage} onNavigate={handleNavigateToPage} orientation={pageSetup.orientation} />
          </div>
        )}

        {mobileDrawer !== 'none' && (
          <>
            {/* top-16 (not inset-0/inset-y-0): the shared dashboard shell's
                top bar (app/dashboard/layout.tsx) sits in its own stacking
                context (its <main isolate> wrapper always paints above
                whatever's inside it, regardless of z-index), so a fixed
                overlay that starts at the true viewport top would be
                visually covered by — and have its own top strip's clicks
                intercepted by — that shared bar. Anchoring below its fixed
                4rem (h-16) height keeps the drawer entirely clickable. */}
            <div
              className="no-print fixed top-16 inset-x-0 bottom-0 bg-black/40 z-40 md:hidden"
              onClick={() => setMobileDrawer('none')}
            />
            <div className="no-print fixed top-16 bottom-0 left-0 z-50 w-72 bg-white shadow-2xl md:hidden overflow-y-auto p-4 space-y-4">
              <button
                type="button"
                onClick={() => setMobileDrawer('none')}
                aria-label="Close panel"
                className="text-[#B0A588] hover:text-[#8A6D2F] text-xs font-bold uppercase tracking-widest"
              >
                ✕ Close
              </button>
              {leftSidebarContent}
            </div>
          </>
        )}

        {/* Page Setup & Properties: a slide-over drawer at every
            breakpoint, not a persistent sidebar — paper size/orientation/
            margins are already one click away via the ribbon's Layout
            menu, and Document Properties is read-only, derived metadata
            nobody edits. Neither earns 240px of permanent width. Same
            top-16 reasoning as the left drawer above, but not md:hidden:
            this one replaces what used to be a desktop-only aside, so it
            has to work at every width, not just mobile. */}
        {pageSetupOpen && (
          <>
            <div className="no-print fixed top-16 inset-x-0 bottom-0 bg-black/40 z-40" onClick={() => setPageSetupOpen(false)} />
            <div className={`no-print fixed top-16 bottom-0 right-0 z-50 w-72 sm:w-80 shadow-2xl overflow-y-auto p-4 space-y-4 ${chromeBg}`}>
              {rightSidebarContent}
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
