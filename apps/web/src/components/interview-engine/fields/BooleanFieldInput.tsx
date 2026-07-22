'use client';

import React from 'react';
import type { BooleanField } from '@/lib/interview-engine/types';

interface Props {
  field: BooleanField;
  value: unknown;
  error?: string;
  onChange: (value: boolean) => void;
}

export function BooleanFieldInput({ field, value, error, onChange }: Props) {
  const inputId = `field-${field.name}`;
  const checked = (value as boolean) ?? field.defaultValue ?? false;
  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="flex items-center gap-2 text-sm font-semibold">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          aria-invalid={!!error || undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] focus-visible:ring-offset-1"
        />
        {field.title}
      </label>
      {field.description && <p className="text-xs text-[#8A7A56] pl-6">{field.description}</p>}
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600 pl-6">
          {error}
        </p>
      )}
    </div>
  );
}
