import { DEFAULT_PAGE_SETUP, type PageSetup } from './page-setup';

/**
 * The Document Creator's rich-text editor, page setup (paper size,
 * orientation, margins, zoom, header/footer), and template identity all
 * need to survive autosave and IndexedDB recovery together — but the
 * existing durable-draft API/schema (see lib/documents/draft-store.ts,
 * db/schema.sql's DocumentDraft table) only ever stores one opaque
 * `content: string` column, deliberately unchanged by this rebuild so the
 * server contract, revision-conflict logic, and tenant/session
 * enforcement stay exactly as they were. This module is the seam: it
 * packs everything the editor needs into one JSON string for that
 * `content` field, and unpacks it again on load/recovery. To
 * autosave/draft-store.ts and useDurableAutosave.ts this is just an
 * opaque string, compared and stored exactly like the plain-text content
 * Phase 2 shipped with.
 */

export interface DraftPayload {
  html: string;
  pageSetup: PageSetup;
  templateId: string | null;
}

export function serializeDraftPayload(payload: DraftPayload): string {
  return JSON.stringify(payload);
}

/**
 * Never throws — a corrupt or pre-rebuild (plain-text) `content` value
 * degrades to treating the raw string as the document body with default
 * page setup, rather than losing the advocate's work or crashing the
 * editor.
 */
export function parseDraftPayload(raw: string): DraftPayload {
  if (!raw) {
    return { html: '', pageSetup: DEFAULT_PAGE_SETUP, templateId: null };
  }
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && typeof parsed.html === 'string') {
      return {
        html: parsed.html,
        pageSetup: { ...DEFAULT_PAGE_SETUP, ...(parsed.pageSetup ?? {}) },
        templateId: typeof parsed.templateId === 'string' ? parsed.templateId : null,
      };
    }
  } catch {
    // Fall through — treat as legacy plain-text content below.
  }
  return { html: raw, pageSetup: DEFAULT_PAGE_SETUP, templateId: null };
}
