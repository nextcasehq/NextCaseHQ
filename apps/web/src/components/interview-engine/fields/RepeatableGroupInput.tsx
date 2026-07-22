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

/** A generic, structural summary line for a collapsed entry — the first
 *  sub-field's own value, whatever it is. Never legal-specific (this
 *  component has no idea "name" means anything); it just happens to be
 *  schema convention that the first field in a group is its most
 *  identifying one (petitioner/respondent/advocate name, annexure label). */
function summarize(field: GroupField, item: Record<string, unknown>, index: number): string {
  const primary = field.fields[0];
  const value = primary ? item[primary.name] : undefined;
  return typeof value === 'string' && value.trim() ? value : `Untitled ${field.itemLabel} ${index + 1}`;
}

function hasEntryError(errors: EngineErrors, groupName: string, index: number): boolean {
  const prefix = `${groupName}[${index}].`;
  return Object.keys(errors).some((key) => key.startsWith(prefix));
}

export function RepeatableGroupInput({ field, items, errors, onAdd, onRemove, onItemChange }: Props) {
  const countError = errors[field.name];
  const canRemove = items.length > (field.minItems ?? 0);
  const canAdd = field.maxItems === undefined || items.length < field.maxItems;

  // Accordion, not a flat always-expanded stack: at n=1 this behaves
  // identically to before (the one entry starts expanded). Past a
  // handful of entries, every completed one collapsing to a single
  // summary line is what keeps 12 respondents scannable and keeps the
  // Add button reachable without scrolling past eleven strangers' full
  // field sets — see the checkpoint's scale evidence.
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(items.length > 0 ? 0 : null);

  const handleAdd = () => {
    const newIndex = items.length;
    onAdd();
    setExpandedIndex(newIndex);
  };

  const handleRemove = (index: number) => {
    onRemove(index);
    setExpandedIndex((current) => {
      if (current === null) return current;
      if (index === current) return null;
      if (index < current) return current - 1;
      return current;
    });
  };

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-semibold">
        {field.title}
        {field.isRequired && <span aria-hidden="true"> *</span>}
      </legend>
      {field.description && <p className="text-xs text-[#8A7A56] -mt-2">{field.description}</p>}
      {countError && (
        <p role="alert" className="text-xs text-red-600">
          {countError}
        </p>
      )}
      <div className="space-y-2">
        {items.map((item, index) => {
          const isExpanded = expandedIndex === index;
          const entryHasError = hasEntryError(errors, field.name, index);
          const summaryId = `group-${field.name}-${index}-summary`;
          const panelId = `group-${field.name}-${index}-panel`;

          if (!isExpanded) {
            return (
              <div
                key={index}
                className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${entryHasError ? 'border-red-500' : 'border-[#E7DFC9]'}`}
              >
                <button
                  type="button"
                  id={summaryId}
                  aria-expanded="false"
                  aria-controls={panelId}
                  onClick={() => setExpandedIndex(index)}
                  className="flex-1 min-w-0 text-left text-sm rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] focus-visible:ring-offset-1"
                >
                  <span className="text-xs font-bold uppercase tracking-wide text-[#8A7A56]">{field.itemLabel} {index + 1}</span>
                  <span className="ml-2 truncate">{summarize(field, item, index)}</span>
                  {entryHasError && (
                    <span role="alert" className="ml-2 text-xs font-semibold text-red-600">
                      Needs attention
                    </span>
                  )}
                </button>
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    aria-label={`Remove ${field.itemLabel} ${index + 1}`}
                    className="shrink-0 px-2 py-1 -my-1 text-xs font-semibold text-red-600 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          }

          return (
            <div key={index} id={panelId} className={`rounded-lg border p-3 space-y-3 ${entryHasError ? 'border-red-500' : 'border-[#E7DFC9]'}`}>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  aria-expanded="true"
                  aria-controls={panelId}
                  onClick={() => setExpandedIndex(null)}
                  className="text-xs font-bold uppercase tracking-wide text-[#8A7A56] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] focus-visible:ring-offset-1"
                >
                  {field.itemLabel} {index + 1} — Collapse
                </button>
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => handleRemove(index)}
                    aria-label={`Remove ${field.itemLabel} ${index + 1}`}
                    className="px-2 py-1 -my-1 text-xs font-semibold text-red-600 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1"
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
          );
        })}
      </div>
      {canAdd && (
        <button
          type="button"
          onClick={handleAdd}
          className="text-xs font-bold uppercase tracking-wide text-[#8A6D2F] hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] focus-visible:ring-offset-1"
        >
          + Add another {field.itemLabel.toLowerCase()}
        </button>
      )}
    </fieldset>
  );
}
