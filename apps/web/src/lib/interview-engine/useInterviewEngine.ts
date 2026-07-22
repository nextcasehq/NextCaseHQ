import React from 'react';
import type { EngineAnswers, EngineErrors, EngineField, EngineMode, EngineSchema } from './types';
import { validatePage } from './validate';

/** One fresh repeatable-group entry, seeded with its own fields' default
 *  values — matters because fill-template.ts reads e.g. `item.capacity`
 *  directly; a dropdown's defaultValue must actually be stored on the item
 *  the moment it's created, not just shown as a visual fallback, or a
 *  lawyer who never touches that field would silently generate a draft
 *  missing a value the old SurveyJS-backed engine always populated. */
function buildEmptyGroupItem(fields: EngineField[]): Record<string, unknown> {
  const item: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === 'dropdown' && field.defaultValue !== undefined) item[field.name] = field.defaultValue;
    if (field.type === 'boolean' && field.defaultValue !== undefined) item[field.name] = field.defaultValue;
  }
  return item;
}

function collectDefaults(fields: EngineField[]): EngineAnswers {
  const defaults: EngineAnswers = {};
  for (const field of fields) {
    if (field.type === 'dropdown' && field.defaultValue !== undefined) defaults[field.name] = field.defaultValue;
    if (field.type === 'boolean' && field.defaultValue !== undefined) defaults[field.name] = field.defaultValue;
    // Pre-populate `minItems` entries up front — mirrors SurveyJS's
    // panelCount/minPanelCount starting a dynamic panel with entries
    // already visible and ready to fill in, rather than an empty list the
    // lawyer has to click "Add" on before they can type anything.
    if (field.type === 'group') {
      const initialCount = field.minItems ?? 0;
      defaults[field.name] = Array.from({ length: initialCount }, () => buildEmptyGroupItem(field.fields));
    }
  }
  return defaults;
}

function readPersisted(key: string | undefined): EngineAnswers | null {
  if (!key || typeof window === 'undefined') return null;
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as EngineAnswers) : null;
  } catch {
    // Corrupt or inaccessible storage — start fresh rather than failing to
    // open the interview at all.
    return null;
  }
}

export interface UseInterviewEngineResult {
  answers: EngineAnswers;
  currentPageIndex: number;
  currentPage: EngineSchema['pages'][number];
  pageCount: number;
  mode: EngineMode;
  errors: EngineErrors;
  setFieldValue: (name: string, value: unknown) => void;
  addGroupItem: (groupName: string, groupFields: EngineField[]) => void;
  removeGroupItem: (groupName: string, index: number) => void;
  setGroupItemValue: (groupName: string, index: number, fieldName: string, value: unknown) => void;
  goNext: () => void;
  goPrevious: () => void;
  goToPage: (index: number) => void;
  goToReview: () => void;
}

/**
 * Owns all interview state. Knows nothing about HTML, templates, or legal
 * concepts — its entire surface is schema/pages/fields/groups/validation/
 * visibility/answers, matching the engine's stated boundary exactly.
 *
 * `schema` is read fresh on every render rather than only at mount — a
 * future AI authoring layer inserting/removing/reordering fields or pages
 * mid-interview is expected to change the `schema` prop's contents (not
 * its identity), and this hook must keep whatever answers already exist
 * rather than resetting state just because the schema changed. Initial
 * defaults/persisted answers are only ever applied once, via the lazy
 * useState initializer below — never re-applied on a later schema change.
 */
export function useInterviewEngine(schema: EngineSchema, persistenceKey?: string): UseInterviewEngineResult {
  const [answers, setAnswers] = React.useState<EngineAnswers>(() => {
    const defaults = schema.pages.flatMap((p) => Object.entries(collectDefaults(p.fields)));
    const persisted = readPersisted(persistenceKey);
    return { ...Object.fromEntries(defaults), ...(persisted ?? {}) };
  });
  const [currentPageIndex, setCurrentPageIndex] = React.useState(0);
  const [mode, setMode] = React.useState<EngineMode>('filling');
  const [errors, setErrors] = React.useState<EngineErrors>({});

  React.useEffect(() => {
    if (!persistenceKey || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(persistenceKey, JSON.stringify(answers));
    } catch {
      // Best-effort save/resume only — never blocks the interview itself.
    }
  }, [answers, persistenceKey]);

  const safePageIndex = Math.min(currentPageIndex, Math.max(schema.pages.length - 1, 0));
  const currentPage = schema.pages[safePageIndex];

  const setFieldValue = React.useCallback((name: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [name]: value }));
  }, []);

  const addGroupItem = React.useCallback((groupName: string, groupFields: EngineField[]) => {
    setAnswers((prev) => {
      const items = (prev[groupName] as Record<string, unknown>[] | undefined) ?? [];
      return { ...prev, [groupName]: [...items, buildEmptyGroupItem(groupFields)] };
    });
  }, []);

  const removeGroupItem = React.useCallback((groupName: string, index: number) => {
    setAnswers((prev) => {
      const items = (prev[groupName] as Record<string, unknown>[] | undefined) ?? [];
      return { ...prev, [groupName]: items.filter((_, i) => i !== index) };
    });
  }, []);

  const setGroupItemValue = React.useCallback((groupName: string, index: number, fieldName: string, value: unknown) => {
    setAnswers((prev) => {
      const items = (prev[groupName] as Record<string, unknown>[] | undefined) ?? [];
      const nextItems = items.map((item, i) => (i === index ? { ...item, [fieldName]: value } : item));
      return { ...prev, [groupName]: nextItems };
    });
  }, []);

  const goNext = React.useCallback(() => {
    const pageErrors = validatePage(currentPage, answers);
    setErrors(pageErrors);
    if (Object.keys(pageErrors).length > 0) return;
    if (safePageIndex >= schema.pages.length - 1) {
      setMode('review');
      return;
    }
    setCurrentPageIndex(safePageIndex + 1);
  }, [currentPage, answers, safePageIndex, schema.pages.length]);

  const goPrevious = React.useCallback(() => {
    setErrors({});
    if (mode === 'review') {
      setMode('filling');
      return;
    }
    setCurrentPageIndex((i) => Math.max(0, i - 1));
  }, [mode]);

  const goToPage = React.useCallback((index: number) => {
    setErrors({});
    setMode('filling');
    setCurrentPageIndex(Math.min(Math.max(index, 0), schema.pages.length - 1));
  }, [schema.pages.length]);

  const goToReview = React.useCallback(() => {
    const pageErrors = validatePage(currentPage, answers);
    setErrors(pageErrors);
    if (Object.keys(pageErrors).length > 0) return;
    setMode('review');
  }, [currentPage, answers]);

  return {
    answers,
    currentPageIndex: safePageIndex,
    currentPage,
    pageCount: schema.pages.length,
    mode,
    errors,
    setFieldValue,
    addGroupItem,
    removeGroupItem,
    setGroupItemValue,
    goNext,
    goPrevious,
    goToPage,
    goToReview,
  };
}
