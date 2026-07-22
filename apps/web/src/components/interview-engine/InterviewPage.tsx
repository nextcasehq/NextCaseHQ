'use client';

import React from 'react';
import type { EngineAnswers, EngineErrors, EngineField, EnginePage as EnginePageType } from '@/lib/interview-engine/types';
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
  return (
    <div className="space-y-5">
      <h3 className="text-lg font-bold">{page.title}</h3>
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
  );
}
