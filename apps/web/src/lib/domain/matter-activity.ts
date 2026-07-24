import type { CertifiedCopyStatus } from '@/lib/domain/court-order';

/**
 * Extracted from the Matter Workspace (apps/web/src/app/matters/[id]/page.tsx)
 * so the exact Matter Activity merge/sort and Court Orders aggregation the
 * page renders can also be called from server code (the /system/runtime
 * diagnostics page) without duplicating the logic. No behavior change —
 * same functions, new home. Interfaces here list only the fields each
 * function actually reads; the page's own fuller interfaces satisfy these
 * structurally.
 */

export type ActivityType = 'HEARING' | 'ORDER' | 'ACTION' | 'MILESTONE';

export interface ActivityCourtNote {
  id: string;
  hearing_date: string;
}

export interface ActivityOrder {
  id: string;
  order_date: string;
}

export interface ActivityTask {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'DISMISSED';
  hearing_date: string;
}

export interface ActivityEvent {
  id: string;
  event_date: string;
  source_type: string;
}

export interface ActivityItem<
  CourtNote extends ActivityCourtNote = ActivityCourtNote,
  Order extends ActivityOrder = ActivityOrder,
  Task extends ActivityTask = ActivityTask,
  Event extends ActivityEvent = ActivityEvent,
> {
  type: ActivityType;
  date: string;
  key: string;
  courtNote?: CourtNote;
  order?: Order;
  task?: Task;
  event?: Event;
}

/** The single merged, chronological feed Matter Activity renders — a
 * presentation-layer merge of four lists into one, newest first.
 * HEARING-sourced MatterEvents are deliberately excluded by the caller
 * (filter to source_type === 'MANUAL' before/inside events) since Court
 * Notes already cover the same hearings with richer detail. */
export function buildActivityItems<
  CourtNote extends ActivityCourtNote,
  Order extends ActivityOrder,
  Task extends ActivityTask,
  Event extends ActivityEvent,
>(
  courtNotes: CourtNote[],
  orders: Order[],
  tasks: Task[],
  events: Event[]
): ActivityItem<CourtNote, Order, Task, Event>[] {
  const items: ActivityItem<CourtNote, Order, Task, Event>[] = [
    ...courtNotes.map((cn) => ({ type: 'HEARING' as const, date: cn.hearing_date, key: `note-${cn.id}`, courtNote: cn })),
    ...orders.map((o) => ({ type: 'ORDER' as const, date: o.order_date, key: `order-${o.id}`, order: o })),
    ...tasks
      .filter((t) => t.status === 'PENDING')
      .map((t) => ({ type: 'ACTION' as const, date: t.hearing_date, key: `task-${t.id}`, task: t })),
    ...events
      .filter((e) => e.source_type === 'MANUAL')
      .map((e) => ({ type: 'MILESTONE' as const, date: e.event_date, key: `event-${e.id}`, event: e })),
  ];
  return items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** One Court Order, tagged with which Proceeding it came from. */
export interface MatterOrder {
  id: string;
  case_id: string;
  proceeding_title: string;
  order_date: string;
  summary: string;
  document_id: string | null;
  certified_copy_required: boolean;
  certified_copy_status: CertifiedCopyStatus;
}

/** Tags each Proceeding's orders with that Proceeding's title, flattens
 * across every linked Proceeding, and sorts newest first — exactly what
 * the Matter Workspace's fetchMatterOrders does after fetching each
 * Proceeding's GET /api/cases/[id]/orders. */
export function mergeMatterOrders(
  perProceeding: Array<{ proceedingTitle: string; orders: Array<Omit<MatterOrder, 'proceeding_title'>> }>
): MatterOrder[] {
  const merged = perProceeding.flatMap(({ proceedingTitle, orders }) =>
    orders.map((o) => ({ ...o, proceeding_title: proceedingTitle }))
  );
  return merged.sort((a, b) => (a.order_date < b.order_date ? 1 : -1));
}
