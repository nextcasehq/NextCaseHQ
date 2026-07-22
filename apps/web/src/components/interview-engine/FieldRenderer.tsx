'use client';

import React from 'react';
import type { EngineAnswers, EngineErrors, EngineField } from '@/lib/interview-engine/types';
import { isFieldVisible } from '@/lib/interview-engine/visibility';
import { TextFieldInput } from './fields/TextFieldInput';
import { TextAreaFieldInput } from './fields/TextAreaFieldInput';
import { DropdownFieldInput } from './fields/DropdownFieldInput';
import { BooleanFieldInput } from './fields/BooleanFieldInput';
import { RepeatableGroupInput } from './fields/RepeatableGroupInput';

interface Props {
  field: EngineField;
  answers: EngineAnswers;
  errors: EngineErrors;
  setFieldValue: (name: string, value: unknown) => void;
  addGroupItem: (groupName: string, groupFields: EngineField[]) => void;
  removeGroupItem: (groupName: string, index: number) => void;
  setGroupItemValue: (groupName: string, index: number, fieldName: string, value: unknown) => void;
}

/** The engine's single dispatch point from schema field to rendered UI.
 *  Adding a field type the engine doesn't yet support means adding one
 *  case here and one type in lib/interview-engine/types.ts — nothing
 *  about pages, navigation, or validation changes. */
export function FieldRenderer({ field, answers, errors, setFieldValue, addGroupItem, removeGroupItem, setGroupItemValue }: Props) {
  if (!isFieldVisible(field, answers)) return null;

  switch (field.type) {
    case 'text':
      return <TextFieldInput field={field} value={answers[field.name]} error={errors[field.name]} onChange={(v) => setFieldValue(field.name, v)} />;
    case 'textarea':
      return <TextAreaFieldInput field={field} value={answers[field.name]} error={errors[field.name]} onChange={(v) => setFieldValue(field.name, v)} />;
    case 'dropdown':
      return <DropdownFieldInput field={field} value={answers[field.name]} error={errors[field.name]} onChange={(v) => setFieldValue(field.name, v)} />;
    case 'boolean':
      return <BooleanFieldInput field={field} value={answers[field.name]} error={errors[field.name]} onChange={(v) => setFieldValue(field.name, v)} />;
    case 'group':
      return (
        <RepeatableGroupInput
          field={field}
          items={(answers[field.name] as Record<string, unknown>[] | undefined) ?? []}
          errors={errors}
          onAdd={() => addGroupItem(field.name, field.fields)}
          onRemove={(index) => removeGroupItem(field.name, index)}
          onItemChange={(index, fieldName, value) => setGroupItemValue(field.name, index, fieldName, value)}
        />
      );
    default:
      return null;
  }
}
