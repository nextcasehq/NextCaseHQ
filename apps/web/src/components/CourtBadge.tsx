import React from 'react';
import { COURT_FORUM_LABELS, type CourtForumType } from '@/lib/domain/court-note';
import { COURT_FORUM_COLORS, classifyCourtForumType } from '@/lib/domain/court-forum-colors';

interface CourtBadgeProps {
  /** Real, recorded forum type (e.g. from a CourtNote) — used as-is, no classification. */
  forumType?: CourtForumType;
  /** Free-text court name (Matter.court, LegalCase.court) — classified via keyword match when forumType isn't given. */
  court?: string | null;
  /** Text shown in the badge; defaults to the free-text court name, or the category label when only forumType is given. */
  label?: string;
  className?: string;
}

/**
 * One consistent colour + icon per court category, reused across the
 * Matter Register, Matter Workspace, and Case Diary so an advocate
 * recognises the forum at a glance (Product Vision: court-category colour
 * coding). Renders nothing for an empty/unset court rather than a
 * misleading "Other Court" badge on a matter that simply has no court yet
 * (e.g. an advisory engagement or a pre-filing matter).
 */
export default function CourtBadge({ forumType, court, label, className }: CourtBadgeProps) {
  if (!forumType && !court) return null;
  const type = forumType ?? classifyCourtForumType(court);
  const colors = COURT_FORUM_COLORS[type];
  const text = label ?? court ?? COURT_FORUM_LABELS[type];

  return (
    <span
      className={
        className ??
        'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border max-w-full truncate'
      }
      style={{ backgroundColor: colors.bg, borderColor: colors.border, color: colors.text }}
      title={COURT_FORUM_LABELS[type]}
    >
      <span aria-hidden="true">{colors.icon}</span>
      <span className="truncate">{text}</span>
    </span>
  );
}
