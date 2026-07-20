'use client';

import { readStore, writeStore, genId } from './store-utils';
import { recordAuditEvent } from './audit-log';

export interface Promotion {
  id: string;
  name: string;
  code: string;
  creditAllocation: number;
  eligiblePlanCodes: string[];
  eligibleAccountIds: string[];
  startDate: string;
  endDate: string | null;
  maxRedemptions: number | null;
  perAccountRedemptionLimit: number;
  active: boolean;
  internalNote: string;
}

const PROMOTIONS_KEY = 'nchq-admin-promotions-v1';

const SEED_PROMOTIONS: Promotion[] = [
  { id: 'promo-001', name: 'Welcome Bonus', code: 'WELCOME50', creditAllocation: 50, eligiblePlanCodes: [], eligibleAccountIds: [], startDate: '2026-01-01T00:00:00+05:30', endDate: null, maxRedemptions: null, perAccountRedemptionLimit: 1, active: true, internalNote: 'Standard onboarding promotion — demonstration only, no real financial obligation.' },
  { id: 'promo-002', name: 'Firm Plan Launch Offer', code: 'FIRMLAUNCH', creditAllocation: 500, eligiblePlanCodes: ['FIRM'], eligibleAccountIds: [], startDate: '2026-06-01T00:00:00+05:30', endDate: '2026-08-31T23:59:59+05:30', maxRedemptions: 100, perAccountRedemptionLimit: 1, active: true, internalNote: 'Time-limited, plan-restricted demonstration promotion.' },
];

export function getPromotions(): Promotion[] {
  return readStore(PROMOTIONS_KEY, SEED_PROMOTIONS);
}

export function savePromotion(promo: Omit<Promotion, 'id'> & { id?: string }, adminActor: string): Promotion {
  const promotions = getPromotions();
  const id = promo.id || genId('promo');
  const full: Promotion = { ...promo, id };
  const idx = promotions.findIndex((p) => p.id === id);
  const updated = idx >= 0 ? [...promotions.slice(0, idx), full, ...promotions.slice(idx + 1)] : [full, ...promotions];
  writeStore(PROMOTIONS_KEY, updated);
  recordAuditEvent({
    actor: adminActor, actorRole: 'PLATFORM_ADMIN', tenantId: null,
    target: `Promotion ${full.name}`, action: idx >= 0 ? 'Promotion updated' : 'Promotion created',
    previousValue: null, newValue: `${full.code} — ${full.creditAllocation} credits`, reason: 'Admin update', sessionRef: null, result: 'SUCCESS',
  });
  return full;
}

export function setPromotionActive(id: string, active: boolean, adminActor: string): void {
  const promotions = getPromotions();
  const idx = promotions.findIndex((p) => p.id === id);
  if (idx === -1) return;
  const previous = promotions[idx];
  const updated = { ...previous, active };
  writeStore(PROMOTIONS_KEY, [...promotions.slice(0, idx), updated, ...promotions.slice(idx + 1)]);
  recordAuditEvent({
    actor: adminActor, actorRole: 'PLATFORM_ADMIN', tenantId: null,
    target: `Promotion ${previous.name}`, action: active ? 'Promotion activated' : 'Promotion deactivated',
    previousValue: String(previous.active), newValue: String(active), reason: 'Admin toggle', sessionRef: null, result: 'SUCCESS',
  });
}
