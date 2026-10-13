import { expect, it } from 'vitest';
import { execute } from '../../engine';
import { createScientificStore } from './scientificStore';
it('persists definitions and survives damaged or denied browser storage', () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
  const store = createScientificStore(storage),
    r = execute('a=5');
  if (!r.ok) throw Error('setup');
  store.getState().commit(r.value.environment);
  expect(
    createScientificStore(storage).getState().environment.variables.a,
  ).toEqual({ kind: 'number', value: '5' });
  store.getState().remove('a');
  expect(
    createScientificStore(storage).getState().environment.variables,
  ).toEqual({});
  data.set(
    'm8e-calc.scientific',
    '{"state":{"environment":{"version":99}},"version":1}',
  );
  expect(
    createScientificStore(storage).getState().environment.variables,
  ).toEqual({});
  const denied = createScientificStore({
    getItem: () => {
      throw Error('denied');
    },
    setItem: () => {
      throw Error('denied');
    },
    removeItem: () => {
      throw Error('denied');
    },
  });
  denied.getState().commit(r.value.environment);
  expect(denied.getState().environment.variables.a).toBeDefined();
});
