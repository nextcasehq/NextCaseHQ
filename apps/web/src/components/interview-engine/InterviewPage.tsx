'use client';

import React from 'react';
import type { EngineAnswers, EngineErrors, EngineField, EnginePage as EnginePageType } from '@/lib/interview-engine/types';
import { isFieldVisible } from '@/lib/interview-engine/visibility';
import { FieldRenderer } from './FieldRenderer';

interface Props {
  page: EnginePageType;
  answers: EngineAnswers;
  errors: EngineErrors;
  setFieldValue: (name: string, value: unknown) => void;
  addGroupItem: (groupName: string, groupFields: EngineField[]) => void;
  removeGroupItem: (groupName: string, index: number) => void;
  setGroupItemValue: (groupName: string, index: number, fieldName: string, value: unknown) => void;
}

export function InterviewPage({ page, answers, errors, setFieldValue, addGroupItem, removeGroupItem, setGroupItemValue }: Props) {
  // Following the same product rule the Document Creator itself already
  // applies elsewhere (focus moves automatically whenever the workspace
  // transitions into something new to fill in): when a conditional field
  // is revealed by an answer the lawyer just gave, focus moves there so
  // they never need an extra click. Deliberately does NOT fire on a
  // page's very first render (arriving fresh, or resuming a draft where a
  // conditional field already happens to be visible) — only on a real
  // false-to-true transition caused by a live edit. `lastPageNameRef`
  // resets the visibility baseline on every page change so a field name
  // reused across two different pages can never cause a false trigger.
  const lastPageNameRef = React.useRef<string | null>(null);
  const previousVisibilityRef = React.useRef<Record<string, boolean>>({});

  React.useEffect(() => {
    const isNewPage = lastPageNameRef.current !== page.name;
    lastPageNameRef.current = page.name;

    const currentVisibility: Record<string, boolean> = {};
    for (const field of page.fields) currentVisibility[field.name] = isFieldVisible(field, answers);

    if (!isNewPage) {
      for (const field of page.fields) {
        if (!previousVisibilityRef.current[field.name] && currentVisibility[field.name]) {
          document.getElementById(`field-${field.name}`)?.focus();
        }
      }
    }
    previousVisibilityRef.current = currentVisibility;
  }, [page, answers]);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">{page.title}</h3>
      <div className="space-y-3">
        {page.fields.map((field) => (
          <FieldRenderer
            key={field.name}
            field={field}
            answers={answers}
            errors={errors}
            setFieldValue={setFieldValue}
            addGroupItem={addGroupItem}
            removeGroupItem={removeGroupItem}
            setGroupItemValue={setGroupItemValue}
          />
        ))}
      </div>
    </div>
  );
}
