'use client';

import React from 'react';
import type { TextField } from '@/lib/interview-engine/types';

interface Props {
  field: TextField;
  value: unknown;
  error?: string;
  onChange: (value: string) => void;
}

export function TextFieldInput({ field, value, error, onChange }: Props) {
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
      <input
        id={inputId}
        type={field.inputType === 'number' ? 'number' : 'text'}
        value={(value as string) ?? ''}
        placeholder={field.placeholder}
        aria-required={field.isRequired || undefined}
        aria-invalid={!!error || undefined}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full border rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] focus-visible:ring-offset-1 ${error ? 'border-red-500' : 'border-[#E7DFC9]'}`}
      />
      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
