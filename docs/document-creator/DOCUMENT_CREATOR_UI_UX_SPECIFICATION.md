# Document Creator UI/UX Specification

Status: **Approved — UI/UX Baseline (Revision 2)**
Scope: The visual design and interaction model of the Document Creator's editing surface (`/dashboard/draft-builder` and the components under `apps/web/src/components/document-editor/`) only — workspace layout, ribbon, side panels, status bar, zoom, ruler, page navigation, style gallery, attachments panel, template card design, typography defaults, and visual polish. This document does not define or alter data persistence, autosave behavior, the draft/document model, or API contracts; those remain governed entirely by `DOCUMENT_CREATOR_CONSTITUTION.md`, `DOCUMENT_AUTOSAVE_SPECIFICATION.md`, and `DOCUMENT_CREATOR_IMPLEMENTATION_ROADMAP.md`.

## Revision Note (Extension, Not Replacement)

This revision incorporates a further round of UI/UX refinements approved after the original baseline (Revision 1). **Every addition here extends the existing requirements; nothing in this revision removes, weakens, or replaces any earlier requirement.** Where Revision 1 and Revision 2 both describe the same surface (e.g. the ribbon tabs, the style gallery, the zoom presets), Revision 2's wording is the more detailed, current statement of the same requirement — not a divergent one.

Explicitly unaffected by this or any revision of this document:

- `DOCUMENT_CREATOR_CONSTITUTION.md` and its eleven Immutable Rules
- The existing Product Requirements for the Document Creator
- `DOCUMENT_AUTOSAVE_SPECIFICATION.md` and the autosave architecture it governs
- The draft/document model (`DraftPayload`, the `DocumentDraft` table, IndexedDB recovery)
- API contracts (every existing Document Creator route's request/response shape)
- `DOCUMENT_CREATOR_IMPLEMENTATION_ROADMAP.md` and its milestone ordering
- `DOCUMENT_CREATOR_GOVERNANCE.md`'s process rules
- The SurveyJS questionnaire roadmap
- The citation roadmap
- The Matter Register roadmap

This document is a **specification update only**. It authorizes no code change by itself — implementation proceeds only under separate, explicit instruction, exactly as Revision 1 required.

## Purpose

This is the locked reference for how the Document Creator's editing workspace looks and behaves. It supersedes any informal UI direction given before it and is the governing design reference for all future Document Creator implementation work. Where this document is silent, the existing implementation's behavior stands. Where a later instruction appears to conflict with §"Preserved Invariants" below, the conflict must be raised explicitly before implementation, per `DOCUMENT_CREATOR_GOVERNANCE.md` §10 — never resolved by quietly changing autosave, schema, or API behavior to accommodate a UI idea.

## Preserved Invariants (explicitly out of scope for this document)

This specification is additive UI/UX refinement only. It never authorizes changes to:

- **Autosave architecture** — `useDurableAutosave.ts`, its debounce/conflict/status-machine behavior, as defined in `DOCUMENT_AUTOSAVE_SPECIFICATION.md`.
- **IndexedDB recovery** — the local-first recovery path and its race-safety behavior.
- **The draft/document model** — `DraftPayload`, `serializeDraftPayload`/`parseDraftPayload`, and the underlying `DocumentDraft` table's opaque `content: string` column.
- **API contracts** — `POST`/`GET`/`PATCH /api/documents/drafts[/id]` and every other existing Document Creator route's request/response shape.
- **The phased implementation roadmap** — `DOCUMENT_CREATOR_IMPLEMENTATION_ROADMAP.md`'s phase numbering, scope, and acceptance criteria, and its milestone ordering, are unaffected; this UI/UX work is orthogonal to that roadmap's AI-generation-pipeline phases (4–8) and refines the drafting surface Phase 2 already delivered.
- **Governance rules** — `DOCUMENT_CREATOR_GOVERNANCE.md`'s ten process rules are unchanged.
- **The SurveyJS questionnaire roadmap** — questionnaire-driven, guided document assembly remains a distinct, separately-approved future milestone. **Note for implementers:** no SurveyJS package or integration exists anywhere in this codebase as of this specification's approval; "preserve the SurveyJS roadmap" means the *intent to build it later remains undisturbed*, not that any existing SurveyJS code must be kept working — there is none yet to preserve.
- **The citation roadmap** — legal citation detection/linking, wherever it is later specified, is not addressed or altered here.
- **The Matter Register roadmap** — real Matter-linkage for drafts and attachments remains future work; this document only specifies how to represent that absence honestly in the UI today (see §5, §6).

Any new npm package this specification's implementation requires (e.g., a drag-and-drop helper, an additional Tiptap extension) is still subject to `DOCUMENT_CREATOR_GOVERNANCE.md` §3 — named, MIT-or-equivalent-licensed, and justified before use. No paid or non-MIT dependency, no paid Tiptap extension, and no paid SurveyJS component may be introduced to satisfy this spec.

---

## 1. Professional Legal Drafting Workspace

The Document Creator shall resemble professional legal drafting software rather than a generic rich-text editor — a Microsoft Word–style workspace, full application width, while remaining entirely self-hosted using free, MIT-licensed components only.

**Desktop layout:**

- **Left sidebar**
  - Create Manually
  - Create Using Template
  - Current Draft (§5)
  - Attachments (§6)
  - *(Future)* Recent Drafts (§14)
- **Center**
  - Professional document canvas
  - Soft grey editing workspace background
  - White printable paper, centered
  - Realistic paper shadow
  - Correct page dimensions for the active paper size/orientation
- **Right sidebar**
  - Page Setup (§2)
  - Document Properties
- **Bottom**
  - Fixed Status Bar (§8)

Both side panels are optional/collapsible per §21; the center canvas is never sacrificed to keep a panel open.

## 2. Page Setup Enhancements

Support:

- **A4**
- **Legal** (8.5in × 14in / 215.9mm × 355.6mm)
- **Letter**

Support:

- Portrait
- Landscape

Allow:

- Margin presets (sensible common defaults, selectable in one action)
- Custom margins (independent top/right/bottom/left entry, exactly as today)

Display the active page configuration adjacent to the page itself, not only inside a settings form the advocate must open to check:

> Paper Size · Orientation · Margins

## 3. Professional Ribbon

Replace the flat toolbar with grouped ribbon tabs. Tabs:

- **Home** — clipboard, font, paragraph, and the style gallery (§4).
- **Insert** — page break, and reserved slots for future insert types (image/table/link) if added.
- **Layout** — page setup shortcuts (size, orientation, margins).
- **References** — reserved for future citation/cross-reference tooling; not built out beyond a placeholder tab in this milestone.
- **Review** — reserved for future track-changes/comments tooling; not built out beyond a placeholder tab in this milestone.
- **AI** *(future)* — reserved, visibly present but inert/labeled "coming soon."
- **Export** — print/preview and any export actions already available today.

Every existing Tiptap command already wired into the toolbar (bold/italic/underline, font family/size, color, highlight, alignment, lists, indent/outdent, line spacing, paragraph spacing before/after, undo/redo, page break) must remain reachable from the ribbon — regrouped, never removed or reimplemented with different semantics. No paid Tiptap extension (Pro/commercial) may be introduced to build any ribbon tab.

## 4. Legal Style Gallery

Provide reusable legal document styles, replacing the basic Normal/H1/H2/H3 paragraph-style control:

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

Styles map to a combination of *existing* editor formatting primitives (heading level, alignment, indent, bold, font size/family) — this introduces no new document schema concept and no new Tiptap node/mark type beyond what already exists.

## 5. Current Draft Information

Display a **Current Draft** card (left sidebar, per §1) showing:

- Status
- Matter
- Template
- Pages
- Words
- Characters
- Created
- Last Saved
- Autosave Status

Until Matter Register integration exists, Matter is always shown as:

> Unlinked Draft

— per the existing honest-by-construction convention; this card never fetches or implies a real Matter Register linkage that doesn't exist yet.

## 6. Attachments

Add an **Attachments** section to the left sidebar.

**Purpose:** manage documents associated with the current draft.

**Current milestone:** UI and local-draft attachment management only.

**Future milestones** (not implemented now, and not to be faked as implemented):

- Matter-linked evidence
- AI context
- OCR
- Citation attachment

**Support:**

- Drag & drop
- An explicit upload button

**File types:** PDF, DOCX, Images, **TXT**.

**Display per file:** icon, filename, size, upload timestamp.

Do not imply cloud storage when none exists — this section holds an honest, clearly-labeled local/session-only list unless and until it is wired to a real backend in a future, separately-approved milestone.

## 7. Page Navigation

- Page thumbnails, one per page (approximated via the existing `PageBreak` node, since the document is a single continuous ProseMirror document).
- Click to navigate.
- Current page highlighted.
- Future-ready for page reordering; reordering itself is not implemented now.

## 8. Status Bar

Fixed to the bottom of the workspace, displaying:

- Current Page
- Total Pages
- Zoom
- Paper Size
- Orientation
- Autosave Status
- Word Count
- Character Count
- **Language**

The Language field displays the drafting language in effect (today, a fixed "English" value is honest — no per-draft language selection exists yet; this field must not imply a language-switching capability that isn't built).

## 9. Zoom and Ruler

Support zoom presets:

- 50%
- 75%
- 100%
- 125%
- 150%
- 200%
- Fit Width

Provide a horizontal ruler above the document, scaled to the page's real printed width — a visual/scaffolding component, future-ready for tab stops but not implementing interactive tab stops yet.

## 10. Typography

- Default font: **Times New Roman**.
- Optional fonts: **Aptos**, **Calibri** (alongside the existing font list).
- Default alignment: **justified**.
- Default line spacing: **1.5**.

These are defaults applied to new/blank drafts and templates going forward; they do not retroactively rewrite the content of any already-saved draft.

## 11. Template Card Refinements

Template cards shall display concise, real legal information:

- Template Name
- Jurisdiction
- Category
- Court (where applicable)
- Version
- Starter Template badge

Example:

> **Delhi High Court — Writ Petition**
> Jurisdiction: India
> Category: Constitutional
> Version: v1.0 Draft
> *Starter Template*

Avoid fabricated parties, fake disputes, or decorative content — every field shown must be real metadata already present on the template (`lib/documents/editor/templates.ts`'s `LegalTemplate` fields), never invented copy to make a card look more populated.

## 12. Template Visual Design

Template cards shall be:

- Compact
- Full width
- Easy to scan
- Keyboard accessible
- Touch friendly
- Have a clear active/selected state
- Consistent with NextCaseHQ branding

Include subtle badges for: Jurisdiction, Category, Starter Template.

No distracting animations.

## 13. Template Categories

Future template categories:

- Constitutional
- Civil
- Criminal
- Commercial
- Family
- Property
- Corporate
- Tax
- Employment
- Arbitration
- Consumer
- Administrative

The first release may show a single flat list until enough templates exist to make category grouping/filtering worthwhile — grouping UI is not required before then.

## 14. Recent Drafts

Future milestone. When built:

- Display recently edited drafts.
- Never fabricate recent drafts.
- Only show genuine saved drafts, sourced from a real endpoint — not sample/demo data presented as though real (per `DOCUMENT_CREATOR_GOVERNANCE.md` §6).

## 15. Template Search

Reserve UI space for a future search control:

- Placeholder text: **"Search Templates"**
- Caption: *(Available when additional templates are published.)*
- No functionality is required yet — the input may be present and visibly inert, but must not silently do nothing when it looks interactive; label it as not-yet-active if rendered as a real input.

## 16. Improved Confirmation Dialog

Whenever creating a new draft (e.g. selecting a template over substantial existing content), display:

> **Create New Draft?**
> Your current draft is safely preserved. A new independent draft will now be created. Your existing draft remains available from Draft History.

Buttons: **Cancel**, **Create New Draft**.

Cancel preserves, unchanged: Draft, Formatting, Title, Template, Page Setup, Draft ID — i.e., canceling is a true no-op on the currently-loaded draft, exactly as the existing `pendingTemplate` confirmation flow already guarantees.

("Draft History" in this dialog's copy refers to the already-existing guarantee that the old draft remains saved under its own id, per `autosave.startNewDraft`'s behavior — it does not imply a Recent Drafts UI (§14) exists yet; if Recent Drafts is not yet built, this copy must not overstate what's actually reachable today.)

## 17. Empty State

If no templates exist:

> No templates are currently available. You can still create a blank draft.

## 18. Loading State

When a template is selected, surface real, sequential progress rather than a frozen UI:

> Creating Draft… → Copying Template… → Preparing Editor…

These states must reflect real work actually happening (draft creation, content copy, editor mount) — not a fake, timed animation with no corresponding operation.

## 19. Keyboard Accessibility

Support: Tab, Shift+Tab, Arrow Keys, Enter, Escape, Space.

Visible focus indicators are required on every interactive control (ribbon buttons, template cards, sidebar toggles, dialog buttons, status bar controls where interactive).

## 20. Visual Polish

Improve: spacing, alignment, typography, icon consistency, page shadow, button consistency, panel consistency.

Add:

- A contextual formatting bubble that appears near a text selection for quick access to common formatting, supplementing — not replacing — the ribbon.
- A right-click context menu offering the same common actions in context.
- A full-screen focus mode that hides the ribbon/panels/status bar down to just the page, exit-able without losing place or scroll position.
- A dark workspace theme option for the surrounding chrome (ribbon, panels, background) — the document page itself always renders on a white background ("paper remains white"), matching what will actually print.

## 21. Responsive Behaviour

- **Desktop** — persistent left sidebar, persistent editor, persistent right sidebar, all visible simultaneously.
- **Tablet** — collapsible side panels; no overlap with the document (an open panel must not cover the canvas the advocate is editing).
- **Mobile** — Templates become a drawer; Page Setup becomes a drawer; selecting a template closes the drawer; no horizontal scrolling anywhere in the workspace; safety notices (unauthenticated banner, conflict banner) remain visible regardless of drawer state.

## 22. Implementation Constraints

These refinements are UI/UX enhancements only. Do NOT modify:

- Constitution
- Autosave architecture
- IndexedDB recovery
- Draft model
- API contracts
- Existing implementation roadmap
- Existing SurveyJS roadmap
- Citation roadmap
- Matter Register roadmap

Continue using only MIT-compatible dependencies. No paid Tiptap services. No paid SurveyJS components. No placeholder functionality that appears complete when it is not. Maintain honest disclosure of all pending milestones (§6, §14, §15, §17, §18 above each specify what "honest" means in that particular case).

---

## Acceptance Criteria

- No regressions in existing Document Creator behavior (autosave, recovery, template selection, print).
- Full Jest suite green; typecheck clean; production build clean.
- No paid dependencies introduced; every new package is MIT-licensed (verified against the installed package's own `package.json`, not just registry metadata), per established project convention.
- Every "future milestone" or "coming soon" surface (§1's Recent Drafts, §3's References/Review/AI tabs, §6's Matter-linked/AI/OCR/citation attachment features, §13's category filtering, §14 Recent Drafts, §15 Template Search) is either omitted or visibly, honestly labeled as not-yet-active — never implemented as a dead control that looks functional.
- Template cards display only real template metadata (§11) — no fabricated parties, disputes, or decorative copy.
- Keyboard accessibility (§19) and visible focus indicators are verified by real interaction (Tab/Shift+Tab/Arrow/Enter/Escape/Space), not assumed from markup alone.
- Desktop, tablet, and mobile screenshots of the rebuilt workspace are produced and provided before requesting Product Owner review.
