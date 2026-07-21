'use client';

/**
 * Tier 1 (local) recovery for the Document Creator's continuous autosave,
 * per docs/document-creator/DOCUMENT_AUTOSAVE_SPECIFICATION.md. A native
 * IndexedDB wrapper — no new dependency — mirrors every edit instantly,
 * independent of whether the debounced Tier 2 server autosave has
 * succeeded yet. This is recovery scaffolding only: the durable
 * DocumentDraft row on the server remains authoritative content; nothing
 * here is ever the only copy of anything (Constitution Rule 1/10).
 */

const DB_NAME = 'nextcase-document-drafts';
const STORE_NAME = 'drafts';
const DB_VERSION = 1;

export interface LocalDraftRecord {
  draftId: string;
  content: string;
  title: string | null;
  revision: number;
  savedAt: string;
}

function hasIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'draftId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalDraft(record: LocalDraftRecord): Promise<void> {
  if (!hasIndexedDb()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Local recovery is a best-effort enhancement, never a hard
    // dependency — a private-browsing tab with IndexedDB disabled must
    // not break autosave, only lose the local-recovery layer for itself.
  }
}

export async function loadLocalDraft(draftId: string): Promise<LocalDraftRecord | null> {
  if (!hasIndexedDb()) return null;
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(draftId);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

/**
 * Pure reconciliation decision — unit-testable without a real browser.
 * Prefers the local copy only when it is demonstrably ahead of (or
 * diverged from) what the server confirmed, so a stale local copy from an
 * old tab never overwrites genuinely newer server content.
 */
export function resolveRecoveredContent(
  local: LocalDraftRecord | null,
  server: { revision: number; content: string; title: string | null }
): { source: 'server' | 'local'; content: string; title: string | null } {
  if (!local) {
    return { source: 'server', content: server.content, title: server.title };
  }
  if (local.revision > server.revision) {
    return { source: 'local', content: local.content, title: local.title };
  }
  if (local.revision === server.revision && local.content !== server.content) {
    return { source: 'local', content: local.content, title: local.title };
  }
  return { source: 'server', content: server.content, title: server.title };
}
