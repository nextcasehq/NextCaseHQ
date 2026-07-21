'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { loadLocalDraft, saveLocalDraft, resolveRecoveredContent } from './local-draft-store';

/**
 * Document Creator Phase 2 — Durable Draft and Continuous Autosave.
 * Observes page-owned title/content state and keeps it continuously
 * preserved: an instant local (IndexedDB) mirror plus a debounced,
 * revision-guarded server autosave against the DocumentDraft API
 * (POST/GET/PATCH /api/documents/drafts). Never creates a permanent
 * DocumentVersion — that remains Phase 3 scope. See
 * docs/document-creator/DOCUMENT_AUTOSAVE_SPECIFICATION.md.
 *
 * The localStorage key below stores only a small draftId *pointer* so a
 * refreshed tab knows which durable draft to resume — it is never the
 * authority for content itself (that's the server row, mirrored to
 * IndexedDB for offline recovery), per this milestone's explicit
 * "never store permanent authority only in localStorage" constraint.
 */

export type AutosaveStatus = 'saving' | 'saved' | 'offline' | 'save_failed' | 'conflict_detected' | 'recovered_draft';

export interface ConflictingRevision {
  content: string;
  title: string | null;
  revision: number;
}

interface UseDurableAutosaveOptions {
  storageKey: string;
  matterId?: string | null;
  documentType?: string | null;
  title: string;
  content: string;
  debounceMs?: number;
  onRecovered?: (recovered: { content: string; title: string | null }) => void;
}

interface UseDurableAutosaveResult {
  status: AutosaveStatus;
  draftId: string | null;
  conflict: ConflictingRevision | null;
  keepMine: () => void;
  loadNewer: () => void;
}

const DEBOUNCE_MS_DEFAULT = 1200;

function pointerKey(storageKey: string): string {
  return `nchq:document-draft-id:${storageKey}`;
}

export function useDurableAutosave({
  storageKey,
  matterId = null,
  documentType = null,
  title,
  content,
  debounceMs = DEBOUNCE_MS_DEFAULT,
  onRecovered,
}: UseDurableAutosaveOptions): UseDurableAutosaveResult {
  const [status, setStatus] = useState<AutosaveStatus>('saved');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictingRevision | null>(null);

  const draftIdRef = useRef<string | null>(null);
  const revisionRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);
  const latestRef = useRef({ title, content });
  latestRef.current = { title, content };
  // What the server is currently known to hold. The content-effect below
  // only schedules a PATCH when title/content have actually diverged from
  // this — without it, restoring recovered content via onRecovered (which
  // changes the page's own title/content state) would itself look like a
  // fresh edit and trigger a redundant, unnecessary autosave. That
  // redundant write is not just wasteful: it silently advances the
  // revision counter, which can produce a spurious 409 conflict for a
  // completely unrelated, legitimately-concurrent editor who never
  // touched anything.
  const syncedRef = useRef<{ content: string; title: string | null }>({ content: '', title: null });

  const persist = useCallback(
    async (payload: { title: string; content: string }) => {
      const id = draftIdRef.current;
      if (!id) return;
      setStatus('saving');
      try {
        const res = await fetch(`/api/documents/drafts/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: payload.content,
            title: payload.title || null,
            expected_revision: revisionRef.current,
          }),
        });
        if (res.status === 409) {
          const body = await res.json().catch(() => null);
          if (body?.current) {
            setConflict({ content: body.current.content, title: body.current.title, revision: body.current.revision });
          }
          setStatus('conflict_detected');
          return;
        }
        if (!res.ok) {
          setStatus('save_failed');
          return;
        }
        const data = await res.json();
        revisionRef.current = data.draft.revision;
        syncedRef.current = { content: payload.content, title: payload.title || null };
        await saveLocalDraft({
          draftId: id,
          content: payload.content,
          title: payload.title || null,
          revision: data.draft.revision,
          savedAt: new Date().toISOString(),
        });
        setStatus('saved');
      } catch {
        setStatus(navigator.onLine === false ? 'offline' : 'save_failed');
      }
    },
    []
  );

  // One-time initialization: resume an existing draft (recorded via the
  // localStorage pointer) or create a fresh one, then reconcile against
  // any unsynchronised local (IndexedDB) copy before the advocate types
  // another keystroke.
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    let cancelled = false;

    (async () => {
      const key = pointerKey(storageKey);
      const existingId = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;

      try {
        if (existingId) {
          const res = await fetch(`/api/documents/drafts/${existingId}`);
          if (res.ok) {
            const data = await res.json();
            if (cancelled) return;
            draftIdRef.current = data.draft.id;
            revisionRef.current = data.draft.revision;
            setDraftId(data.draft.id);

            const local = await loadLocalDraft(data.draft.id);
            const resolved = resolveRecoveredContent(local, {
              revision: data.draft.revision,
              content: data.draft.content,
              title: data.draft.title,
            });
            // The page always remounts with its own fresh-default
            // title/content (e.g. draft-builder's selected template body)
            // — recovery must restore the previously-saved content
            // whenever it differs from that default, regardless of
            // whether the winning copy came from the server or from a
            // still-unsynced local (IndexedDB) write. Comparing only
            // "local vs server" and ignoring "resolved vs the page's
            // current default" would silently drop every already-synced
            // draft's content on refresh.
            if (resolved.content !== latestRef.current.content || resolved.title !== latestRef.current.title) {
              // When the local (unsynced) copy is what's winning, the
              // server is deliberately left recorded as still holding its
              // OLD content — so the content-effect correctly sees the
              // about-to-be-restored local content as a genuine change
              // still needing to be pushed. When the server's own content
              // is what's winning, it's recorded as already synced, so
              // restoring it doesn't trigger a pointless resave.
              syncedRef.current =
                resolved.source === 'local'
                  ? { content: data.draft.content, title: data.draft.title }
                  : { content: resolved.content, title: resolved.title };
              onRecovered?.({ content: resolved.content, title: resolved.title });
              setStatus('recovered_draft');
            } else {
              syncedRef.current = { content: data.draft.content, title: data.draft.title };
              setStatus('saved');
            }
            return;
          }
          // The pointer no longer resolves (deleted, or belonged to a
          // different user/tenant session) — fall through and create a
          // fresh draft rather than getting stuck.
        }

        const res = await fetch('/api/documents/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matter_id: matterId,
            document_type: documentType,
            title: latestRef.current.title || null,
            content: latestRef.current.content,
          }),
        });
        if (!res.ok) {
          if (!cancelled) setStatus('save_failed');
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        draftIdRef.current = data.draft.id;
        revisionRef.current = data.draft.revision;
        syncedRef.current = { content: data.draft.content, title: data.draft.title };
        setDraftId(data.draft.id);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, data.draft.id);
        }
        setStatus('saved');
      } catch {
        if (!cancelled) setStatus('offline');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Instant local mirror + debounced server autosave whenever the page's
  // own title/content state changes. Depends on `draftId` (state, not the
  // ref) so that a keystroke arriving while the initial create-draft POST
  // is still in flight is not silently dropped — once initialization
  // resolves and `draftId` transitions from null, this effect re-runs
  // against the *current* content/title and schedules the save that would
  // otherwise never have been picked up (the ref alone isn't reactive).
  useEffect(() => {
    if (!draftId) return;
    if (content === syncedRef.current.content && (title || null) === syncedRef.current.title) {
      // Nothing has actually changed relative to what the server is
      // known to hold (e.g. this run was triggered only by draftId
      // transitioning from null, or by a recovery that already matched
      // the default) — scheduling a write here would be a pointless
      // round trip that also risks the spurious-conflict scenario
      // documented on syncedRef above.
      return;
    }

    void saveLocalDraft({
      draftId,
      content,
      title: title || null,
      revision: revisionRef.current,
      savedAt: new Date().toISOString(),
    });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void persist({ title, content });
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, debounceMs, draftId]);

  useEffect(() => {
    const handleOffline = () => setStatus((prev) => (prev === 'saving' ? prev : 'offline'));
    const handleOnline = () => {
      const current = latestRef.current;
      if (current.content === syncedRef.current.content && (current.title || null) === syncedRef.current.title) {
        setStatus('saved');
        return;
      }
      void persist(current);
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [persist]);

  const keepMine = useCallback(() => {
    if (!conflict) return;
    revisionRef.current = conflict.revision;
    setConflict(null);
    void persist(latestRef.current);
  }, [conflict, persist]);

  const loadNewer = useCallback(() => {
    if (!conflict) return;
    revisionRef.current = conflict.revision;
    // The newer content came FROM the server — it's already synced by
    // definition, so record that before restoring it, or the
    // content-effect would immediately schedule a pointless resave of
    // content the server already has.
    syncedRef.current = { content: conflict.content, title: conflict.title };
    onRecovered?.({ content: conflict.content, title: conflict.title });
    setConflict(null);
    setStatus('saved');
  }, [conflict, onRecovered]);

  return { status, draftId, conflict, keepMine, loadNewer };
}
