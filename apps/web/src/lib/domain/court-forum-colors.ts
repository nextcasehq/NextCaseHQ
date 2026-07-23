import type { CourtForumType } from './court-note';

/**
 * One consistent colour/icon per court category, reused everywhere a court
 * is shown — Matter Register, Matter Workspace, Case Diary, Court Notes —
 * so an advocate recognises the forum at a glance without reading text.
 * Keyed by the same CourtForumType enum Court Notes already record for
 * real, so there is exactly one vocabulary, not a second parallel one.
 */
export interface CourtForumColorScheme {
  bg: string;
  border: string;
  text: string;
  icon: string;
}

export const COURT_FORUM_COLORS: Record<CourtForumType, CourtForumColorScheme> = {
  SUPREME_COURT: { bg: '#FBF6EA', border: '#C6A253', text: '#8A6D2F', icon: '🏛️' },
  HIGH_COURT: { bg: '#EAF2FB', border: '#8FB4DE', text: '#2C5D8F', icon: '⚖️' },
  CIVIL_COURT: { bg: '#EAF7EF', border: '#8FCBA3', text: '#2E7D4F', icon: '📘' },
  CRIMINAL_COURT: { bg: '#FBEAEA', border: '#D98F8F', text: '#9A3B3B', icon: '🛡️' },
  FAMILY_COURT: { bg: '#F7EAFB', border: '#C58FD9', text: '#6B3A8F', icon: '👪' },
  COMMERCIAL_COURT: { bg: '#EAF0FB', border: '#8FA6D9', text: '#33468F', icon: '💼' },
  CONSUMER_COMMISSION: { bg: '#FBF3EA', border: '#D9B48F', text: '#8F5A2C', icon: '🧾' },
  LABOUR_COURT: { bg: '#F5FBEA', border: '#B4D98F', text: '#5A8F2C', icon: '🛠️' },
  MACT: { bg: '#EAFBF7', border: '#8FD9C8', text: '#2C8F73', icon: '🚗' },
  ARBITRATION: { bg: '#FBEAF6', border: '#D98FC0', text: '#8F2C6B', icon: '🤝' },
  REVENUE_COURT: { bg: '#FBF9EA', border: '#D9D08F', text: '#8F832C', icon: '📜' },
  OTHER: { bg: '#F4F1EA', border: '#B0A588', text: '#5C5340', icon: '🏢' },
};

/**
 * Best-effort classification of a free-text court/forum name (Matter.court,
 * LegalCase.court — both plain strings an advocate typed or a court-picker
 * filled in, not a constrained enum) into the canonical CourtForumType
 * vocabulary. Used only where no real CourtNote.court_forum_type exists to
 * read directly. Order matters: more specific terms are checked before
 * generic ones (e.g. "Family Court" before a bare "Court"), and an
 * unrecognised string honestly falls back to OTHER rather than guessing —
 * consistent with this codebase's standing rule to never assert a
 * classification it can't support.
 */
export function classifyCourtForumType(courtText: string | null | undefined): CourtForumType {
  const text = (courtText ?? '').toLowerCase();
  if (!text.trim()) return 'OTHER';

  if (text.includes('supreme court')) return 'SUPREME_COURT';
  if (text.includes('high court')) return 'HIGH_COURT';
  if (text.includes('consumer')) return 'CONSUMER_COMMISSION';
  if (text.includes('labour') || text.includes('labor')) return 'LABOUR_COURT';
  if (text.includes('family court')) return 'FAMILY_COURT';
  if (text.includes('commercial court')) return 'COMMERCIAL_COURT';
  if (text.includes('motor accident') || text.includes('mact')) return 'MACT';
  if (text.includes('arbitra')) return 'ARBITRATION';
  if (text.includes('revenue') || text.includes('sub-divisional') || text.includes('subdivisional') || text.includes('tahsildar') || text.includes('mutation'))
    return 'REVENUE_COURT';
  if (text.includes('sessions') || text.includes('magistrate') || text.includes('criminal')) return 'CRIMINAL_COURT';
  if (text.includes('civil court') || text.includes('civil judge') || text.includes('district court')) return 'CIVIL_COURT';
  return 'OTHER';
}

export function courtForumColorFor(courtText: string | null | undefined): CourtForumColorScheme {
  return COURT_FORUM_COLORS[classifyCourtForumType(courtText)];
}
