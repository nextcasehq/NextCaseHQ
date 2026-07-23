'use client';

import React from 'react';

/** Fires once on mount, one animation frame later — the same mount-fade
 *  pattern used since Checkpoint 6's field-reveal transition, now shared
 *  rather than duplicated. Never used for content that's simply always
 *  there; only for a moment that represents a real, named state change
 *  (a field being revealed, a mode changing, a completeness state
 *  flipping) — motion here always answers "what changed," never applied
 *  for its own sake. */
function useMountedIn(): boolean {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return visible;
}

/** A plain cross-fade — used when the change itself has no natural
 *  direction (a mode switching from filling to review, a completeness
 *  banner flipping states). */
export function FadeTransition({ children }: { children: React.ReactNode }) {
  const visible = useMountedIn();
  return <div className={`transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}>{children}</div>;
}

/** A directional slide-plus-fade — used when the change has a spatial
 *  meaning worth preserving (moving forward vs. backward through a
 *  sequence of pages), so the motion itself communicates which way the
 *  lawyer just moved, not just that something changed. */
export function SlideTransition({ children, direction }: { children: React.ReactNode; direction: 'forward' | 'backward' }) {
  const visible = useMountedIn();
  const offset = direction === 'forward' ? '12px' : '-12px';
  return (
    <div
      className="transition-all duration-200 ease-out"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateX(0)' : `translateX(${offset})` }}
    >
      {children}
    </div>
  );
}
