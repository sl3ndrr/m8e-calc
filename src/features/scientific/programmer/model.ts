import type { Value } from '../../../engine';
import {
  fromBits,
  mask,
  word,
  type WordOptions,
} from '../../../engine/programmer';
export function setBit(
  value: bigint,
  index: number,
  enabled: boolean,
  options: WordOptions,
): bigint {
  if (!Number.isInteger(index) || index < 0 || index >= options.width)
    throw new RangeError('bit index');
  const bit = 1n << BigInt(index);
  return fromBits(enabled ? value | bit : value & ~bit, options);
}
export function reconfigure(
  value: bigint,
  previous: WordOptions,
  next: WordOptions,
): bigint {
  return previous.width === next.width && previous.signed !== next.signed
    ? fromBits(value & mask(previous), next)
    : word(value, next);
}
export function integerResult(value: Value | null): bigint | null {
  return value?.kind === 'number' &&
    value.value.isInteger() &&
    value.value.e <= 20
    ? BigInt(value.value.toFixed())
    : null;
}
