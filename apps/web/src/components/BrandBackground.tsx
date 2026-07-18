import React from 'react';

/**
 * Shared, subtle decorative background for otherwise-flat cream/white
 * pages (login, dashboard shell, cases/matters lists) — a soft gold wash
 * plus a faint scales-of-justice watermark, so the platform reads as one
 * consistent premium legal product rather than a mix of styled and
 * unstyled screens. Deliberately restrained: very low opacity, no
 * animation, no gradients loud enough to compete with content.
 *
 * Purely decorative — absolutely positioned, non-interactive, and behind
 * the page's own content (render it as the first child of a `relative`
 * container). Never affects layout or interaction.
 */
export default function BrandBackground({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      // No explicit z-index: relies on plain DOM order (rendered first)
      // plus the host page giving its real content `relative` and an
      // `isolate` stacking context, the same proven pattern already used
      // by the landing hero. A negative z-index here would be simpler in
      // theory, but escapes past any ancestor that doesn't itself
      // establish a stacking context — it ends up compositing behind the
      // document root's own background instead of just this page's.
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* Soft gold wash, top-left */}
      <div
        className="absolute -left-32 -top-32 h-[36rem] w-[36rem] rounded-full opacity-[0.28] blur-2xl"
        style={{ background: 'radial-gradient(circle, #C6A253 0%, transparent 70%)' }}
      />
      {/* Faint scales-of-justice watermark, bottom-right */}
      <svg
        viewBox="0 0 40 40"
        className="absolute -bottom-16 -right-16 h-96 w-96 opacity-[0.18] md:h-[28rem] md:w-[28rem]"
        fill="none"
      >
        <g stroke="#8A6D2F" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 9v22" />
          <path d="M14.5 31h11" />
          <path d="M11 13h18" />
          <path d="M13 13l-2.5 6h5L13 13z" />
          <path d="M9.5 19a3.5 3.5 0 0 0 7 0" />
          <path d="M27 13l-2.5 6h5L27 13z" />
          <path d="M23.5 19a3.5 3.5 0 0 0 7 0" />
        </g>
        <circle cx="20" cy="9" r="1.8" fill="#8A6D2F" />
      </svg>
    </div>
  );
}
