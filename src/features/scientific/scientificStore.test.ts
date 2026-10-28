import { expect, it, vi } from 'vitest';
import {
  createEnvironment,
  execute,
  parse,
  type Environment,
  type EvaluationContext,
} from '../../engine';
import {
  createScientificStore,
  MAX_SCIENTIFIC_STORAGE_LENGTH,
  SCIENTIFIC_STORAGE_KEY,
} from './scientificStore';
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

function memoryStorage(initial?: string) {
  const data = new Map(
    initial === undefined ? [] : [[SCIENTIFIC_STORAGE_KEY, initial]],
  );
  const storage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key);
    }),
  };
  return { data, storage };
}
function step(
  source: string,
  env: Environment = createEnvironment(),
  ctx: EvaluationContext = {},
) {
  const result = execute(source, env, ctx);
  if (!result.ok) throw new Error(`${source}: ${result.error.code}`);
  return result.value.environment;
}
function envelope(environment: unknown, version: number | undefined = 1) {
  return JSON.stringify({ state: { environment }, version });
}

it('hydrates shl/xor, functions, complex values, lists and ans through two actual store recreations', () => {
  const { storage } = memoryStorage();
  let original = createEnvironment();
  for (const source of [
    'v=123',
    'shl=2',
    'xor=3',
    'z=2+3i',
    'xs=factor(360)',
    'f(x)=x+v',
  ])
    original = step(source, original, { complex: 'on' });
  createScientificStore(storage).getState().commit(original);
  const second = createScientificStore(storage);
  expect(second.getState().environment).toEqual(original);
  expect(second.getState().recovery).toBeNull();
  const next = step('f(shl)+xor', second.getState().environment);
  second.getState().commit(next);
  const third = createScientificStore(storage);
  expect(third.getState().environment).toEqual(next);
  expect(next.variables).toEqual(original.variables);
  expect(next.functions).toEqual(original.functions);
  expect(next.history.slice(1)).toEqual(original.history);
  expect(storage.removeItem).not.toHaveBeenCalled();
});

it.each([1, undefined])(
  'retains supported legacy envelopes (version %s) and programmer function bodies',
  (version) => {
    const env = step('bits(x)=x<<1', step('v=18446744073709551615'), {
      bitwise: true,
    });
    const { storage } = memoryStorage(
      JSON.stringify({ state: { environment: env }, version }),
    );
    const store = createScientificStore(storage);
    expect(store.getState().environment).toEqual(env);
    expect(store.getState().recovery).toBeNull();
  },
);

it.each(['xor(x)=x+1', 'f(shl)=shl+1'])(
  'preserves %s across hydration, a programmer conflict and a later scientific commit',
  (definition) => {
    const saved = step(definition, step('v=123'));
    const raw = envelope(saved);
    const { data, storage } = memoryStorage(raw);
    const store = createScientificStore(storage);
    expect(store.getState().environment).toEqual(saved);
    expect(store.getState().recovery).toBeNull();
    const conflict = execute('1+1', store.getState().environment, {
      bitwise: true,
    });
    expect(conflict).toMatchObject({
      ok: false,
      error: { code: 'E_RESERVED_NAME' },
    });
    expect(store.getState().environment).toEqual(saved);
    expect(data.get(SCIENTIFIC_STORAGE_KEY)).toBe(raw);
    expect(storage.setItem).not.toHaveBeenCalled();
    const source = definition.startsWith('xor') ? 'xor(v)' : 'f(v)';
    const next = step(source, store.getState().environment);
    expect(next.history[0]).toEqual({ kind: 'number', value: '124' });
    store.getState().commit(next);
    const recreated = createScientificStore(storage);
    expect(recreated.getState().environment).toEqual(next);
    expect(next.functions).toEqual(saved.functions);
    expect(next.history.slice(1)).toEqual(saved.history);
    expect(storage.removeItem).not.toHaveBeenCalled();
  },
);

it.each([
  '{broken json',
  envelope({ version: 99 }),
  envelope(createEnvironment(), 2),
  envelope({
    ...createEnvironment(),
    variables: { v: { kind: 'number', value: '1'.repeat(20000) } },
  }),
  ' '.repeat(MAX_SCIENTIFIC_STORAGE_LENGTH + 1),
])(
  'locks automatic writes after an unrestorable snapshot (case %#)',
  (original) => {
    const { data, storage } = memoryStorage(original);
    const store = createScientificStore(storage);
    expect(store.getState().recovery).toBe('invalid');
    const session = step('session=7');
    store.getState().commit(session);
    store.getState().remove('session');
    expect(data.get(SCIENTIFIC_STORAGE_KEY)).toBe(original);
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(createScientificStore(storage).getState().recovery).toBe('invalid');
  },
);

it('can explicitly retry after the original is repaired, preserving the session on a failed retry', async () => {
  const { data, storage } = memoryStorage(envelope({ version: 99 }));
  const store = createScientificStore(storage);
  const session = step('session=7');
  store.getState().commit(session);
  await store.persist.rehydrate();
  expect(store.getState().environment).toEqual(session);
  const repaired = step('v=123');
  data.set(SCIENTIFIC_STORAGE_KEY, envelope(repaired));
  await store.persist.rehydrate();
  expect(store.getState().environment).toEqual(repaired);
  expect(store.getState().recovery).toBeNull();
  store.getState().commit(step('v+1', repaired));
  expect(
    createScientificStore(storage).getState().environment.history[0],
  ).toEqual({ kind: 'number', value: '124' });
});

it('does not overwrite an unreadable original when writes would be allowed', () => {
  const { data, storage } = memoryStorage(envelope(step('v=123')));
  const original = data.get(SCIENTIFIC_STORAGE_KEY);
  const store = createScientificStore({
    ...storage,
    getItem: () => {
      throw new Error('denied');
    },
  });
  store.getState().commit(step('session=7'));
  expect(store.getState().recovery).toBe('unavailable');
  expect(data.get(SCIENTIFIC_STORAGE_KEY)).toBe(original);
  expect(storage.setItem).not.toHaveBeenCalled();
});

it('keeps the last saved snapshot and an unsaved session when storage is full', () => {
  const { data, storage } = memoryStorage(envelope(step('v=123')));
  const original = data.get(SCIENTIFIC_STORAGE_KEY);
  const setItem = vi.fn(() => {
    throw new Error('quota');
  });
  const store = createScientificStore({ ...storage, setItem });
  const session = step('session=7', store.getState().environment);
  store.getState().commit(session);
  store.getState().remove('session');
  expect(store.getState().recovery).toBe('saveFailed');
  expect(store.getState().environment.variables.v).toBeDefined();
  expect(setItem).toHaveBeenCalledTimes(1);
  expect(data.get(SCIENTIFIC_STORAGE_KEY)).toBe(original);
});

it('does not write before asynchronous hydration or after a rejected asynchronous read/save', async () => {
  const { storage } = memoryStorage();
  let complete: (value: string | null) => void = () => {
    throw new Error('pending storage not initialized');
  };
  const pending = new Promise<string | null>((resolve) => {
    complete = resolve;
  });
  const store = createScientificStore({ ...storage, getItem: () => pending });
  store.getState().commit(step('session=7'));
  expect(store.getState().recovery).toBe('loading');
  expect(storage.setItem).not.toHaveBeenCalled();
  complete(envelope(step('v=123')));
  await store.persist.rehydrate();
  expect(store.getState().environment.variables.v).toBeDefined();
  const rejected = createScientificStore({
    ...storage,
    getItem: () => Promise.reject(new Error('denied')),
  });
  await rejected.persist.rehydrate();
  rejected.getState().commit(step('session=7'));
  expect(rejected.getState().recovery).toBe('unavailable');
  expect(storage.setItem).not.toHaveBeenCalled();
  const failed = createScientificStore({
    ...storage,
    setItem: () => Promise.reject(new Error('quota')),
  });
  failed.getState().commit(step('session=7'));
  await Promise.resolve();
  expect(failed.getState().recovery).toBe('saveFailed');
});

it('preserves persisted function cycles without running them or saving a fallback', () => {
  const parsed = parse('f(x)');
  if (!parsed.ok) throw new Error('setup');
  const raw = envelope({
    ...createEnvironment(),
    functions: { f: { parameters: ['x'], expression: parsed.value } },
  });
  const { data, storage } = memoryStorage(raw);
  const store = createScientificStore(storage);
  expect(store.getState().recovery).toBe('invalid');
  store.getState().commit(step('v=123'));
  expect(data.get(SCIENTIFIC_STORAGE_KEY)).toBe(raw);
  expect(storage.setItem).not.toHaveBeenCalled();
});

it('ignores a stale failed asynchronous read after a successful explicit retry', async () => {
  const { storage } = memoryStorage();
  let complete: (value: string | null) => void = () => {
    throw new Error('setup');
  };
  const old = new Promise<string | null>((resolve) => {
    complete = resolve;
  });
  const saved = step('v=123');
  let reads = 0;
  const store = createScientificStore({
    ...storage,
    getItem: () => (reads++ === 0 ? old : envelope(saved)),
  });
  await store.persist.rehydrate();
  complete('{broken');
  await old;
  const next = step('v+1', saved);
  store.getState().commit(next);
  expect(store.getState().recovery).toBeNull();
  expect(storage.setItem).toHaveBeenCalledTimes(1);
  expect(createScientificStore(storage).getState().environment).toEqual(next);
});
