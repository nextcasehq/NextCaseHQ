# Document Creator UI/UX Specification

Status: **Approved — UI/UX Baseline**
Scope: The visual design and interaction model of the Document Creator's editing surface (`/dashboard/draft-builder` and the components under `apps/web/src/components/document-editor/`) only — workspace layout, ribbon, side panels, status bar, zoom, ruler, page navigation, style gallery, attachments panel, typography defaults, and visual polish. This document does not define or alter data persistence, autosave behavior, the draft/document model, or API contracts; those remain governed entirely by `DOCUMENT_CREATOR_CONSTITUTION.md`, `DOCUMENT_AUTOSAVE_SPECIFICATION.md`, and `DOCUMENT_CREATOR_IMPLEMENTATION_ROADMAP.md`.

## Purpose

This is the locked reference for how the Document Creator's editing workspace looks and behaves. It supersedes any informal UI direction given before it. Where this document is silent, the existing implementation's behavior stands. Where a later instruction appears to conflict with §"Preserved Invariants" below, the conflict must be raised explicitly before implementation, per `DOCUMENT_CREATOR_GOVERNANCE.md` §10 — never resolved by quietly changing autosave, schema, or API behavior to accommodate a UI idea.

## Preserved Invariants (explicitly out of scope for this document)

This specification is additive UI/UX refinement only. It never authorizes changes to:

- **Autosave architecture** — `useDurableAutosave.ts`, its debounce/conflict/status-machine behavior, as defined in `DOCUMENT_AUTOSAVE_SPECIFICATION.md`.
- **IndexedDB recovery** — the local-first recovery path and its race-safety behavior.
- **The draft/document model** — `DraftPayload`, `serializeDraftPayload`/`parseDraftPayload`, and the underlying `DocumentDraft` table's opaque `content: string` column.
- **API contracts** — `POST`/`GET`/`PATCH /api/documents/drafts[/id]` and every other existing Document Creator route's request/response shape.
- **The phased implementation roadmap** — `DOCUMENT_CREATOR_IMPLEMENTATION_ROADMAP.md`'s phase numbering, scope, and acceptance criteria are unaffected; this UI/UX work is orthogonal to that roadmap's AI-generation-pipeline phases (4–8) and refines the drafting surface Phase 2 already delivered.
- **The SurveyJS questionnaire roadmap** — questionnaire-driven, guided document assembly remains a distinct, separately-approved future milestone. **Note for implementers:** no SurveyJS package or integration exists anywhere in this codebase as of this specification's approval; "preserve the SurveyJS roadmap" means the *intent to build it later remains undisturbed*, not that any existing SurveyJS code must be kept working — there is none yet to preserve.
- **The citation roadmap** — legal citation detection/linking, wherever it is later specified, is not addressed or altered here.

Any new npm package this specification's implementation requires (e.g., a drag-and-drop helper, an additional Tiptap extension) is still subject to `DOCUMENT_CREATOR_GOVERNANCE.md` §3 — named, MIT-or-equivalent-licensed, and justified before use. No paid or non-MIT dependency may be introduced to satisfy this spec.

## 1. Page Setup

- Paper sizes: **A4**, **Letter**, and **Legal** (8.5in × 14in / 215.9mm × 355.6mm).
- Orientation: portrait and landscape for all three sizes.
- Margins, page size, and orientation remain independently changeable, exactly as today.
- The active page configuration (**Paper Size · Orientation · Margins**) is displayed adjacent to the page itself, not only inside a settings form the advocate must open to check.

## 2. Professional Workspace Layout

A Microsoft Word–style workspace, full application width:

- **Left sidebar** — Template Library, Attachments, and a future AI Panel slot (reserved, not yet functional).
- **Center** — the document canvas: a soft grey workspace background, a centered printable page, and a realistic page shadow (the page must read as paper sitting on a surface, not a flat bordered box).
- **Right sidebar** — Page Setup and Document Properties (document type, matter, status, created, last saved, page count, word count, character count — matter remains **"Unlinked Draft"** until Matter Register integration exists, per the existing honest-by-construction convention).
- **Bottom** — a fixed status bar (§7).

Both side panels are optional/collapsible per the responsive rules below; the center canvas is never sacrificed to keep a panel open.

## 3. Ribbon Interface

Replace the flat toolbar with a grouped, tabbed ribbon. Tabs:

- **Home** — clipboard, font, paragraph, and the style gallery (§5).
- **Insert** — page break, and reserved slots for future insert types (image/table/link) if added.
- **Layout** — page setup shortcuts (size, orientation, margins).
- **References** — reserved for future citation/cross-reference tooling; not built out beyond a placeholder tab in this milestone.
- **Review** — reserved for future track-changes/comments tooling; not built out beyond a placeholder tab in this milestone.
- **AI** — reserved, future; visibly present but inert/labeled "coming soon."
- **Export** — print/preview and any export actions already available today.

Every existing Tiptap command already wired into the current toolbar (bold/italic/underline, font family/size, color, highlight, alignment, lists, indent/outdent, line spacing, paragraph spacing before/after, undo/redo, page break) must remain reachable from the ribbon — regrouped, never removed or reimplemented with different semantics. No paid Tiptap extension (Pro/commercial) may be introduced to build any ribbon tab.

## 4. Attachments Panel

A left-sidebar section titled **Attachments**:

- Drag-and-drop upload.
- An explicit upload button (for non-drag input).
- Accepts PDF, DOCX, and image files.
- Uploaded files display with a type-appropriate icon and file name.
- Reserved, forward-compatible shape for future Matter Register linkage and AI context use — no such linkage is implemented now.

This is UI only. No backend storage change is introduced in this milestone: if an existing upload endpoint (`/api/documents/upload`) can be reused as-is for a client-initiated attach action, it may be; otherwise this panel holds an honest, clearly-labeled local/in-memory list with no fabricated persistence claim.

## 5. Legal Style Gallery

Replace the basic Normal/H1/H2/H3 paragraph-style control with a named style gallery:

- Normal
- Court Heading
- Cause Title
- Party Name
- Body
- Prayer
- Affidavit
- Signature Block
- Annexure
- Schedule

Each style maps to a combination of *existing* editor formatting primitives (heading level, alignment, indent, bold, font size/family) — this introduces no new document schema concept and no new Tiptap node/mark type beyond what already exists.

## 6. Page Navigation

- Page thumbnails, one per page (approximated via the existing `PageBreak` node where the document is a single continuous ProseMirror document).
- Clicking a thumbnail navigates/scrolls to that page.
- The current page is visually highlighted.
- Layout is forward-compatible with future page reordering; reordering itself is not implemented now.

## 7. Enhanced Status Bar

Fixed to the bottom of the workspace, displaying:

- Current page / total pages ("Page X of Y")
- Zoom level
- Paper size
- Orientation
- Autosave status (reusing the existing status states/labels — no new status is invented here)
- Word count
- Character count

## 8. Zoom & Ruler

- Zoom presets: 50%, 75%, 100%, 125%, 150%, 200%, and **Fit Width**.
- A horizontal ruler rendered above the document page, scaled to the page's real printed width.
- The ruler is a visual/scaffolding component in this milestone — it is forward-compatible with tab-stop editing but does not implement interactive tab stops yet.

## 9. Professional Typography Defaults

- Default font: **Times New Roman**.
- Additional selectable fonts include **Aptos** and **Calibri** alongside the existing font list.
- Default paragraph alignment: **justified**.
- Default line spacing: **1.5**.

These are defaults applied to new/blank drafts and templates going forward; they do not retroactively rewrite the content of any already-saved draft.

## 10. Visual Polish

- Consistent spacing, alignment, and button sizing across every ribbon group and panel.
- Consistent iconography (one icon set, one visual weight) across the ribbon, attachments panel, and page thumbnails.
- A realistic page shadow and soft-grey workspace background (§2) that reads as premium drafting software, not a bordered `<div>`.
- A contextual formatting bubble that appears near a text selection for quick access to common formatting (bold/italic/highlight/style), supplementing — not replacing — the ribbon.
- A right-click context menu offering the same common actions in context.
- A full-screen focus mode that hides the ribbon/panels/status bar down to just the page, exit-able without losing place or scroll position.
- A dark workspace theme option for the surrounding chrome (ribbon, panels, background) — the document page itself always renders on a white background, matching what will actually print.

## Responsiveness

- **Desktop** — full workspace: both side panels, ribbon, ruler, status bar all visible simultaneously.
- **Tablet** — side panels become collapsible (toggleable, not permanently hidden); center canvas remains primary.
- **Mobile** — editing-only view; both panels move to slide-out drawers reachable via explicit toggles (extending the existing `mobilePanel` toggle pattern already in `page.tsx`), never lost off-screen with no way back.

## Acceptance Criteria

- No regressions in existing Document Creator behavior (autosave, recovery, template selection, print).
- Full Jest suite green; typecheck clean; production build clean.
- No paid dependencies introduced; every new package is MIT-licensed (verified against the installed package's own `package.json`, not just registry metadata), per established project convention.
- Desktop, tablet, and mobile screenshots of the rebuilt workspace are produced and provided before requesting Product Owner review.
