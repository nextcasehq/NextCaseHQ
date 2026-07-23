import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

/**
 * Shared empty-state treatment — replaces bare OS emoji (which render in
 * inconsistent, sometimes off-brand colors, e.g. a blue scales-of-justice
 * glyph) with a tasteful gold-tinted icon badge, so an empty list reads
 * as "nothing here yet" rather than "unfinished screen."
 */
export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-20 bg-white border border-[#E7DFC9]/80 rounded-xl">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FBF6EA] border border-[#E7DFC9]">
        {icon}
      </div>
      <h3 className="text-base font-bold text-[#4A4130]">{title}</h3>
      <p className="text-xs text-[#726B58] mt-1 max-w-sm mx-auto">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
