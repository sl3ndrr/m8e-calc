import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { createHistoryStore } from './historyStore';
import {
  HISTORY_KEY,
  emptyHistory,
  exportHistory,
  groupHistory,
  migrateHistory,
  normalizeHistory,
  trimHistory,
  type HistoryEntry,
} from './history';
import { createHistoryAdapter } from './historyAdapter';
function memory(initial: string | null = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
    removeItem: () => {
      value = null;
    },
  };
}
function entry(id = 'a', ts = 100): HistoryEntry {
  return {
    id,
    ts,
    mode: 'simple',
    input: '2 + 3',
    result: '5',
    pinned: false,
    payload: { expression: '2 + 3' },
  };
}
describe('history persistence and API', () => {
  it('adds immutable snapshots, separates visibility, pins, deletes and rehydrates', () => {
    const storage = memory();
    const store = createHistoryStore(
      storage,
      () => 100,
      () => 'a',
    );
    const payload = { expression: '2 + 3' };
    store.getState().add('simple', { input: '2 + 3', result: '5', payload });
    payload.expression = 'changed';
    store.getState().setVisible('simple', true);
    store.getState().togglePin('a');
    const restored = createHistoryStore(storage).getState();
    expect(restored.entries[0]).toEqual({ ...entry(), pinned: true });
    expect(restored.visibility).toEqual({
      simple: true,
      scientific: false,
      convert: false,
      graph: false,
    });
    const raw = JSON.parse(storage.getItem() ?? '{}');
    expect(raw.version).toBe(1);
    expect(raw.state.add).toBeUndefined();
    store.getState().remove('a');
    expect(store.getState().entries).toEqual([]);
  });
  it('bounds all histories to 500, retains pins and supports scoped clear/Undo with concurrent additions', () => {
    const store = createHistoryStore(memory());
    const entries = Array.from({ length: 510 }, (_, i) => entry(String(i), i));
    entries[0] = { ...entry('0', 0), pinned: true };
    store.getState().restoreEntries(entries);
    expect(store.getState().entries).toHaveLength(500);
    expect(store.getState().entries.some((e) => e.id === '0')).toBe(true);
    store.getState().setLimit(2);
    expect(store.getState().entries).toHaveLength(2);
    store
      .getState()
      .restoreEntries([{ ...entry('graph', 1000), mode: 'graph' }]);
    const removed = store.getState().clear('simple');
    expect(store.getState().entries.every((e) => e.mode === 'graph')).toBe(
      true,
    );
    store.getState().restoreEntries(removed);
    expect(store.getState().entries).toHaveLength(2);
    store.getState().resetHistory();
    expect(store.getState().entries).toEqual([]);
    expect(store.getState().visibility.simple).toBe(false);
  });
  it('migrates v0, validates corrupt values and rejects future schemas', () => {
    const legacy = { ...entry(), timestamp: 100, ts: undefined };
    delete (legacy as Partial<typeof legacy>).ts;
    expect(
      migrateHistory({ entries: [legacy], visibility: { graph: true } }, 0),
    ).toMatchObject({ entries: [entry()], visibility: { graph: true } });
    expect(migrateHistory({ entries: [entry()] }, 99)).toEqual(emptyHistory());
    expect(
      normalizeHistory({
        entries: [
          null,
          { ...entry(), ts: Infinity },
          { ...entry(), payload: undefined },
        ],
        limit: 999,
      }),
    ).toEqual(emptyHistory());
    const persisted = createHistoryStore(
      memory(JSON.stringify({ version: 0, state: { entries: [legacy] } })),
    );
    expect(persisted.getState().entries).toEqual([entry()]);
    expect(createHistoryStore(memory('{broken')).getState().entries).toEqual(
      [],
    );
    expect(
      createHistoryStore(
        memory(JSON.stringify({ version: 999, state: { entries: [entry()] } })),
      ).getState().entries,
    ).toEqual([]);
  });
  it('keeps working with denied/quota storage and rejects invalid additions', () => {
    const store = createHistoryStore(
      {
        getItem() {
          throw Error('denied');
        },
        setItem() {
          throw Error('quota');
        },
        removeItem() {},
      },
      () => 100,
      () => 'a',
    );
    expect(() =>
      store
        .getState()
        .add('simple', { input: 'x', result: '1', payload: null }),
    ).not.toThrow();
    expect(store.getState().entries).toHaveLength(1);
    expect(() =>
      store.getState().add('simple', { input: 'x', result: '1', payload: NaN }),
    ).toThrow();
    expect(HISTORY_KEY).toBe('m8e-calc.history');
  });
  it('caps and deduplicates arbitrary histories', () => {
    fc.assert(
      fc.property(
        fc.array(fc.nat({ max: 1000 }), { maxLength: 700 }),
        fc.integer({ min: 1, max: 500 }),
        (ids, limit) => {
          const result = trimHistory(
            ids.map((id) => entry(String(id), id)),
            limit,
          );
          expect(result.length).toBeLessThanOrEqual(limit);
          expect(new Set(result.map((e) => e.id)).size).toBe(result.length);
        },
      ),
    );
  });
});
it('restores through registered adapters and does not remove newer registrations', () => {
  const adapter = createHistoryAdapter();
  const calls: string[] = [];
  const cleanup = adapter.register(() => calls.push('old'));
  adapter.register((e) => calls.push(e.id));
  cleanup();
  expect(adapter.restore(entry())).toBe(true);
  expect(calls).toEqual(['a']);
  const unregister = adapter.register(() => {});
  unregister();
  expect(adapter.restore(entry())).toBe(false);
});
it('searches and groups in local days, including yesterday across calendar boundaries', () => {
  const today = new Date(2026, 0, 1, 12).getTime();
  const yesterday = new Date(2025, 11, 31, 23).getTime();
  const groups = groupHistory(
    [entry('y', yesterday), entry('t', today)],
    '2 +',
    'de',
    today,
  );
  expect(groups.map((g) => g.label)).toEqual(['Heute', 'Gestern']);
  expect(groupHistory([entry()], 'missing', 'en')).toEqual([]);
});
it('exports complete JSON and escaped CSV/Markdown', () => {
  const sample = { ...entry(), input: '=SUM(1,2)', result: 'a"b|c\n<test>' };
  expect(JSON.parse(exportHistory([sample], 'json')).entries).toEqual([sample]);
  expect(exportHistory([sample], 'csv')).toContain(`"'=SUM(1,2)"`);
  expect(exportHistory([sample], 'csv')).toContain('a""b');
  expect(exportHistory([sample], 'markdown')).toContain('b\\|c &lt;test&gt;');
});
