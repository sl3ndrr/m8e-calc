import { expect, it } from 'vitest';
import {
  deserializeValue,
  execute,
  restoreEnvironment,
  valueSource,
} from './index.ts';

const scalars = [
  '-1',
  '5000000000',
  '4294967295',
  '4294967296',
  '4294967297',
  '-4294967297',
  '18446744073709551615',
  '18446744073709551616',
  '18446744073709551617',
  '-18446744073709551617',
  '1e50',
  '-1e50',
  '1e-50',
  '-1e-50',
  '1e10000',
  '1e-10000',
  '0.125',
  '-123.456',
  '1/7',
  '1.234567890123456789012345678901234567890123456789',
  '2+3i',
  '-2-3i',
  '0+0i',
  '1e50+1e-50i',
  '-1e-50-1e50i',
  '1e10000+1e-10000i',
];

it.each(scalars)(
  'roundtrips %s at full stored scalar precision',
  (expression) => {
    const first = execute(`v=${expression}`, undefined, { complex: 'on' });
    if (!first.ok) throw new Error(first.error.code);
    const restored = restoreEnvironment(
      JSON.parse(JSON.stringify(first.value.environment)),
    );
    if (!restored.ok) throw new Error(restored.error.code);
    const saved = restored.value.variables.v;
    if (!saved) throw new Error('missing variable');
    const value = deserializeValue(saved, { start: 0, end: 0 });
    if (!value.ok) throw new Error(value.error.code);
    const before = JSON.stringify(restored.value);
    const source = valueSource(value.value);
    expect(source).not.toBeNull();
    const next = execute(`v=${source}`, restored.value, { complex: 'on' });
    expect(next.ok).toBe(true);
    if (!next.ok) throw new Error(next.error.code);
    expect(next.value.environment.variables.v).toEqual(saved);
    expect(JSON.stringify(restored.value)).toBe(before);
  },
);

it.each(['factor(12)', 'factor(1)'])(
  'does not invent list syntax for %s',
  (source) => {
    const result = execute(source);
    if (!result.ok || !result.value.value) throw new Error('setup');
    expect(valueSource(result.value.value)).toBeNull();
  },
);
