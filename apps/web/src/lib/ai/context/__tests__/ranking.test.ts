import { rankContextItems } from '../ranking';
import type { ContextItem } from '../types';

function item(sourceType: ContextItem['sourceType'], weight: number, recency: string | undefined, text: string): ContextItem {
  return { sourceType, weight, recency, render: () => text };
}

describe('rankContextItems', () => {
  test('sorts strictly by weight, highest first', () => {
    const items = [
      item('PARTICIPANT', 40, undefined, 'low'),
      item('MATTER_SUMMARY', 100, undefined, 'high'),
      item('PROCEEDING', 60, undefined, 'mid'),
    ];
    const { items: ranked } = rankContextItems(items);
    expect(ranked.map((i) => i.render())).toEqual(['high', 'mid', 'low']);
  });

  test('breaks weight ties by recency, newest first', () => {
    const items = [
      item('PROCEEDING', 60, '2026-01-01', 'older'),
      item('PROCEEDING', 60, '2026-06-01', 'newer'),
    ];
    const { items: ranked } = rankContextItems(items);
    expect(ranked.map((i) => i.render())).toEqual(['newer', 'older']);
  });

  test('items with no recency sort after items with recency at the same weight', () => {
    const items = [
      item('PROCEEDING', 60, undefined, 'no-recency'),
      item('PROCEEDING', 60, '2026-01-01', 'has-recency'),
    ];
    const { items: ranked } = rankContextItems(items);
    expect(ranked.map((i) => i.render())).toEqual(['has-recency', 'no-recency']);
  });

  test('with no budget, returns every item unranked-but-complete and truncated is false', () => {
    const items = [item('MATTER_SUMMARY', 100, undefined, 'a'), item('PROCEEDING', 60, undefined, 'b')];
    const { items: ranked, truncated } = rankContextItems(items);
    expect(ranked).toHaveLength(2);
    expect(truncated).toBe(false);
  });

  test('maxItems truncates to the highest-weighted N and reports truncated', () => {
    const items = [
      item('MATTER_SUMMARY', 100, undefined, 'a'),
      item('PROCEEDING', 60, undefined, 'b'),
      item('PARTICIPANT', 40, undefined, 'c'),
    ];
    const { items: ranked, truncated } = rankContextItems(items, { maxItems: 2 });
    expect(ranked.map((i) => i.render())).toEqual(['a', 'b']);
    expect(truncated).toBe(true);
  });

  test('maxChars stops before an item that would overflow the budget, never splitting one', () => {
    const items = [
      item('MATTER_SUMMARY', 100, undefined, '1234567890'), // 10 chars
      item('PROCEEDING', 60, undefined, '12345'), // 5 chars — would push total to 15
      item('PARTICIPANT', 40, undefined, '1'), // never reached
    ];
    const { items: ranked, truncated } = rankContextItems(items, { maxChars: 12 });
    expect(ranked).toHaveLength(1);
    expect(ranked[0].render()).toBe('1234567890');
    expect(truncated).toBe(true);
  });

  test('an empty item list returns an empty, non-truncated result', () => {
    const { items: ranked, truncated } = rankContextItems([]);
    expect(ranked).toHaveLength(0);
    expect(truncated).toBe(false);
  });

  test('does not mutate the input array', () => {
    const items = [item('PARTICIPANT', 40, undefined, 'low'), item('MATTER_SUMMARY', 100, undefined, 'high')];
    const original = [...items];
    rankContextItems(items);
    expect(items).toEqual(original);
  });
});
