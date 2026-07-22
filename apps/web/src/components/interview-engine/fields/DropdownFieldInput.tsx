'use client';

import React from 'react';
import type { DropdownField } from '@/lib/interview-engine/types';

interface Props {
  field: DropdownField;
  value: unknown;
  error?: string;
  onChange: (value: string) => void;
}

export function DropdownFieldInput({ field, value, error, onChange }: Props) {
  const inputId = `field-${field.name}`;
  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="block text-sm font-semibold">
        {field.title}
        {field.isRequired && <span aria-hidden="true"> *</span>}
      </label>
      {field.description && <p className="text-xs text-[#8A7A56]">{field.description}</p>}
      <select
        id={inputId}
        value={(value as string) ?? field.defaultValue ?? ''}
        aria-required={field.isRequired || undefined}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border rounded-md px-3 py-2 text-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] focus-visible:ring-offset-1 ${error ? 'border-red-500' : 'border-[#E7DFC9]'}`}
      >
        <option value="" disabled>
          Select…
        </option>
        {field.choices.map((choice) => (
          <option key={choice} value={choice}>
            {choice}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
