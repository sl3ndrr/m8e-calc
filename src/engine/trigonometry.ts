import type Decimal from 'decimal.js';
import type { AngleMode } from './types.ts';
import { Guard, PI, requireDomain } from './numeric.ts';

const twoPi = PI.mul(2);
const sqrt2 = new Guard(2).sqrt();
const sqrt3 = new Guard(3).sqrt();
const sqrt6 = new Guard(6).sqrt();
const firstQuadrant = [
  new Guard(0),
  sqrt6.sub(sqrt2).div(4),
  new Guard('0.5'),
  sqrt2.div(2),
  sqrt3.div(2),
  sqrt6.add(sqrt2).div(4),
  new Guard(1),
];

function specialSine(index: number): Decimal {
  const i = ((index % 24) + 24) % 24;
  const offset = i <= 6 ? i : i <= 12 ? 12 - i : i <= 18 ? i - 12 : 24 - i;
  const value = firstQuadrant[offset] ?? new Guard(0);
  return i > 12 ? value.neg() : value;
}

export function sineCosine(
  input: Decimal,
  mode: AngleMode,
): readonly [Decimal, Decimal] {
  const original = new Guard(input);
  requireDomain(original.abs().lte('1e30'));
  const period =
    mode === 'deg' ? new Guard(360) : mode === 'grad' ? new Guard(400) : twoPi;
  // Keep the remainder's sign: period - a tiny negative angle would lose its
  // phase at guard precision and could incorrectly snap to a full turn.
  const magnitude = original.abs().mod(period);
  const reduced = original.isNegative() ? magnitude.neg() : magnitude;
  const step = period.div(24);
  const nearest = reduced.div(step).round();
  const distance = reduced.sub(nearest.mul(step)).abs();
  const tolerance = original.abs().mul('1e-48');
  if (distance.lte(tolerance)) {
    // Conversion to a native integer is safe: the reduced table index is 0…24.
    const index = nearest.toNumber();
    return [specialSine(index), specialSine(index + 6)];
  }
  const halfPeriod = period.div(2);
  const centered = reduced.gt(halfPeriod)
    ? reduced.sub(period)
    : reduced.lt(halfPeriod.neg())
      ? reduced.add(period)
      : reduced;
  const radians = mode === 'rad' ? centered : centered.div(period).mul(twoPi);
  return [radians.sin(), radians.cos()];
}

export function fromRadians(input: Decimal, mode: AngleMode): Decimal {
  const value = new Guard(input);
  return mode === 'rad' ? value : value.mul(mode === 'deg' ? 180 : 200).div(PI);
}
