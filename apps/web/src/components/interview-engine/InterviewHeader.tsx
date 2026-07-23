'use client';

import React from 'react';

interface Props {
  title: string;
  onCancel: () => void;
}

/** Deliberately generic — knows only a title string and a cancel action,
 *  nothing about what kind of interview this is. */
export function InterviewHeader({ title, onCancel }: Props) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-sm font-bold">{title}</h2>
      <button
        type="button"
        onClick={onCancel}
        className="text-xs font-bold uppercase tracking-widest text-[#8A6D2F] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8A6D2F] focus-visible:ring-offset-1"
      >
        Cancel
      </button>
    </div>
  );
}
