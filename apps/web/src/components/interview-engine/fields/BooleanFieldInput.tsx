'use client';

import React from 'react';
import type { BooleanField } from '@/lib/interview-engine/types';

interface Props {
  field: BooleanField;
  value: unknown;
  error?: string;
  onChange: (value: boolean) => void;
}

/**
 * A boolean field is rarely "just a checkbox" in a legal interview — this
 * one, for instance, decides whether an entire follow-up question appears
 * (see writ-petition.ts's seekingInterimRelief -> interimReliefDetails
 * visibleIf pair). A bare checkbox with a fragment of label text doesn't
 * carry that weight. The control itself stays native (a real
 * <input type="checkbox"> — no custom toggle; nothing about a plain
 * yes/no answer needs one), but it's presented as a bordered question
 * card so it reads as a deliberate legal choice, not an easy-to-miss
 * afterthought sitting loose in the page.
 */
export function BooleanFieldInput({ field, value, error, onChange }: Props) {
  const inputId = `field-${field.name}`;
  const checked = (value as boolean) ?? field.defaultValue ?? false;
  return (
    <div className={`rounded-lg border p-4 ${error ? 'border-red-500' : 'border-[#E7DFC9]'}`}>
      <label htmlFor={inputId} className="flex items-start gap-3 cursor-pointer">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${inputId}-error` : field.description ? `${inputId}-description` : undefined}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#8A6D2F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] focus-visible:ring-offset-1"
        />
        <span className="text-sm font-semibold">{field.title}</span>
      </label>
      {field.description && (
        <p id={`${inputId}-description`} className="text-xs text-[#8A7A56] pl-7 mt-1">
          {field.description}
        </p>
      )}
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600 pl-7 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
