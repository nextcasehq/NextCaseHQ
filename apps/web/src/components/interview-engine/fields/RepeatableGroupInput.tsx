'use client';

import React from 'react';
import type { GroupField } from '@/lib/interview-engine/types';
import type { EngineErrors } from '@/lib/interview-engine/types';
import { TextFieldInput } from './TextFieldInput';
import { TextAreaFieldInput } from './TextAreaFieldInput';
import { DropdownFieldInput } from './DropdownFieldInput';
import { BooleanFieldInput } from './BooleanFieldInput';

interface Props {
  field: GroupField;
  items: Record<string, unknown>[];
  errors: EngineErrors;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onItemChange: (index: number, fieldName: string, value: unknown) => void;
}

/** Renders one repeatable group entry's sub-fields. Nested groups are not a
 *  supported case (see validate.ts's validateGroupItem) — every sub-field
 *  here is guaranteed scalar, so this never needs the full dispatch a page
 *  level field list needs. */
function GroupItemFields({
  field,
  item,
  errorPrefix,
  errors,
  onChange,
}: {
  field: GroupField;
  item: Record<string, unknown>;
  errorPrefix: string;
  errors: EngineErrors;
  onChange: (fieldName: string, value: unknown) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {field.fields.map((subField) => {
        const error = errors[`${errorPrefix}.${subField.name}`];
        const value = item[subField.name];
        switch (subField.type) {
          case 'text':
            return <TextFieldInput key={subField.name} field={subField} value={value} error={error} onChange={(v) => onChange(subField.name, v)} />;
          case 'textarea':
            return <TextAreaFieldInput key={subField.name} field={subField} value={value} error={error} onChange={(v) => onChange(subField.name, v)} />;
          case 'dropdown':
            return <DropdownFieldInput key={subField.name} field={subField} value={value} error={error} onChange={(v) => onChange(subField.name, v)} />;
          case 'boolean':
            return <BooleanFieldInput key={subField.name} field={subField} value={value} error={error} onChange={(v) => onChange(subField.name, v)} />;
          default:
            return null;
        }
      })}
    </div>
  );
}

export function RepeatableGroupInput({ field, items, errors, onAdd, onRemove, onItemChange }: Props) {
  const countError = errors[field.name];
  const canRemove = items.length > (field.minItems ?? 0);
  const canAdd = field.maxItems === undefined || items.length < field.maxItems;

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">
        {field.title}
        {field.isRequired && <span aria-hidden="true"> *</span>}
      </legend>
      {countError && (
        <p role="alert" className="text-xs text-red-600">
          {countError}
        </p>
      )}
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="border border-[#E7DFC9] rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-[#8A7A56]">
                {field.itemLabel} {index + 1}
              </span>
              {canRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  aria-label={`Remove ${field.itemLabel} ${index + 1}`}
                  className="text-xs font-semibold text-red-600 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1"
                >
                  Remove
                </button>
              )}
            </div>
            <GroupItemFields
              field={field}
              item={item}
              errorPrefix={`${field.name}[${index}]`}
              errors={errors}
              onChange={(fieldName, value) => onItemChange(index, fieldName, value)}
            />
          </div>
        ))}
      </div>
      {canAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="text-xs font-bold uppercase tracking-wide text-[#8A6D2F] hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] focus-visible:ring-offset-1"
        >
          + Add another {field.itemLabel.toLowerCase()}
        </button>
      )}
    </fieldset>
  );
}
