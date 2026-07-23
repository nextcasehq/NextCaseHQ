/**
 * Turns a completed CourtPicker selection into the single court/forum
 * name string that Matter/Proceeding forms actually store (their `court`
 * field is free text — the registry's step-by-step selections are a
 * discovery aid, not a new structured column). One function per
 * court-system id, kept here rather than inside each config file since
 * this is a UI-layer concern (how to *display* a completed selection),
 * not part of the registry's own data.
 */
export function composeCourtName(courtSystemId: string, selections: Record<string, string>): string {
  switch (courtSystemId) {
    case 'district-courts':
      if (selections.courtEstablishment) return selections.courtEstablishment;
      if (selections.district) return `District Court, ${selections.district}`;
      return selections.state ?? '';
    case 'high-courts':
      if (!selections.highCourt) return selections.state ?? '';
      return selections.bench ? `${selections.highCourt} (${selections.bench})` : selections.highCourt;
    case 'supreme-court':
      return 'Supreme Court of India';
    case 'consumer-commissions':
      return selections.commission ?? '';
    default:
      return Object.values(selections).filter(Boolean).join(', ');
  }
}
