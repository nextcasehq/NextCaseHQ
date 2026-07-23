'use client';

import React from 'react';
import type { TextAreaField } from '@/lib/interview-engine/types';

interface Props {
  field: TextAreaField;
  value: unknown;
  error?: string;
  onChange: (value: string) => void;
}

/**
 * Reserved for the interview's substantive legal narrative (facts,
 * grounds, jurisdiction, relief) — text that goes into the drafted
 * document close to verbatim. That earns more writing room and a more
 * comfortable line-height than a short-answer field; this is otherwise
 * the same native <textarea> (resize handle included, native selection/
 * copy-paste/spellcheck all free) — nothing here is a custom editor.
 */
export function TextAreaFieldInput({ field, value, error, onChange }: Props) {
  const inputId = `field-${field.name}`;
  const describedBy = [error ? `${inputId}-error` : null, field.description ? `${inputId}-description` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm font-semibold">
        {field.title}
        {field.isRequired && <span aria-hidden="true"> *</span>}
      </label>
      {field.description && (
        <p id={`${inputId}-description`} className="text-xs text-[#8A7A56]">
          {field.description}
        </p>
      )}
      <textarea
        id={inputId}
        value={(value as string) ?? ''}
        placeholder={field.placeholder}
        rows={field.rows ?? 4}
        aria-required={field.isRequired || undefined}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border rounded-md px-3 py-2.5 text-sm leading-relaxed resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] focus-visible:ring-offset-1 ${error ? 'border-red-500' : 'border-[#E7DFC9]'}`}
      />
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
